import { NextResponse } from "next/server";
import { getServiceRoleClient } from "@/lib/supabase";
import { scrapeYellowPages } from "@/lib/scrapers/yellow-pages";
import { hasPhone } from "@/lib/lead-utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIN_LEADS = 1000;
const LIMIT = 1200;
const MAX_CYCLES = 15;

type PendingTask = {
  id: string;
  keyword: string;
  location: string;
  sources: string[] | null;
};

async function processTask(task: PendingTask) {
  const supabase = getServiceRoleClient();
  const uniqueLeads = new Set<string>();
  let cycles = 0;

  await supabase
    .from("scrape_tasks")
    .update({ status: "running", leads_count: 0, review_reason: null })
    .eq("id", task.id);

  while (uniqueLeads.size < MIN_LEADS && cycles < MAX_CYCLES) {
    cycles += 1;
    const result = await scrapeYellowPages({
      keyword: task.keyword,
      location: task.location,
      limit: LIMIT,
    });

    const leads = (result.leads || [])
      .filter((lead) => hasPhone(lead.phone))
      .map((lead) => ({
        task_id: task.id,
        source: "yellow_pages",
        keyword: task.keyword,
        location: task.location,
        name: lead.name,
        phone: lead.phone || null,
        website: lead.website || null,
        business_profile: lead.sourceUrl || null,
        street: lead.street || null,
        city: lead.city || null,
        region: lead.region || null,
        postal_code: lead.postalCode || null,
        address: lead.address || null,
        category: lead.category || null,
        source_url: lead.sourceUrl || null,
        country: "US",
        raw_location: task.location,
      }));

    if (leads.length > 0) {
      const upsertResult = await supabase
        .from("leads")
        .upsert(leads, { onConflict: "name,phone" });

      if (upsertResult.error) {
        const insertResult = await supabase.from("leads").insert(leads);
        if (insertResult.error) {
          throw new Error(insertResult.error.message);
        }
      }
    }

    for (const lead of leads) {
      uniqueLeads.add(`${lead.name}|${lead.phone || ""}`);
    }

    await supabase
      .from("scrape_tasks")
      .update({
        leads_count: uniqueLeads.size,
        review_reason: `Cycle ${cycles}: ${uniqueLeads.size} leads (target: ${MIN_LEADS})`,
      })
      .eq("id", task.id);
  }

  await supabase
    .from("scrape_tasks")
    .update({
      status: uniqueLeads.size >= MIN_LEADS ? "completed" : "warning",
      leads_count: uniqueLeads.size,
      finished_at: new Date().toISOString(),
      review_reason:
        uniqueLeads.size >= MIN_LEADS
          ? null
          : `Ciclo máximo (${MAX_CYCLES}) alcanzado: ${uniqueLeads.size} leads (meta: ${MIN_LEADS})`,
    })
    .eq("id", task.id);

  return { id: task.id, cycles, leads: uniqueLeads.size };
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Number.parseInt(searchParams.get("limit") || "20", 10);

  try {
    const supabase = getServiceRoleClient();
    const { data: tasks, error } = await supabase
      .from("scrape_tasks")
      .select("id,keyword,location,sources")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(limit);

    if (error) throw error;

    const pending = (tasks || []) as PendingTask[];
    if (pending.length === 0) {
      return NextResponse.json({ processed: 0, results: [] });
    }

    const results = [];
    for (const task of pending) {
      if (task.sources && !task.sources.includes("yellow_pages")) {
        continue;
      }
      const result = await processTask(task);
      results.push(result);
    }

    return NextResponse.json({ processed: results.length, results });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}

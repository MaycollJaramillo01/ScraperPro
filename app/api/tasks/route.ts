import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { scrapeYellowPages } from "@/lib/scrapers/yellow-pages";
import { getServiceRoleClient } from "@/lib/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TaskRequestBody = {
  keyword?: string;
  location?: string;
  sources?: string[];
  notes?: string;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get("keyword")?.trim();
  const location = searchParams.get("location")?.trim();
  const limit = Number.parseInt(searchParams.get("limit") || "10", 10);

  let supabase: SupabaseClient | null = null;
  try {
    supabase = getServiceRoleClient();
  } catch (err) {
    console.error("Supabase client error", err);
  }

  // If keyword and location are provided, it's a dry-run/preview request
  if (keyword && location) {
    try {
      const result = await scrapeYellowPages({
        keyword,
        location,
        limit: Number.isFinite(limit) && limit > 0 ? limit : 8,
      });

      return NextResponse.json({
        mode: "dry-run",
        keyword,
        location,
        limit,
        yellowPages: result,
      });
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Unexpected error scraping Yellow Pages",
          meta:
            error && typeof error === "object" && "meta" in error
              ? (error as any).meta
              : null,
        },
        { status: 502 },
      );
    }
  }

  // Otherwise, return the list of existing tasks from Supabase
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 500 },
    );
  }

  const { data: tasks, error } = await supabase
    .from("scrape_tasks")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(tasks);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as TaskRequestBody;

    const keyword = (body.keyword ?? "").trim();
    const location = (body.location ?? "").trim();
    const notes = typeof body.notes === "string" ? body.notes.trim() : "";
    const sources = Array.isArray(body.sources)
      ? Array.from(
        new Set(
          body.sources
            .map((source) => source.trim())
            .filter(Boolean),
        ),
      )
      : ["yellow_pages"];

    if (!keyword || !location) {
      return NextResponse.json(
        { error: "keyword and location are required" },
        { status: 400 },
      );
    }

    let supabase: SupabaseClient | null = null;
    const supabaseLogs: Record<string, string | null> = {
      taskUpsertError: null,
      leadsUpsertError: null,
      finalizeError: null,
      supabaseMissing: null,
    };

    try {
      supabase = getServiceRoleClient();
    } catch (clientError) {
      supabaseLogs.supabaseMissing =
        clientError instanceof Error
          ? clientError.message
          : "Supabase client not configured";
    }

    const taskId = randomUUID();
    const startedAt = new Date().toISOString();
    if (supabase) {
      const { error: taskError } = await supabase.from("scrape_tasks").upsert([
        {
          id: taskId,
          keyword,
          location,
          sources,
          notes,
          status: "running",
          leads_count: 0,
          provider: "yellow_pages",
          created_at: startedAt,
        },
      ]);

      if (taskError) {
        supabaseLogs.taskUpsertError = taskError.message;
      }
    }

    const processedSources: string[] = [];
    let yellowPagesResult:
      | Awaited<ReturnType<typeof scrapeYellowPages>>
      | null = null;

    if (sources.includes("yellow_pages")) {
      try {
        yellowPagesResult = await scrapeYellowPages({
          keyword,
          location,
          limit: 2000,
        });
      } catch (scrapeError) {
        // ... (error handling remains same)
        return NextResponse.json(
          {
            error:
              scrapeError instanceof Error
                ? scrapeError.message
                : "Yellow Pages scrape failed",
            source: "yellow_pages",
            meta:
              scrapeError && typeof scrapeError === "object" && "meta" in scrapeError
                ? (scrapeError as any).meta
                : null,
          },
          { status: 502 },
        );
      }

      processedSources.push("yellow_pages");

      if (yellowPagesResult.leads.length > 0 && supabase) {
        const { error: leadsError } = await supabase.from("leads").upsert(
          yellowPagesResult.leads.map((lead) => ({
            task_id: taskId,
            source: "yellow_pages",
            keyword,
            location,
            name: lead.name,
            phone: lead.phone,
            website: lead.website,
            business_profile: lead.sourceUrl,
            street: lead.street,
            city: lead.city,
            region: lead.region,
            postal_code: lead.postalCode,
            address: lead.address,
            category: lead.category,
            source_url: lead.sourceUrl,
            country: "US",
            raw_location: location,
          })),
          { onConflict: "name,phone" }
        );

        if (leadsError) {
          supabaseLogs.leadsUpsertError = leadsError.message;
        }
      }
    }

    if (supabase) {
      const leadsCount = yellowPagesResult?.leads.length ?? 0;
      const finalStatus = leadsCount < 400 ? "warning" : "completed";
      const reviewReason = leadsCount < 400 ? `Only ${leadsCount} leads found (Target: 400+)` : null;

      const { error: finalizeError } = await supabase
        .from("scrape_tasks")
        .update({
          status: finalStatus,
          review_reason: reviewReason,
          leads_count: leadsCount,
          finished_at: new Date().toISOString(),
        })
        .eq("id", taskId);

      if (finalizeError) {
        supabaseLogs.finalizeError = finalizeError.message;
      }
    }

    return NextResponse.json(
      {
        taskId,
        keyword,
        location,
        processedSources,
        yellowPages: yellowPagesResult,
        supabase: supabaseLogs,
        message:
          "Tarea ejecutada con Yellow Pages y persistencia en Supabase (si las tablas existen).",
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Task creation failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

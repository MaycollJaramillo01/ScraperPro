import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    if (!line || line.startsWith("#")) continue;
    const index = line.indexOf("=");
    if (index === -1) continue;
    const key = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function hasPhone(phone) {
  if (!phone) return false;
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 7;
}

function runYellowPagesScraper({ keyword, location, limit }) {
  const pythonPath = "C:\\Python313\\python.exe";
  const scriptPath = path.join(
    process.cwd(),
    "lib",
    "scrapers",
    "yellow_pages_scraper.py",
  );

  return new Promise((resolve, reject) => {
    const pyProcess = spawn(pythonPath, [
      scriptPath,
      keyword,
      location,
      "--limit",
      limit.toString(),
    ]);

    let output = "";
    let errorOutput = "";

    pyProcess.stdout.on("data", (data) => {
      output += data.toString();
    });

    pyProcess.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    pyProcess.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`Python scraper failed: ${errorOutput.trim()}`));
        return;
      }

      try {
        const result = JSON.parse(output);
        if (result.error) {
          reject(new Error(result.error));
          return;
        }
        resolve(result);
      } catch (err) {
        reject(new Error(`Failed to parse Python output: ${output}`));
      }
    });
  });
}

async function main() {
  loadEnvLocal();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase env vars");
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const tasks = [
    { keyword: "Construction contractor", location: "Houston, TX" },
    { keyword: "Contratista de construccion", location: "Houston, TX" },
    { keyword: "Construction contractor", location: "San Antonio, TX" },
    { keyword: "Contratista de construccion", location: "San Antonio, TX" },
    { keyword: "Construction contractor", location: "Dallas, TX" },
    { keyword: "Contratista de construccion", location: "Dallas, TX" },
    { keyword: "Construction contractor", location: "Austin, TX" },
    { keyword: "Contratista de construccion", location: "Austin, TX" },
    { keyword: "Construction contractor", location: "Fort Worth, TX" },
    { keyword: "Contratista de construccion", location: "Fort Worth, TX" },
    { keyword: "Roofing contractor", location: "El Paso, TX" },
    { keyword: "Contratista de techos", location: "El Paso, TX" },
    { keyword: "Roofing contractor", location: "Arlington, TX" },
    { keyword: "Contratista de techos", location: "Arlington, TX" },
    { keyword: "Roofing contractor", location: "Corpus Christi, TX" },
    { keyword: "Contratista de techos", location: "Corpus Christi, TX" },
    { keyword: "Roofing contractor", location: "McAllen, TX" },
    { keyword: "Contratista de techos", location: "McAllen, TX" },
    { keyword: "Roofing contractor", location: "Brownsville, TX" },
    { keyword: "Contratista de techos", location: "Brownsville, TX" },
  ];

  const MIN_LEADS = 300;
  const LIMIT = 1000;

  for (const task of tasks) {
    const { data: existing, error: existingError } = await supabase
      .from("scrape_tasks")
      .select("id,status,leads_count,created_at")
      .eq("keyword", task.keyword)
      .eq("location", task.location)
      .order("created_at", { ascending: false });

    if (existingError) {
      console.log(`ERR listing tasks for ${task.keyword} | ${task.location}: ${existingError.message}`);
      continue;
    }

    const toDelete = (existing || []).filter(
      (row) => row.status === "running" && (row.leads_count || 0) === 0,
    );

    if (toDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from("scrape_tasks")
        .delete()
        .in("id", toDelete.map((row) => row.id));

      if (deleteError) {
        console.log(`ERR deleting duplicates for ${task.keyword} | ${task.location}: ${deleteError.message}`);
      } else {
        console.log(`Deleted ${toDelete.length} duplicate task(s) for ${task.keyword} | ${task.location}`);
      }
    }

    const taskId = randomUUID();
    const startedAt = new Date().toISOString();
    const { error: insertTaskError } = await supabase.from("scrape_tasks").upsert([
      {
        id: taskId,
        keyword: task.keyword,
        location: task.location,
        sources: ["yellow_pages"],
        notes: "",
        status: "running",
        leads_count: 0,
        provider: "yellow_pages",
        created_at: startedAt,
      },
    ]);

    if (insertTaskError) {
      console.log(`ERR creating task ${task.keyword} | ${task.location}: ${insertTaskError.message}`);
      continue;
    }

    console.log(`Started: ${task.keyword} | ${task.location} | taskId=${taskId}`);

    try {
      const result = await runYellowPagesScraper({
        keyword: task.keyword,
        location: task.location,
        limit: LIMIT,
      });

      const leads = (result.leads || [])
        .filter((lead) => hasPhone(lead.phone))
        .map((lead) => ({
          task_id: taskId,
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

      let leadsError = null;
      if (leads.length > 0) {
        const upsertResult = await supabase
          .from("leads")
          .upsert(leads, { onConflict: "name,phone" });

        if (upsertResult.error) {
          const message = upsertResult.error.message || "";
          const missingConstraint =
            message.toLowerCase().includes("unique") ||
            message.toLowerCase().includes("constraint") ||
            message.toLowerCase().includes("on conflict");

          if (missingConstraint) {
            const insertResult = await supabase.from("leads").insert(leads);
            if (insertResult.error) {
              leadsError = insertResult.error.message;
            }
          } else {
            leadsError = message;
          }
        }
      }

      const uniqueLeads = new Set(
        leads.map((lead) => `${lead.name}|${lead.phone || ""}`),
      );
      const totalLeads = uniqueLeads.size;
      const hasMinimum = totalLeads >= MIN_LEADS;
      const hasSomeLeads = totalLeads > 0;
      const finalStatus = hasMinimum ? "completed" : hasSomeLeads ? "warning" : "failed";
      const reviewReason = hasMinimum
        ? null
        : hasSomeLeads
        ? `Rendimiento bajo: ${totalLeads} leads (meta: ${MIN_LEADS}+)`
        : `Sin leads (meta: ${MIN_LEADS}+)`;

      await supabase
        .from("scrape_tasks")
        .update({
          status: finalStatus,
          review_reason: reviewReason,
          leads_count: totalLeads,
          finished_at: new Date().toISOString(),
        })
        .eq("id", taskId);

      if (leadsError) {
        console.log(`WARN: Leads insert error for ${task.keyword} | ${task.location}: ${leadsError}`);
      }

      console.log(`Done: ${task.keyword} | ${task.location} | leads=${totalLeads} | status=${finalStatus}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      await supabase
        .from("scrape_tasks")
        .update({
          status: "failed",
          review_reason: message,
          finished_at: new Date().toISOString(),
        })
        .eq("id", taskId);
      console.log(`ERR scraping ${task.keyword} | ${task.location}: ${message}`);
    }
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

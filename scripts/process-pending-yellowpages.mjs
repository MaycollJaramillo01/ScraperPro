import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
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

const MIN_LEADS = 1000;
const LIMIT = 1200;
const MAX_CYCLES = 15;

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

  const { data: tasks, error } = await supabase
    .from("scrape_tasks")
    .select("id,keyword,location,sources")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(20);

  if (error) throw error;

  for (const task of tasks || []) {
    if (task.sources && !task.sources.includes("yellow_pages")) {
      continue;
    }

    console.log(`Starting: ${task.keyword} | ${task.location} | id=${task.id}`);
    await supabase
      .from("scrape_tasks")
      .update({ status: "running", leads_count: 0, review_reason: null })
      .eq("id", task.id);

    const uniqueLeads = new Set();
    let cycles = 0;

    while (uniqueLeads.size < MIN_LEADS && cycles < MAX_CYCLES) {
      cycles += 1;
      const result = await runYellowPagesScraper({
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

    console.log(`Completed: ${task.keyword} | ${task.location} | leads=${uniqueLeads.size}`);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

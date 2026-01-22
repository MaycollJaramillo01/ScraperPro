import fs from "node:fs";
import path from "node:path";
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

  const { error: deleteError } = await supabase
    .from("scrape_tasks")
    .delete()
    .in("status", ["pending", "running"]);

  if (deleteError) {
    throw new Error(`Failed to delete pending/running tasks: ${deleteError.message}`);
  }

  const tasks = [
    { keyword: "Restaurante mexicano", location: "Los Angeles, CA" },
    { keyword: "Taqueria", location: "Houston, TX" },
    { keyword: "Panaderia latina", location: "Chicago, IL" },
    { keyword: "Supermercado latino", location: "Miami, FL" },
    { keyword: "Envios de dinero", location: "New York, NY" },
    { keyword: "Abogado de inmigracion", location: "Dallas, TX" },
    { keyword: "Clinica dental", location: "Phoenix, AZ" },
    { keyword: "Taller mecanico", location: "San Antonio, TX" },
    { keyword: "Peluqueria", location: "San Diego, CA" },
    { keyword: "Contratista de construccion", location: "El Paso, TX" },
  ];

  let created = 0;

  for (const task of tasks) {
    const taskId = randomUUID();
    const createdAt = new Date().toISOString();
    const { error: insertError } = await supabase.from("scrape_tasks").insert([
      {
        id: taskId,
        keyword: task.keyword,
        location: task.location,
        sources: ["yellow_pages"],
        notes: "Latino focus - target 1000+ leads (yellow_pages)",
        status: "pending",
        leads_count: 0,
        provider: "latino_seed_1000",
        created_at: createdAt,
      },
    ]);

    if (insertError) {
      console.log(`ERR creating ${task.keyword} | ${task.location}: ${insertError.message}`);
      continue;
    }

    created += 1;
    console.log(`Created: ${task.keyword} | ${task.location} | taskId=${taskId}`);
  }

  console.log(`Done. Created=${created}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

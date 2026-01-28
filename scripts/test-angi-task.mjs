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

function runAngiScraper({ keyword, location, limit }) {
    const pythonPath = "C:\\Python313\\python.exe";
    const scriptPath = path.join(
        process.cwd(),
        "lib",
        "scrapers",
        "angi_scraper.py",
    );

    console.log(`Running Python script: ${pythonPath} ${scriptPath} "${keyword}" "${location}" --limit ${limit}`);

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
            // Optional: Log stderr for debugging if needed
            // console.error(`[Python stderr]: ${data.toString()}`);
        });

        pyProcess.on("close", (code) => {
            if (code !== 0) {
                reject(new Error(`Python scraper failed (code ${code}): ${errorOutput.trim()}`));
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
                console.error("Failed output:", output);
                reject(new Error(`Failed to parse Python output. See console for raw output.`));
            }
        });
    });
}

async function main() {
    loadEnvLocal();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error("Missing Supabase env vars. Check .env.local");
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false },
    });

    const TASK = {
        keyword: "landscaping",
        location: "Houston, TX", // Specific city for better testing than just "tx"
        limit: 5,
    };

    console.log(`Creating test task for Angi: ${TASK.keyword} in ${TASK.location}...`);

    const taskId = randomUUID();
    const startedAt = new Date().toISOString();

    // 1. Create Task in DB
    const { error: insertTaskError } = await supabase.from("scrape_tasks").upsert([
        {
            id: taskId,
            keyword: TASK.keyword,
            location: TASK.location,
            sources: ["angi"],
            notes: "Manual test via script",
            status: "running",
            leads_count: 0,
            provider: "angi",
            created_at: startedAt,
        },
    ]);

    if (insertTaskError) {
        console.error(`Error creating task: ${insertTaskError.message}`);
        process.exit(1);
    }

    console.log(`Task created with ID: ${taskId}`);

    try {
        // 2. Run Scraper
        console.log("Starting scraper...");
        const result = await runAngiScraper({
            keyword: TASK.keyword,
            location: TASK.location,
            limit: TASK.limit,
        });

        console.log(`Scraper finished. Found ${result.leads.length} leads.`);

        // 3. Save Leads
        if (result.leads.length > 0) {
            const leads = result.leads.map((lead) => ({
                task_id: taskId,
                source: "angi",
                keyword: TASK.keyword,
                location: TASK.location,
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
                raw_location: TASK.location,
                rating: lead.rating,
                review_count: lead.reviewCount
            }));

            const { error: leadsError } = await supabase
                .from("leads")
                .upsert(leads, { onConflict: "name,phone" });

            if (leadsError) {
                console.error(`Error saving leads: ${leadsError.message}`);
            } else {
                console.log(`Successfully saved ${leads.length} leads to DB.`);
            }
        } else {
            console.log("No leads to save.");
        }

        // 4. Update Task Status
        await supabase
            .from("scrape_tasks")
            .update({
                status: "completed",
                leads_count: result.leads.length,
                finished_at: new Date().toISOString(),
            })
            .eq("id", taskId);

        console.log("Task marked as completed.");

    } catch (error) {
        console.error("Process failed:", error);

        await supabase
            .from("scrape_tasks")
            .update({
                status: "failed",
                review_reason: error.message,
                finished_at: new Date().toISOString(),
            })
            .eq("id", taskId);
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});

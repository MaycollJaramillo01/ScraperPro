import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { scrapeYellowPages } from "@/lib/scrapers/yellow-pages";
import { scrapeYelp } from "@/lib/scrapers/yelp";
import {
  scrapeSerpGoogleMaps,
  scrapeSerpYelp,
  scrapeSerpBingPlaces,
  scrapeSerpGoogleLocalServices,
  scrapeSerpGoogleJobs,
  lookupGoogleMapsContact,
} from "@/lib/scrapers/serpapi";
import { getServiceRoleClient } from "@/lib/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getStaleThresholdIso } from "@/lib/task-utils";
import { hasPhone } from "@/lib/lead-utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Lock system to prevent concurrent executions for the same task
const taskLocks = new Map<string, { locked: boolean; lockedAt: number }>();
const LOCK_TIMEOUT = 5 * 60 * 1000; // 5 minutes timeout for locks

function getTaskLockKey(keyword: string, location: string): string {
  return `${keyword.toLowerCase().trim()}:${location.toLowerCase().trim()}`;
}

function acquireLock(key: string): boolean {
  const existing = taskLocks.get(key);
  
  // Clean up stale locks (older than timeout)
  if (existing && Date.now() - existing.lockedAt > LOCK_TIMEOUT) {
    taskLocks.delete(key);
  }
  
  // If lock exists and is still valid, deny access
  if (taskLocks.has(key)) {
    return false;
  }
  
  // Acquire lock
  taskLocks.set(key, { locked: true, lockedAt: Date.now() });
  return true;
}

function releaseLock(key: string): void {
  taskLocks.delete(key);
}

type TaskRequestBody = {
  keyword?: string;
  location?: string;
  sources?: string[];
  notes?: string;
  minStars?: number;
};

type LeadsWithPhone = { phone?: string | null; rating?: number };
type LeadsResult = { leads: LeadsWithPhone[] };

function hasMinStars(lead: LeadsWithPhone, minStars?: number | null): boolean {
  if (!minStars) return true;
  if (typeof lead.rating !== "number") return false;
  return lead.rating >= minStars;
}

function countLeadsWithPhone(result?: LeadsResult | null, minStars?: number | null): number {
  return (
    result?.leads.filter(
      (lead) => hasMinStars(lead, minStars) && hasPhone(lead.phone),
    ).length ?? 0
  );
}

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

  const MAX_TASK_RUNTIME_MINUTES = 30;

  // Otherwise, return the list of existing tasks from Supabase
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 500 },
    );
  }

  const staleThreshold = getStaleThresholdIso(new Date(), MAX_TASK_RUNTIME_MINUTES);
  await supabase
    .from("scrape_tasks")
    .update({
      status: "failed",
      review_reason: `Timeout: más de ${MAX_TASK_RUNTIME_MINUTES} minutos sin finalizar`,
      finished_at: new Date().toISOString(),
    })
    .eq("status", "running")
    .lt("created_at", staleThreshold)
    .is("finished_at", null);

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
  let taskLockKey = "";
  try {
    const body = (await request.json()) as TaskRequestBody;

    const keyword = (body.keyword ?? "").trim();
    const location = (body.location ?? "").trim();
    const notes = typeof body.notes === "string" ? body.notes.trim() : "";
    const minStarsValue = Number.isFinite(body.minStars) ? Number(body.minStars) : NaN;
    const minStars = Number.isFinite(minStarsValue)
      ? Math.min(5, Math.max(1, minStarsValue))
      : null;
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

    // Check for concurrent execution lock
    taskLockKey = getTaskLockKey(keyword, location);
    if (!acquireLock(taskLockKey)) {
      return NextResponse.json(
        {
          error: `Esta tarea ya está en ejecución para "${keyword}" en "${location}". Por favor espera a que termine.`,
        },
        { status: 409 }, // Conflict
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

    const MIN_LEADS_PER_SOURCE = 300;
    const MAX_LEADS_PER_SOURCE = 1000;
    const MAX_CYCLES = 5; // Maximum number of retry cycles
    const CYCLE_DELAY_MS = 2000; // 2 seconds delay between cycles
    
    const processedSources: string[] = [];
    const accumulatedLeads: {
      task_id: string;
      source: string;
      keyword: string;
      location: string;
      name: string;
      phone?: string | null;
      website?: string | null;
      business_profile?: string | null;
      street?: string | null;
      city?: string | null;
      region?: string | null;
      postal_code?: string | null;
      address?: string | null;
      category?: string | null;
      source_url?: string | null;
      country?: string | null;
      raw_location?: string | null;
    }[] = [];
    
    // Track results across all cycles
    let yellowPagesResult:
      | Awaited<ReturnType<typeof scrapeYellowPages>>
      | null = null;
    let yelpResult: Awaited<ReturnType<typeof scrapeYelp>> | null = null;
    let googleMapsResult: Awaited<ReturnType<typeof scrapeSerpGoogleMaps>> | null =
      null;
    let yelpSerpResult: Awaited<ReturnType<typeof scrapeSerpYelp>> | null = null;
    let yelpLeadsResult: Awaited<ReturnType<typeof scrapeSerpYelp>> | null = null;
    let bingPlacesResult: Awaited<ReturnType<typeof scrapeSerpBingPlaces>> | null =
      null;
    let googleLocalServicesResult: Awaited<ReturnType<typeof scrapeSerpGoogleLocalServices>> | null =
      null;
    let googleJobsResult: Awaited<ReturnType<typeof scrapeSerpGoogleJobs>> | null =
      null;
    
    // Execute scraping cycles until we reach 300 leads or max cycles
    let currentCycle = 0;
    let totalLeadsCount = 0;

    // Scraping loop: execute cycles until we reach 300 leads or max cycles
    while (currentCycle < MAX_CYCLES && totalLeadsCount < MIN_LEADS_PER_SOURCE) {
      currentCycle++;
      console.log(
        `[Task ${taskId}] Cycle ${currentCycle}/${MAX_CYCLES} - Current leads: ${totalLeadsCount}`,
      );

      const cycleLeads: typeof accumulatedLeads = [];
      yelpLeadsResult = null;

      // Scrape all sources for this cycle
      if (sources.includes("yellow_pages")) {
        try {
          const targetLimit = MAX_LEADS_PER_SOURCE;
          yellowPagesResult = await scrapeYellowPages({
            keyword,
            location,
            limit: targetLimit,
          });

          if (!processedSources.includes("yellow_pages")) {
            processedSources.push("yellow_pages");
          }

          if (yellowPagesResult.leads.length > 0) {
            cycleLeads.push(
              ...yellowPagesResult.leads
                .filter((lead) => hasPhone(lead.phone))
                .map((lead) => ({
                task_id: taskId,
                source: "yellow_pages",
                keyword,
                location,
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
                raw_location: location,
              })),
            );
          }
        } catch (scrapeError) {
          console.error(`[Task ${taskId}] Yellow Pages error in cycle ${currentCycle}:`, scrapeError);
          // Continue with other sources instead of failing
        }
      }

      if (sources.includes("yelp")) {
        try {
          yelpSerpResult = await scrapeSerpYelp({
            keyword,
            location,
            limit: MAX_LEADS_PER_SOURCE,
          });
          yelpLeadsResult = yelpSerpResult;
        } catch (scrapeError) {
          console.error(
            `[Task ${taskId}] Yelp SerpApi error in cycle ${currentCycle}:`,
            scrapeError,
          );
        }

        if (!processedSources.includes("yelp")) {
          processedSources.push("yelp");
        }

        if (yelpLeadsResult?.leads.length) {
          const MAX_YELP_ENRICH_LOOKUPS = 25;
          let enrichCount = 0;

          for (const lead of yelpLeadsResult.leads) {
            if (!lead.phone && enrichCount < MAX_YELP_ENRICH_LOOKUPS) {
              const match = await lookupGoogleMapsContact({
                name: lead.name,
                location,
                address: lead.address || lead.street || null,
              });

              if (match) {
                lead.phone = lead.phone || match.phone;
                lead.website = lead.website || match.website;
                lead.sourceUrl = lead.sourceUrl || match.sourceUrl;
                lead.address = lead.address || match.address;
                lead.street = lead.street || match.street;
                lead.city = lead.city || match.city;
                lead.region = lead.region || match.region;
                lead.postalCode = lead.postalCode || match.postalCode;
              }

              enrichCount += 1;
            }
          }

          cycleLeads.push(
            ...yelpLeadsResult.leads
              .filter((lead) => hasMinStars(lead, minStars) && hasPhone(lead.phone))
              .map((lead) => ({
              task_id: taskId,
              source: lead.source || "yelp",
              keyword,
              location,
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
              raw_location: location,
            })),
          );
        }
      }

      if (sources.includes("google")) {
        try {
          googleMapsResult = await scrapeSerpGoogleMaps({
            keyword,
            location,
            limit: MAX_LEADS_PER_SOURCE,
          });

          if (!processedSources.includes("google")) {
            processedSources.push("google");
          }

          if (googleMapsResult.leads.length > 0) {
            cycleLeads.push(
              ...googleMapsResult.leads
                .filter((lead) => hasMinStars(lead, minStars) && hasPhone(lead.phone))
                .map((lead) => ({
                task_id: taskId,
                source: "google",
                keyword,
                location,
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
                raw_location: location,
              })),
            );
          }
        } catch (scrapeError) {
          console.error(`[Task ${taskId}] Google Maps error in cycle ${currentCycle}:`, scrapeError);
          // Continue with other sources
        }
      }

      if (sources.includes("bing_places")) {
        try {
          bingPlacesResult = await scrapeSerpBingPlaces({
            keyword,
            location,
            limit: MAX_LEADS_PER_SOURCE,
          });

          if (!processedSources.includes("bing_places")) {
            processedSources.push("bing_places");
          }

          if (!bingPlacesResult.error && bingPlacesResult.leads.length > 0) {
            cycleLeads.push(
              ...bingPlacesResult.leads
                .filter((lead) => hasMinStars(lead, minStars) && hasPhone(lead.phone))
                .map((lead) => ({
                task_id: taskId,
                source: "bing_places",
                keyword,
                location,
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
                raw_location: location,
              })),
            );
          }
        } catch (scrapeError) {
          console.error(`[Task ${taskId}] Bing Places error in cycle ${currentCycle}:`, scrapeError);
          // Continue with other sources
        }
      }

      // Google Local Services - Verified service providers
      if (sources.includes("google_local_services")) {
        try {
          googleLocalServicesResult = await scrapeSerpGoogleLocalServices({
            keyword,
            location,
            limit: MAX_LEADS_PER_SOURCE,
          });

          if (!processedSources.includes("google_local_services")) {
            processedSources.push("google_local_services");
          }

          if (!googleLocalServicesResult.error && googleLocalServicesResult.leads.length > 0) {
            cycleLeads.push(
              ...googleLocalServicesResult.leads
                .filter((lead) => hasMinStars(lead, minStars) && hasPhone(lead.phone))
                .map((lead) => ({
                task_id: taskId,
                source: "google_local_services",
                keyword,
                location,
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
                raw_location: location,
              })),
            );
          }
        } catch (scrapeError) {
          console.error(`[Task ${taskId}] Google Local Services error in cycle ${currentCycle}:`, scrapeError);
          // Continue with other sources
        }
      }

      // Google Jobs - Companies that are hiring
      if (sources.includes("google_jobs")) {
        try {
          googleJobsResult = await scrapeSerpGoogleJobs({
            keyword,
            location,
            limit: MAX_LEADS_PER_SOURCE,
          });

          if (!processedSources.includes("google_jobs")) {
            processedSources.push("google_jobs");
          }

          if (!googleJobsResult.error && googleJobsResult.leads.length > 0) {
            cycleLeads.push(
              ...googleJobsResult.leads
                .filter((lead) => hasMinStars(lead, minStars) && hasPhone(lead.phone))
                .map((lead) => ({
                task_id: taskId,
                source: "google_jobs",
                keyword,
                location,
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
                raw_location: location,
              })),
            );
          }
        } catch (scrapeError) {
          console.error(`[Task ${taskId}] Google Jobs error in cycle ${currentCycle}:`, scrapeError);
          // Continue with other sources
        }
      }

      // Save leads from this cycle to database
      if (supabase && cycleLeads.length > 0) {
        let leadsErrorMessage: string | null = null;
        const upsertResult = await supabase
          .from("leads")
          .upsert(cycleLeads, { onConflict: "name,phone" });

        if (upsertResult.error) {
          const message = upsertResult.error.message || "";
          const missingConstraint =
            message.toLowerCase().includes("unique") ||
            message.toLowerCase().includes("constraint") ||
            message.toLowerCase().includes("on conflict");

          if (missingConstraint) {
            const insertResult = await supabase.from("leads").insert(cycleLeads);
            if (insertResult.error) {
              leadsErrorMessage = insertResult.error.message;
            }
          } else {
            leadsErrorMessage = message;
          }
        }

        if (leadsErrorMessage) {
          supabaseLogs.leadsUpsertError = leadsErrorMessage;
          console.error(
            `[Task ${taskId}] Error saving leads in cycle ${currentCycle}:`,
            leadsErrorMessage,
          );
        } else {
          accumulatedLeads.push(...cycleLeads);
          console.log(`[Task ${taskId}] Saved ${cycleLeads.length} leads from cycle ${currentCycle}`);
        }
      }

      // Update task status with current progress
      const yelpLeadsCount =
        countLeadsWithPhone(yelpResult as LeadsResult | null, minStars) ||
        countLeadsWithPhone(yelpSerpResult as LeadsResult | null, minStars);
      const cycleLeadsCount =
        countLeadsWithPhone(yellowPagesResult as LeadsResult | null, null) +
        (countLeadsWithPhone(yelpLeadsResult, minStars) || yelpLeadsCount) +
        countLeadsWithPhone(googleMapsResult as LeadsResult | null, minStars) +
        countLeadsWithPhone(bingPlacesResult as LeadsResult | null, minStars);

      // Count unique leads accumulated so far (using Set to deduplicate by name+phone)
      const uniqueLeads = new Set(
        accumulatedLeads.map((l) => `${l.name}|${l.phone || ""}`),
      );
      totalLeadsCount = uniqueLeads.size;

      // Update task in database with current progress
      if (supabase) {
        await supabase
          .from("scrape_tasks")
          .update({
            leads_count: totalLeadsCount,
            review_reason:
              totalLeadsCount < MIN_LEADS_PER_SOURCE
                ? `Cycle ${currentCycle}/${MAX_CYCLES}: ${totalLeadsCount} leads (Target: ${MIN_LEADS_PER_SOURCE}+)`
                : null,
          })
          .eq("id", taskId);
      }

      // If we've reached the minimum, break out of the loop
      if (totalLeadsCount >= MIN_LEADS_PER_SOURCE) {
        console.log(
          `[Task ${taskId}] Reached minimum of ${MIN_LEADS_PER_SOURCE} leads after ${currentCycle} cycles`,
        );
        break;
      }

      // If we haven't reached the minimum and there are more cycles, wait before next cycle
      if (currentCycle < MAX_CYCLES && totalLeadsCount < MIN_LEADS_PER_SOURCE) {
        console.log(
          `[Task ${taskId}] Only ${totalLeadsCount} leads after cycle ${currentCycle}, waiting ${CYCLE_DELAY_MS}ms before next cycle...`,
        );
        await new Promise((resolve) => setTimeout(resolve, CYCLE_DELAY_MS));
      }
    }

    const hasMinimum = totalLeadsCount >= MIN_LEADS_PER_SOURCE;
    const hasSomeLeads = totalLeadsCount > 0;

    // Finalize task status
    if (supabase) {
      const finalStatus = hasMinimum
        ? "completed"
        : hasSomeLeads
        ? "warning"
        : "failed";
      const reviewReason = hasMinimum
        ? null
        : hasSomeLeads
        ? `Rendimiento bajo: ${totalLeadsCount} leads tras ${currentCycle} ciclo(s) (meta: ${MIN_LEADS_PER_SOURCE}+)`
        : `Sin leads tras ${currentCycle} ciclo(s) (meta: ${MIN_LEADS_PER_SOURCE}+)`;

      const { error: finalizeError } = await supabase
        .from("scrape_tasks")
        .update({
          status: finalStatus,
          review_reason: reviewReason,
          leads_count: totalLeadsCount,
          finished_at: new Date().toISOString(),
        })
        .eq("id", taskId);

      if (finalizeError) {
        supabaseLogs.finalizeError = finalizeError.message;
      }
    }

    // Release lock before returning
    releaseLock(taskLockKey);

    return NextResponse.json(
      {
        taskId,
        keyword,
        location,
        processedSources,
        cycles: currentCycle,
        totalLeads: totalLeadsCount,
        yellowPages: yellowPagesResult,
        yelp: yelpResult ?? yelpSerpResult,
        google: googleMapsResult,
        bing_places: bingPlacesResult,
        supabase: supabaseLogs,
        message: hasMinimum
          ? `Tarea completada exitosamente con ${totalLeadsCount} leads después de ${currentCycle} ciclo(s).`
          : hasSomeLeads
          ? `Tarea finalizada con rendimiento bajo: ${totalLeadsCount} leads tras ${currentCycle} ciclo(s) (meta: ${MIN_LEADS_PER_SOURCE}+).`
          : `Tarea finalizada sin leads tras ${currentCycle} ciclo(s) (meta: ${MIN_LEADS_PER_SOURCE}+).`,
      },
      { status: hasMinimum ? 201 : 200 },
    );
  } catch (error) {
    console.error("Task creation failed", error);
    // Release lock on error
    if (taskLockKey) {
      releaseLock(taskLockKey);
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

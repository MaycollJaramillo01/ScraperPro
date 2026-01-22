import { NextResponse } from "next/server";
import { getServiceRoleClient } from "@/lib/supabase";

export async function GET() {
    try {
        const supabase = getServiceRoleClient();

        // 1. Tasks and metrics
        const { data: tasksData, error: tasksError } = await supabase
            .from("scrape_tasks")
            .select("status");

        if (tasksError) throw tasksError;

        const { count: leadsTotalCount, error: leadsTotalError } = await supabase
            .from("leads")
            .select("*", { count: "exact", head: true });

        if (leadsTotalError) throw leadsTotalError;

        const totalLeads = leadsTotalCount || 0;
        const runningTasks = (tasksData as any[]).filter(t => t.status === "running").length;
        const totalTasks = (tasksData as any[]).length;

        const now = new Date();
        const startOfTodayUtc = new Date(Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate()
        ));
        const startOfWeekUtc = new Date(startOfTodayUtc);
        const dayOfWeekUtc = startOfWeekUtc.getUTCDay();
        const diffToMonday = (dayOfWeekUtc + 6) % 7;
        startOfWeekUtc.setUTCDate(startOfWeekUtc.getUTCDate() - diffToMonday);
        startOfWeekUtc.setUTCHours(0, 0, 0, 0);
        const startOfMonthUtc = new Date(Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            1
        ));

        // 2. Daily leads history (last 7 days)
        const last7DaysUtc = new Date(startOfTodayUtc);
        last7DaysUtc.setUTCDate(startOfTodayUtc.getUTCDate() - 7);

        const { data: historyData, error: historyError } = await supabase
            .from("leads")
            .select("created_at, source")
            .gte("created_at", last7DaysUtc.toISOString());

        if (historyError) throw historyError;

        // Group by day and source
        const historyMap = (historyData || [] as any[]).reduce((acc: any, curr: any) => {
            const date = new Date(curr.created_at).toISOString().split("T")[0];
            const source = curr.source === "yellow_pages" ? "Yellow Pages" : curr.source || "Yellow Pages";

            if (!acc[date]) acc[date] = {};
            acc[date][source] = (acc[date][source] || 0) + 1;
            return acc;
        }, {});

        // Format daily history for frontend
        const dailyHistory = Object.entries(historyMap).map(([date, sources]) => ({
            date,
            sources
        })).sort((a, b) => a.date.localeCompare(b.date));

        // 3. Today, week, and month totals (UTC boundaries)

        const { count: leadsCountToday } = await supabase
            .from("leads")
            .select("*", { count: "exact", head: true })
            .gte("created_at", startOfTodayUtc.toISOString());

        const { count: leadsCountMonth } = await supabase
            .from("leads")
            .select("*", { count: "exact", head: true })
            .gte("created_at", startOfMonthUtc.toISOString());

        const { count: leadsCountWeek } = await supabase
            .from("leads")
            .select("*", { count: "exact", head: true })
            .gte("created_at", startOfWeekUtc.toISOString());

        // 4. Weekly history (last 8 weeks)
        const weeksToShow = 8;
        const startOfWeekRangeUtc = new Date(startOfWeekUtc);
        startOfWeekRangeUtc.setUTCDate(startOfWeekRangeUtc.getUTCDate() - (weeksToShow - 1) * 7);
        startOfWeekRangeUtc.setUTCHours(0, 0, 0, 0);

        const { data: weeklyData, error: weeklyError } = await supabase
            .from("leads")
            .select("created_at")
            .gte("created_at", startOfWeekRangeUtc.toISOString());

        if (weeklyError) throw weeklyError;

        const getWeekStartUtc = (date: Date) => {
            const d = new Date(date);
            const dayOfWeek = d.getUTCDay();
            const delta = (dayOfWeek + 6) % 7;
            d.setUTCDate(d.getUTCDate() - delta);
            d.setUTCHours(0, 0, 0, 0);
            return d;
        };

        const weeklyMap = (weeklyData || [] as any[]).reduce((acc: Record<string, number>, curr: any) => {
            const weekStart = getWeekStartUtc(new Date(curr.created_at)).toISOString().split("T")[0];
            acc[weekStart] = (acc[weekStart] || 0) + 1;
            return acc;
        }, {});

        const weeklyHistory = Array.from({ length: weeksToShow }, (_, index) => {
            const weekStart = new Date(startOfWeekRangeUtc);
            weekStart.setUTCDate(startOfWeekRangeUtc.getUTCDate() + index * 7);
            const key = weekStart.toISOString().split("T")[0];
            return {
                weekStart: key,
                count: weeklyMap[key] || 0,
            };
        });

        return NextResponse.json({
            totalLeads,
            runningTasks,
            totalTasks,
            leadsToday: leadsCountToday || 0,
            leadsWeek: leadsCountWeek || 0,
            leadsMonth: leadsCountMonth || 0,
            dailyHistory,
            weeklyHistory,
        });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Unknown error" },
            { status: 500 }
        );
    }
}

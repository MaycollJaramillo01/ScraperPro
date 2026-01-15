import { NextResponse } from "next/server";
import { getServiceRoleClient } from "@/lib/supabase";

export async function GET() {
    try {
        const supabase = getServiceRoleClient();

        // 1. Tareas y sus métricas
        const { data: tasksData, error: tasksError } = await supabase
            .from("scrape_tasks")
            .select("leads_count, status");

        if (tasksError) throw tasksError;

        const totalLeads = (tasksData as any[]).reduce((acc, curr) => acc + (curr.leads_count || 0), 0);
        const runningTasks = (tasksData as any[]).filter(t => t.status === "running").length;
        const totalTasks = (tasksData as any[]).length;

        // 2. Historial de Leads por Día (para el Line Chart)
        const now = new Date();
        const last7Days = new Date();
        last7Days.setDate(now.getDate() - 7);
        last7Days.setHours(0, 0, 0, 0);

        const { data: historyData, error: historyError } = await supabase
            .from("leads")
            .select("created_at, source")
            .gte("created_at", last7Days.toISOString());

        if (historyError) throw historyError;

        // Agrupar por día y fuente
        const historyMap = (historyData || [] as any[]).reduce((acc: any, curr: any) => {
            const date = new Date(curr.created_at).toISOString().split("T")[0];
            const source = curr.source === "yellow_pages" ? "Yellow Pages" : curr.source || "Yellow Pages";

            if (!acc[date]) acc[date] = {};
            acc[date][source] = (acc[date][source] || 0) + 1;
            return acc;
        }, {});

        // Formatear para el frontend
        const dailyHistory = Object.entries(historyMap).map(([date, sources]) => ({
            date,
            sources
        })).sort((a, b) => a.date.localeCompare(b.date));

        // 4. Leads de hoy, semana y mes
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const startOfWeek = new Date(now);
        const day = startOfWeek.getDay();
        const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Lunes
        startOfWeek.setDate(diff);
        startOfWeek.setHours(0, 0, 0, 0);

        const { count: leadsCountToday } = await supabase
            .from("leads")
            .select("*", { count: 'exact', head: true })
            .gte("created_at", today.toISOString());

        const { count: leadsCountMonth } = await supabase
            .from("leads")
            .select("*", { count: 'exact', head: true })
            .gte("created_at", startOfMonth.toISOString());

        const { count: leadsCountWeek } = await supabase
            .from("leads")
            .select("*", { count: 'exact', head: true })
            .gte("created_at", startOfWeek.toISOString());

        return NextResponse.json({
            totalLeads,
            runningTasks,
            totalTasks,
            leadsToday: leadsCountToday || 0,
            leadsWeek: leadsCountWeek || 0,
            leadsMonth: leadsCountMonth || 0,
            dailyHistory,
        });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Unknown error" },
            { status: 500 }
        );
    }
}

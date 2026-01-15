"use client";

import * as React from "react";
import { TasksTable } from "@/components/dashboard/tasks-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowUpRight,
  Clock4,
  Rocket,
  ShieldCheck,
  Signal,
  Loader2,
} from "lucide-react";

import { PieChart } from "@/components/dashboard/pie-chart";
import { LineChart } from "@/components/dashboard/line-chart";

export default function DashboardPage() {
  const [stats, setStats] = React.useState({
    totalLeads: 0,
    runningTasks: 0,
    totalTasks: 0,
    leadsToday: 0,
    leadsWeek: 0,
    leadsMonth: 0,
    sourceDistribution: {} as Record<string, number>,
    dailyHistory: [] as any[],
  });
  const [loading, setLoading] = React.useState(true);

  const fetchStats = React.useCallback(async () => {
    try {
      const response = await fetch("/api/stats");
      if (response.ok) {
        const data = await response.json();
        // Solo actualizar si la data es válida y contiene los campos esperados
        if (data && !data.error) {
          setStats(prev => ({ ...prev, ...data }));
        }
      }
    } catch (err) {
      console.error("Error fetching stats:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, [fetchStats]);

  const cards = [
    {
      title: "Consumo de Tareas",
      value: stats.totalTasks.toString(),
      helper: `${stats.totalTasks > 0 ? "Historial activo" : "Sin tareas aún"}`,
      icon: ShieldCheck,
    },
    {
      title: "Tareas en curso",
      value: stats.runningTasks.toString(),
      helper: stats.runningTasks > 0 ? "Procesando ahora" : "Cola despejada",
      icon: Clock4,
    },
    {
      title: "Leads extraídos",
      value: stats.totalLeads.toLocaleString(),
      helper: `+${stats.leadsWeek.toLocaleString()} esta semana`,
      icon: Signal,
    },
    {
      title: "Estado del Sistema",
      value: "Activo",
      helper: "Sincronización Supabase",
      icon: Rocket,
    },
  ];

  // Preparar datos para los gráficos
  const sourceColors: Record<string, string> = {
    "Yellow Pages": "#fbbf24", // amber
    "Google Maps": "#ef4444",   // red
    "Yelp": "#f97316",          // orange
    "Manta": "#3b82f6",         // blue
    "MapQuest": "#10b981",      // emerald
    "desconocido": "#64748b",   // slate
  };

  const sourceDistribution = stats.sourceDistribution || {};
  const sourceData = Object.entries(sourceDistribution).map(([source, count]) => ({
    label: source,
    value: count,
    color: sourceColors[source] || "#3b82f6", // Fallback deterministic color (blue)
  }));

  const weeklyTarget = 20000;
  const weeklyProgress = [
    { label: "Completado", value: stats.leadsWeek, color: "#10b981" },
    { label: "Pendiente", value: Math.max(0, weeklyTarget - stats.leadsWeek), color: "rgba(255,255,255,0.05)" }
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm uppercase tracking-[0.16em] text-muted-foreground">
            Panorama general
          </p>
          <h1 className="text-2xl font-semibold leading-tight text-white md:text-3xl">
            Dashboard de scraping
          </h1>
          <p className="text-sm text-muted-foreground">
            Monitorea créditos, tareas en background y exportaciones recientes.
          </p>
        </div>
        <Badge
          variant="outline"
          className="border-emerald-500/30 bg-emerald-500/5 text-emerald-400 text-xs flex items-center gap-2"
        >
          {loading && <Loader2 className="h-3 w-3 animate-spin" />}
          Live Data Connection
        </Badge>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((stat) => (
          <Card
            key={stat.title}
            className="border-border/70 bg-black/40 backdrop-blur"
          >
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
              <div>
                <p className="text-xs uppercase text-muted-foreground">
                  {stat.title}
                </p>
                <CardTitle className="mt-1 text-lg font-semibold text-white">
                  {loading ? "..." : stat.value}
                </CardTitle>
              </div>
              <div className="rounded-full border border-border/60 bg-white/[0.04] p-2">
                <stat.icon className="h-4 w-4 text-emerald-300" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <ArrowUpRight className="h-4 w-4 text-emerald-300" />
                {stat.helper}
              </p>
            </CardContent>
          </Card>
        ))}
      </section>

      {/* Seccion de Graficos */}
      <section className="grid gap-4 md:grid-cols-2">
        <LineChart
          title="Tendencia de Extracción"
          subtitle="Leads capturados por día y fuente"
          data={stats.dailyHistory}
        />
        <PieChart
          title="Objetivo Leads Semanal"
          subtitle={`Meta: ${weeklyTarget.toLocaleString()} leads`}
          data={weeklyProgress}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.25fr_1fr]">
        <Card className="border-border/70 bg-gradient-to-br from-white/[0.04] via-transparent to-emerald-500/[0.06]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <div>
              <p className="text-sm font-semibold text-white">
                Pipeline de scraping
              </p>
              <p className="text-xs text-muted-foreground">
                Google Maps · Yelp · MapQuest · Manta
              </p>
            </div>
            <Badge variant="secondary" className="text-xs">
              Async queue
            </Badge>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Cada tarea corre en background. Cuando termine, notificamos y
              podrás explorar los leads normalizados en la tabla avanzada.
            </p>
            <p className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-emerald-100">
              Conexión en tiempo real activa. Los datos que ves provienen directamente
              de tu base de datos de producción en Supabase.
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-black/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-white">
              Checklist de la cuenta
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Siguiente paso: lanza una tarea y exporta a tu CRM.
            </p>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-center justify-between rounded-lg border border-border/70 bg-white/[0.02] px-3 py-2">
              <div>
                <p className="text-white">Definir nicho y ubicación</p>
                <p className="text-xs text-muted-foreground">
                  Ej. “Pizzerías, Madrid”
                </p>
              </div>
              <Badge variant="outline" className="border-emerald-500/50">
                Listo
              </Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/70 bg-white/[0.02] px-3 py-2">
              <div>
                <p className="text-white">Seleccionar fuentes</p>
                <p className="text-xs text-muted-foreground">
                  Google, Yelp, Manta, MapQuest
                </p>
              </div>
              <Badge variant="outline" className="border-emerald-500/50">
                Listo
              </Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/70 bg-white/[0.02] px-3 py-2">
              <div>
                <p className="text-white">Sincronizar CRM</p>
                <p className="text-xs text-muted-foreground">
                  Salesforce / HubSpot ready
                </p>
              </div>
              <Badge variant="outline" className="border-white/20">
                Próximo
              </Badge>
            </div>
          </CardContent>
        </Card>
      </section>

      <TasksTable />
    </div>
  );
}

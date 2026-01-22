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

import { LineChart } from "@/components/dashboard/line-chart";
import { WeeklyGauge } from "@/components/dashboard/weekly-gauge";

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
    weeklyHistory: [] as { weekStart: string; count: number }[],
  });
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = React.useState<Date | null>(null);

  const fetchStats = React.useCallback(async () => {
    setRefreshing(true);
    try {
      const response = await fetch("/api/stats");
      if (response.ok) {
        const data = await response.json();
        // Solo actualizar si la data es válida y contiene los campos esperados
        if (data && !data.error) {
          setStats(prev => ({ ...prev, ...data }));
          setError(null);
          setLastUpdated(new Date());
        } else {
          setError("Respuesta inválida del servidor.");
        }
      } else {
        setError("Error al consultar estadísticas.");
      }
    } catch (err) {
      console.error("Error fetching stats:", err);
      setError("No se pudo conectar con el servidor.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, [fetchStats]);

  const hasData =
    stats.totalTasks > 0 ||
    stats.runningTasks > 0 ||
    stats.totalLeads > 0 ||
    stats.leadsWeek > 0 ||
    stats.leadsMonth > 0 ||
    stats.leadsToday > 0;

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

  const weeklyTarget = 20000;

  const weeklyHistory = stats.weeklyHistory || [];
  const weeklyLog = weeklyHistory.map((week, index) => {
    const previous = index > 0 ? weeklyHistory[index - 1].count : null;
    const delta = previous !== null ? week.count - previous : null;
    return { ...week, delta };
  });

  const formatWeekRange = (weekStart: string) => {
    const start = new Date(weekStart);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const options: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short" };
    return `${start.toLocaleDateString("es-ES", options)} - ${end.toLocaleDateString("es-ES", options)}`;
  };

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
          {(loading || refreshing) && <Loader2 className="h-3 w-3 animate-spin" />}
          {error ? "Sin conexión" : "Live Data Connection"}
        </Badge>
      </div>

      {error && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          {error}{" "}
          <button
            type="button"
            onClick={fetchStats}
            className="underline decoration-amber-200/70 underline-offset-4"
          >
            Reintentar
          </button>
        </div>
      )}

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
                  {loading ? "..." : error ? "N/A" : stat.value}
                </CardTitle>
              </div>
              <div className="rounded-full border border-border/60 bg-white/[0.04] p-2">
                <stat.icon className="h-4 w-4 text-emerald-300" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <ArrowUpRight className="h-4 w-4 text-emerald-300" />
                {error ? "Esperando datos" : stat.helper}
              </p>
            </CardContent>
          </Card>
        ))}
      </section>

      {/* Sección de Gráficos */}
      <section className="grid gap-4 md:grid-cols-2">
        <LineChart
          title="Tendencia de Extracción"
          subtitle={hasData ? "Leads capturados por día y fuente" : "Sin datos recientes"}
          data={stats.dailyHistory}
        />
        <WeeklyGauge
          title="Objetivo semanal"
          subtitle={`Meta semanal: ${weeklyTarget.toLocaleString()} leads`}
          current={stats.leadsWeek}
          target={weeklyTarget}
        />
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Card className="border-border/70 bg-black/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-white">Registro semanal</CardTitle>
            <p className="text-xs text-muted-foreground">
              Últimas semanas (lunes a domingo)
            </p>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            {weeklyLog.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Sin datos para mostrar.
              </p>
            )}
            {weeklyLog.slice().reverse().map((week) => (
              <div
                key={week.weekStart}
                className="flex items-center justify-between rounded-lg border border-border/70 bg-white/[0.02] px-3 py-2"
              >
                <div>
                  <p className="text-white">{formatWeekRange(week.weekStart)}</p>
                  <p className="text-xs text-muted-foreground">
                    {week.count.toLocaleString()} leads
                  </p>
                </div>
                {week.delta !== null && (
                  <Badge
                    variant="outline"
                    className={
                      week.delta >= 0
                        ? "border-emerald-500/50 text-emerald-200"
                        : "border-rose-500/50 text-rose-200"
                    }
                  >
                    {week.delta >= 0 ? "+" : ""}
                    {week.delta.toLocaleString()}
                  </Badge>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-black/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-white">
              Objetivo semanal
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Progreso frente a la meta configurada.
            </p>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-center justify-between rounded-lg border border-border/70 bg-white/[0.02] px-3 py-2">
              <div>
                <p className="text-white">Leads completados</p>
                <p className="text-xs text-muted-foreground">
                  {stats.leadsWeek.toLocaleString()} de {weeklyTarget.toLocaleString()}
                </p>
              </div>
              <Badge variant="outline" className="border-emerald-500/50 text-emerald-200">
                {Math.min(100, Math.round((stats.leadsWeek / weeklyTarget) * 100))}%
              </Badge>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.25fr_1fr]">
        <Card className="border-border/70 bg-gradient-to-br from-white/[0.04] via-transparent to-emerald-500/[0.06]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <div>
              <p className="text-sm font-semibold text-white">
                Pipeline de scraping
              </p>
              <p className="text-xs text-muted-foreground">
                Google Maps / Yelp / MapQuest / Manta
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
            {lastUpdated && (
              <p className="text-[11px] text-emerald-200/70">
                Última actualización: {lastUpdated.toLocaleTimeString()}
              </p>
            )}
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
                  Ej. "Pizzerías, Madrid"
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

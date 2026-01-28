"use client";

import * as React from "react";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { LeadsTable } from "@/components/leads/leads-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { formatTaskDate } from "@/lib/task-utils";
import { getSupabaseClient } from "@/lib/supabase-client";

function LeadsContent() {
  const searchParams = useSearchParams();
  const taskId = searchParams.get("taskId");
  const [taskInfo, setTaskInfo] = React.useState<any | null>(null);
  const [taskLoading, setTaskLoading] = React.useState(false);
  const [taskError, setTaskError] = React.useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = React.useState<string | null>(null);
  const [logs, setLogs] = React.useState<{ ts: string; msg: string }[]>([]);
  const [logConnected, setLogConnected] = React.useState(false);

  React.useEffect(() => {
    if (!taskId) {
      setTaskInfo(null);
      return;
    }

    let active = true;
    const fetchTask = async () => {
      try {
        setTaskLoading(true);
        const response = await fetch(`/api/tasks/${taskId}`);
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to fetch task");
        }
        const data = await response.json();
        if (!active) return;
        setTaskInfo(data);
        setLastUpdated(new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }));
        setTaskError(null);
      } catch (err) {
        if (!active) return;
        setTaskError(err instanceof Error ? err.message : "Error desconocido");
      } finally {
        if (active) setTaskLoading(false);
      }
    };

    fetchTask();
    const interval = setInterval(fetchTask, 15000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [taskId]);

  // Real-time log listener (Supabase Realtime on scrape_tasks row)
  React.useEffect(() => {
    if (!taskId) {
      setLogs([]);
      setLogConnected(false);
      return;
    }

    const supabase = getSupabaseClient();
    const channel = supabase
      .channel(`task-log-${taskId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "scrape_tasks",
          filter: `id=eq.${taskId}`,
        },
        (payload) => {
          const row: any = payload.new;
          if (!row) return;
          const messages: string[] = [];
          if (row.status) messages.push(`Estado: ${row.status}`);
          if (typeof row.leads_count === "number") messages.push(`Leads: ${row.leads_count}`);
          if (row.review_reason) messages.push(row.review_reason);
          if (messages.length === 0) return;
          setLogs((prev) => {
            const next = [
              { ts: new Date().toISOString(), msg: messages.join(" • ") },
              ...prev,
            ].slice(0, 120);
            return next;
          });
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setLogConnected(true);
      });

    return () => {
      supabase.removeChannel(channel);
      setLogConnected(false);
    };
  }, [taskId]);

  // Seed initial log when we fetch taskInfo the first time.
  React.useEffect(() => {
    if (!taskInfo || !taskId) return;
    const parts: string[] = [];
    if (taskInfo.status) parts.push(`Estado: ${taskInfo.status}`);
    if (typeof taskInfo.leads_count === "number") parts.push(`Leads: ${taskInfo.leads_count}`);
    if (taskInfo.review_reason) parts.push(taskInfo.review_reason as string);
    if (parts.length) {
      setLogs((prev) => (prev.length ? prev : [{ ts: new Date().toISOString(), msg: parts.join(" • ") }]));
    }
  }, [taskInfo, taskId]);

  return (
    <div className="space-y-5" suppressHydrationWarning>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.16em] text-muted-foreground">
            Data explorer
          </p>
          <h1 className="text-2xl font-semibold text-white">
            {taskId ? "Detalles de Tarea" : "Todos los Leads"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {taskId
              ? `Viendo resultados específicos para la tarea ${taskId.substring(0, 8)}.`
              : "Explora la base de datos completa de leads extraídos."}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => (window.location.href = "/leads")}>
            Ver todos
          </Button>
          <Button variant="outline">Exportar Vista</Button>
        </div>
      </div>

      {taskId && (
        <div className="rounded-xl border border-border/70 bg-black/40 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Estado de la tarea
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="border-emerald-500/40 text-emerald-200">
                  {taskInfo?.status || "Procesando"}
                </Badge>
                {lastUpdated && (
                  <span className="text-xs text-muted-foreground">
                    Actualizado {lastUpdated}
                  </span>
                )}
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              {taskInfo?.created_at
                ? `Creada: ${formatTaskDate(taskInfo.created_at)}`
                : "Creada: -"}
            </div>
          </div>

          <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">Progreso</p>
              <p className="text-white">
                {taskInfo?.review_reason || "Sin actualización aún."}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Leads acumulados</p>
              <p className="text-white">{taskInfo?.leads_count ?? 0}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Fuentes</p>
              <p className="text-white">
                {(taskInfo?.sources || []).join(", ") || "-"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Finalizada</p>
              <p className="text-white">
                {taskInfo?.finished_at ? formatTaskDate(taskInfo.finished_at) : "-"}
              </p>
            </div>
          </div>

          {taskLoading && (
            <p className="mt-3 text-xs text-muted-foreground">
              Actualizando estado...
            </p>
          )}
          {taskError && (
            <p className="mt-3 text-xs text-red-400">
              Error cargando tarea: {taskError}
            </p>
          )}

          {/* Log en vivo */}
          <div className="mt-4 rounded-lg border border-border/70 bg-black/30 p-3">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="uppercase tracking-[0.12em] text-muted-foreground">Log en vivo</span>
              <span
                className={
                  "flex items-center gap-2 " +
                  (logConnected ? "text-emerald-300" : "text-muted-foreground")
                }
              >
                <span
                  className={
                    "h-2 w-2 rounded-full " +
                    (logConnected ? "bg-emerald-400" : "bg-slate-500")
                  }
                />
                {logConnected ? "Tiempo real" : "Conectando..."}
              </span>
            </div>
            <div className="mt-2 max-h-64 space-y-1 overflow-auto pr-1 text-xs leading-relaxed text-slate-200/90">
              {logs.length === 0 ? (
                <p className="text-muted-foreground">Sin eventos aún.</p>
              ) : (
                logs.map((log, idx) => (
                  <div key={`${log.ts}-${idx}`} className="flex gap-2">
                    <span className="min-w-[72px] text-[11px] text-muted-foreground">
                      {new Date(log.ts).toLocaleTimeString("es-ES", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </span>
                    <span>{log.msg}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <LeadsTable taskId={taskId} />
    </div>
  );
}

export default function LeadsPage() {
  return (
    <Suspense fallback={
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    }>
      <LeadsContent />
    </Suspense>
  );
}

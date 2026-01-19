"use client";

import * as React from "react";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { LeadsTable } from "@/components/leads/leads-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { formatTaskDate } from "@/lib/task-utils";

function LeadsContent() {
  const searchParams = useSearchParams();
  const taskId = searchParams.get("taskId");
  const [taskInfo, setTaskInfo] = React.useState<any | null>(null);
  const [taskLoading, setTaskLoading] = React.useState(false);
  const [taskError, setTaskError] = React.useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = React.useState<string | null>(null);

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

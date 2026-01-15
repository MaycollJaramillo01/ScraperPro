"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { LeadsTable } from "@/components/leads/leads-table";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

function LeadsContent() {
  const searchParams = useSearchParams();
  const taskId = searchParams.get("taskId");

  return (
    <div className="space-y-5">
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
          <Button variant="outline" onClick={() => window.location.href = '/leads'}>Ver todos</Button>
          <Button variant="outline">Exportar Vista</Button>
        </div>
      </div>

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

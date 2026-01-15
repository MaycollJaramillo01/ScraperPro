import Link from "next/link";
import { TasksTable } from "@/components/dashboard/tasks-table";
import { Button } from "@/components/ui/button";

export default function TasksPage() {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.16em] text-muted-foreground">
            Tareas
          </p>
          <h1 className="text-2xl font-semibold text-white">Cola de scraping</h1>
          <p className="text-sm text-muted-foreground">
            Estado en vivo de las ejecuciones y normalización de leads.
          </p>
        </div>
        <Button asChild>
          <Link href="/tasks/new">Crear nueva tarea</Link>
        </Button>
      </div>

      <TasksTable />
    </div>
  );
}

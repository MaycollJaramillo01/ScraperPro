import { NewTaskForm } from "@/components/tasks/new-task-form";

export default function NewTaskPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-sm uppercase tracking-[0.16em] text-muted-foreground">
          Nueva tarea
        </p>
        <h1 className="text-2xl font-semibold text-white md:text-3xl">
          Configura un scraper
        </h1>
        <p className="text-sm text-muted-foreground">
          Selecciona las fuentes, define nicho y ciudad. Se ejecuta en background.
        </p>
      </div>
      <NewTaskForm />
    </div>
  );
}

"use client";

import * as React from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

type TaskStatus = "pending" | "running" | "completed" | "failed" | "warning" | "ignored";

type TaskRow = {
  id: string;
  fullId: string;
  searchTerm: string;
  location: string;
  status: TaskStatus;
  reviewReason?: string | null;
  sources: string[];
  leads: number;
  createdAt: string;
};

const statusTone: Record<
  TaskStatus,
  { label: string; className: string; dotClass: string }
> = {
  pending: {
    label: "Pendiente",
    className: "border-amber-400/60 bg-amber-500/10 text-amber-100",
    dotClass: "bg-amber-400",
  },
  running: {
    label: "Procesando",
    className: "border-sky-400/60 bg-sky-500/10 text-sky-50",
    dotClass: "bg-sky-400",
  },
  completed: {
    label: "Completada",
    className: "border-emerald-500/70 bg-emerald-500/10 text-emerald-50",
    dotClass: "bg-emerald-400",
  },
  warning: {
    label: "Revisar",
    className: "border-orange-500/70 bg-orange-500/10 text-orange-50",
    dotClass: "bg-orange-400",
  },
  failed: {
    label: "Fallida",
    className: "border-red-500/70 bg-red-500/10 text-red-50",
    dotClass: "bg-red-400",
  },
  ignored: {
    label: "Ignorada",
    className: "border-slate-500/70 bg-slate-500/10 text-slate-50",
    dotClass: "bg-slate-400",
  },
};

const demoTasks: TaskRow[] = [
  {
    id: "T-2048",
    fullId: "T-2048",
    searchTerm: "Pizzerías",
    location: "Madrid, ES",
    status: "completed",
    sources: ["Google", "Yelp", "Manta"],
    leads: 126,
    createdAt: "Hace 4h",
  },
  {
    id: "T-2047",
    fullId: "T-2047",
    searchTerm: "Clínicas dentales",
    location: "Ciudad de México",
    status: "running",
    sources: ["Google", "MapQuest"],
    leads: 78,
    createdAt: "Hace 10m",
  },
  {
    id: "T-2046",
    fullId: "T-2046",
    searchTerm: "Coffee shops",
    location: "Austin, TX",
    status: "pending",
    sources: ["Yelp", "Manta", "Google"],
    leads: 0,
    createdAt: "Hace 6m",
  },
  {
    id: "T-2045",
    fullId: "T-2045",
    searchTerm: "Hoteles boutique",
    location: "Buenos Aires",
    status: "failed",
    sources: ["Yelp", "MapQuest"],
    leads: 0,
    createdAt: "Hace 1h",
  },
];

function StatusBadge({ status }: { status: TaskStatus }) {
  const tone = statusTone[status];

  return (
    <Badge
      variant="outline"
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium",
        tone.className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", tone.dotClass)} />
      {tone.label}
    </Badge>
  );
}

function Sources({ sources }: { sources: string[] }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {sources.map((source) => (
        <Badge
          key={source}
          variant="outline"
          className="border-white/10 bg-white/[0.04] text-[11px]"
        >
          {source}
        </Badge>
      ))}
    </div>
  );
}

export function TasksTable() {
  const [tasks, setTasks] = React.useState<TaskRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const router = useRouter();

  const fetchTasks = React.useCallback(async () => {
    try {
      const response = await fetch("/api/tasks");
      if (!response.ok) {
        throw new Error("Failed to fetch tasks");
      }
      const data = await response.json();

      // Map Supabase fields to TaskRow structure
      const mappedTasks: TaskRow[] = data.map((t: any) => ({
        id: t.id.substring(0, 8), // Short ID for display
        fullId: t.id,
        searchTerm: t.keyword,
        location: t.location,
        status: t.status as TaskStatus,
        reviewReason: t.review_reason,
        sources: t.sources || [],
        leads: t.leads_count || 0,
        createdAt: new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }));

      setTasks(mappedTasks);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Async error");
    } finally {
      setLoading(false);
    }
  }, []);

  const updateTaskStatus = async (taskId: string, newStatus: TaskStatus) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to update status");

      fetchTasks();
    } catch (err) {
      alert("Error actualizando estado: " + (err instanceof Error ? err.message : "Error desconocido"));
    }
  };

  const downloadCSV = async (taskId: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/export`);
      if (!response.ok) throw new Error("Export failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `leads-${taskId.substring(0, 8)}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert("Error exportando CSV: " + (err instanceof Error ? err.message : "Error desconocido"));
    }
  };

  React.useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 15000); // Refresh every 15s
    return () => clearInterval(interval);
  }, [fetchTasks]);

  const columns = React.useMemo<ColumnDef<TaskRow>[]>(
    () => [
      {
        accessorKey: "searchTerm",
        header: "Búsqueda",
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-white">{row.original.searchTerm}</p>
            <p className="text-xs text-muted-foreground">
              {row.original.location}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: "Estado",
        cell: ({ row }) => (
          <div className="space-y-1">
            <StatusBadge status={row.original.status} />
            {row.original.status === "warning" && (
              <p className="max-w-[150px] text-[10px] italic leading-tight text-orange-300 opacity-80">
                {row.original.reviewReason}
              </p>
            )}
          </div>
        ),
      },
      {
        accessorKey: "sources",
        header: "Fuentes",
        cell: ({ row }) => <Sources sources={row.original.sources} />,
      },
      {
        accessorKey: "leads",
        header: "Leads",
        cell: ({ row }) => (
          <div className="font-semibold text-white">{row.original.leads}</div>
        ),
      },
      {
        accessorKey: "createdAt",
        header: "Creado",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.createdAt}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            {row.original.status === "warning" ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 border-emerald-500/50 text-[10px] text-emerald-300 hover:bg-emerald-500/10"
                  onClick={() => updateTaskStatus(row.original.fullId, "completed")}
                >
                  Confirmar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-[10px] text-muted-foreground"
                  onClick={() => updateTaskStatus(row.original.fullId, "ignored")}
                >
                  Ignorar
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-[11px] text-emerald-300 hover:bg-emerald-500/10 hover:text-emerald-200"
                  onClick={() => downloadCSV(row.original.fullId)}
                  disabled={row.original.leads === 0}
                >
                  Exportar CSV
                  <ArrowUpRight className="ml-1 h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-[11px] text-muted-foreground"
                  onClick={() => router.push(`/leads?taskId=${row.original.fullId}`)}
                >
                  Detalles
                </Button>
              </>
            )}
          </div>
        ),
      },
    ],
    [],
  );

  const table = useReactTable({
    data: tasks,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="overflow-hidden rounded-2xl border border-border/70 bg-black/40 shadow-[0_20px_50px_-35px_rgba(0,0,0,0.85)]">
      <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-white">Tareas recientes</p>
          <p className="text-xs text-muted-foreground">
            {loading ? "Actualizando cola..." : "Procesamiento asíncrono en la cola de scraping."}
          </p>
        </div>
        <Badge variant="outline" className="border-white/10 text-xs">
          Auto-refresh 15s
        </Badge>
      </div>

      {error && (
        <div className="p-4 text-center text-sm text-red-400">
          Error al cargar tareas: {error}
        </div>
      )}

      {!loading && tasks.length === 0 && !error && (
        <div className="p-10 text-center text-sm text-muted-foreground">
          No hay tareas en la cola. ¡Lanza tu primer scraper!
        </div>
      )}

      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id} className="text-xs uppercase">
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id} className="hover:bg-white/[0.03]">
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

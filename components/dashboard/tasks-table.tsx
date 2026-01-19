"use client";

import * as React from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  RowSelectionState,
} from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowUpRight, Trash2, Download, FileSpreadsheet, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { formatTaskDate } from "@/lib/task-utils";

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

interface ExportRecord {
  taskIds: string[];
  exportedAt: string;
  leadsCount: number;
  filename: string;
}

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

// Helper to get export history from localStorage
function getExportHistory(): ExportRecord[] {
  if (typeof window === "undefined") return [];
  const history = localStorage.getItem("exportHistory");
  return history ? JSON.parse(history) : [];
}

// Helper to save export history to localStorage
function saveExportHistory(records: ExportRecord[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem("exportHistory", JSON.stringify(records));
}

// Check if tasks have been exported before
function checkPreviousExport(taskIds: string[]): ExportRecord | null {
  const history = getExportHistory();
  const sortedIds = [...taskIds].sort().join(",");
  
  return history.find(record => {
    const recordIds = [...record.taskIds].sort().join(",");
    return recordIds === sortedIds;
  }) || null;
}

// Add export record
function addExportRecord(taskIds: string[], leadsCount: number, filename: string) {
  const history = getExportHistory();
  const newRecord: ExportRecord = {
    taskIds,
    exportedAt: new Date().toISOString(),
    leadsCount,
    filename,
  };
  history.unshift(newRecord);
  // Keep only last 100 records
  saveExportHistory(history.slice(0, 100));
}

export function TasksTable() {
  const [tasks, setTasks] = React.useState<TaskRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  const [exporting, setExporting] = React.useState(false);
  const [showDuplicateWarning, setShowDuplicateWarning] = React.useState(false);
  const [duplicateExportInfo, setDuplicateExportInfo] = React.useState<ExportRecord | null>(null);
  const [pendingExport, setPendingExport] = React.useState<string[] | null>(null);

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
        createdAt: formatTaskDate(t.created_at),
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

  const deleteTask = async (taskId: string, leadsCount: number) => {
    const confirmMessage = leadsCount > 0
      ? `¿Estás seguro de eliminar esta tarea? Los ${leadsCount} leads asociados se conservarán y no se contarán como duplicados en futuros scrapes.`
      : "¿Estás seguro de eliminar esta tarea?";
    
    if (!confirm(confirmMessage)) return;

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "DELETE",
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to delete task");

      fetchTasks();
    } catch (err) {
      alert("Error eliminando tarea: " + (err instanceof Error ? err.message : "Error desconocido"));
    }
  };

  // Get selected task IDs
  const selectedTaskIds = React.useMemo(() => {
    return Object.keys(rowSelection)
      .filter(key => rowSelection[key])
      .map(index => tasks[parseInt(index)]?.fullId)
      .filter(Boolean);
  }, [rowSelection, tasks]);

  // Get total leads count for selected tasks
  const selectedLeadsCount = React.useMemo(() => {
    return Object.keys(rowSelection)
      .filter(key => rowSelection[key])
      .reduce((sum, index) => sum + (tasks[parseInt(index)]?.leads || 0), 0);
  }, [rowSelection, tasks]);

  // Bulk export function
  const handleBulkExport = async (taskIds: string[], skipDuplicateCheck = false) => {
    if (taskIds.length === 0) return;

    // Check for previous export
    if (!skipDuplicateCheck) {
      const previousExport = checkPreviousExport(taskIds);
      if (previousExport) {
        setDuplicateExportInfo(previousExport);
        setPendingExport(taskIds);
        setShowDuplicateWarning(true);
        return;
      }
    }

    setExporting(true);
    try {
      const response = await fetch("/api/tasks/bulk-export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskIds }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Export failed");
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get("Content-Disposition");
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch ? filenameMatch[1] : `leads-bulk-${Date.now()}.xlsx`;

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // Save export record
      addExportRecord(taskIds, selectedLeadsCount, filename);

      // Clear selection
      setRowSelection({});
    } catch (err) {
      alert("Error exportando: " + (err instanceof Error ? err.message : "Error desconocido"));
    } finally {
      setExporting(false);
      setShowDuplicateWarning(false);
      setPendingExport(null);
      setDuplicateExportInfo(null);
    }
  };

  // Handle duplicate warning response
  const handleDuplicateResponse = (proceed: boolean) => {
    if (proceed && pendingExport) {
      handleBulkExport(pendingExport, true);
    } else {
      setShowDuplicateWarning(false);
      setPendingExport(null);
      setDuplicateExportInfo(null);
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
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Seleccionar todo"
            className="border-white/30"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Seleccionar fila"
            className="border-white/30"
            disabled={row.original.leads === 0}
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
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
            ) : row.original.status === "failed" ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-[11px] text-red-400 hover:bg-red-500/10 hover:text-red-300"
                  onClick={() => deleteTask(row.original.fullId, row.original.leads)}
                >
                  <Trash2 className="mr-1 h-3 w-3" />
                  Eliminar
                </Button>
                {row.original.leads > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-[11px] text-emerald-300 hover:bg-emerald-500/10 hover:text-emerald-200"
                    onClick={() => downloadCSV(row.original.fullId)}
                  >
                    Exportar CSV
                    <ArrowUpRight className="ml-1 h-3 w-3" />
                  </Button>
                )}
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
    onRowSelectionChange: setRowSelection,
    state: {
      rowSelection,
    },
    enableRowSelection: (row) => row.original.leads > 0,
  });

  return (
    <div className="overflow-hidden rounded-2xl border border-border/70 bg-black/40 shadow-[0_20px_50px_-35px_rgba(0,0,0,0.85)]">
      {/* Duplicate Export Warning Modal */}
      {showDuplicateWarning && duplicateExportInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-xl border border-amber-500/30 bg-zinc-900 p-6 shadow-2xl">
            <div className="mb-4 flex items-center gap-3 text-amber-400">
              <AlertTriangle className="h-6 w-6" />
              <h3 className="text-lg font-semibold">Exportación duplicada</h3>
            </div>
            <p className="mb-2 text-sm text-zinc-300">
              Estas tareas ya fueron exportadas anteriormente:
            </p>
            <div className="mb-4 rounded-lg bg-zinc-800/50 p-3 text-xs text-zinc-400">
              <p><strong>Fecha:</strong> {new Date(duplicateExportInfo.exportedAt).toLocaleString()}</p>
              <p><strong>Archivo:</strong> {duplicateExportInfo.filename}</p>
              <p><strong>Leads:</strong> {duplicateExportInfo.leadsCount}</p>
            </div>
            <p className="mb-4 text-sm text-zinc-400">
              ¿Deseas exportar de nuevo o cancelar?
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 border-zinc-700"
                onClick={() => handleDuplicateResponse(false)}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 bg-amber-600 hover:bg-amber-700"
                onClick={() => handleDuplicateResponse(true)}
              >
                Exportar de nuevo
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-white">Tareas recientes</p>
          <p className="text-xs text-muted-foreground">
            {loading ? "Actualizando cola..." : "Procesamiento asíncrono en la cola de scraping."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedTaskIds.length > 0 && (
            <Button
              size="sm"
              className="gap-2 bg-emerald-600 hover:bg-emerald-700"
              onClick={() => handleBulkExport(selectedTaskIds)}
              disabled={exporting}
            >
              <FileSpreadsheet className="h-4 w-4" />
              {exporting ? "Exportando..." : `Exportar ${selectedTaskIds.length} tareas (${selectedLeadsCount} leads)`}
            </Button>
          )}
          <Badge variant="outline" className="border-white/10 text-xs">
            Auto-refresh 15s
          </Badge>
        </div>
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
            <TableRow 
              key={row.id} 
              className={cn(
                "hover:bg-white/[0.03]",
                row.getIsSelected() && "bg-emerald-500/10"
              )}
            >
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {selectedTaskIds.length > 0 && (
        <div className="border-t border-border/70 bg-emerald-500/5 px-4 py-2 text-xs text-emerald-300">
          {selectedTaskIds.length} tarea(s) seleccionada(s) • {selectedLeadsCount} leads totales
        </div>
      )}
    </div>
  );
}

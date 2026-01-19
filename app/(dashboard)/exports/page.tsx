"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download, FileSpreadsheet, Trash2, RefreshCw } from "lucide-react";

interface ExportRecord {
  taskIds: string[];
  exportedAt: string;
  leadsCount: number;
  filename: string;
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

export default function ExportsPage() {
  const [exportHistory, setExportHistory] = React.useState<ExportRecord[]>([]);
  const [reExporting, setReExporting] = React.useState<string | null>(null);

  React.useEffect(() => {
    setExportHistory(getExportHistory());
  }, []);

  const clearHistory = () => {
    if (confirm("¿Estás seguro de eliminar todo el historial de exportaciones?")) {
      saveExportHistory([]);
      setExportHistory([]);
    }
  };

  const deleteRecord = (index: number) => {
    const newHistory = [...exportHistory];
    newHistory.splice(index, 1);
    saveExportHistory(newHistory);
    setExportHistory(newHistory);
  };

  const reExport = async (record: ExportRecord) => {
    setReExporting(record.exportedAt);
    try {
      const response = await fetch("/api/tasks/bulk-export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskIds: record.taskIds }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Export failed");
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get("Content-Disposition");
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch ? filenameMatch[1] : `leads-reexport-${Date.now()}.csv`;

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert("Error re-exportando: " + (err instanceof Error ? err.message : "Error desconocido"));
    } finally {
      setReExporting(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.16em] text-muted-foreground">
            Exportaciones
          </p>
          <h1 className="text-2xl font-semibold text-white">
            Historial de exportaciones
          </h1>
          <p className="text-sm text-muted-foreground">
            Registro de todas las exportaciones realizadas. Puedes re-exportar o eliminar registros.
          </p>
        </div>
        {exportHistory.length > 0 && (
          <Button variant="outline" className="gap-2" onClick={clearHistory}>
            <Trash2 className="h-4 w-4" />
            Limpiar historial
          </Button>
        )}
      </div>

      <Card className="border-border/70 bg-black/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <FileSpreadsheet className="h-5 w-5" />
            Exportaciones recientes
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {exportHistory.length === 0
              ? "No hay exportaciones registradas. Selecciona tareas en la página de tareas para exportar."
              : `${exportHistory.length} exportación(es) en el historial`}
          </p>
        </CardHeader>
        <CardContent>
          {exportHistory.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <FileSpreadsheet className="mx-auto mb-3 h-12 w-12 opacity-30" />
              <p>No hay exportaciones en el historial</p>
              <p className="mt-1 text-xs">
                Ve a la página de tareas, selecciona las que deseas exportar y haz clic en "Exportar"
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs uppercase">Fecha</TableHead>
                  <TableHead className="text-xs uppercase">Archivo</TableHead>
                  <TableHead className="text-xs uppercase">Tareas</TableHead>
                  <TableHead className="text-xs uppercase">Leads</TableHead>
                  <TableHead className="text-xs uppercase text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exportHistory.map((record, index) => (
                  <TableRow key={record.exportedAt} className="hover:bg-white/[0.03]">
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(record.exportedAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs text-white">
                        {record.filename}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-white/10 text-xs">
                        {record.taskIds.length} tarea(s)
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold text-emerald-400">
                        {record.leadsCount}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-[11px] text-emerald-300 hover:bg-emerald-500/10"
                          onClick={() => reExport(record)}
                          disabled={reExporting === record.exportedAt}
                        >
                          {reExporting === record.exportedAt ? (
                            <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
                          ) : (
                            <Download className="mr-1 h-3 w-3" />
                          )}
                          Re-exportar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-[11px] text-red-400 hover:bg-red-500/10"
                          onClick={() => deleteRecord(index)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-black/40">
        <CardHeader>
          <CardTitle className="text-white">Sincronización CRM</CardTitle>
          <p className="text-sm text-muted-foreground">
            Conecta tus credenciales de CRM para exportar leads válidos.
          </p>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="border-amber-500/30 text-amber-300">
              Próximamente
            </Badge>
            <span>Integración con Salesforce y HubSpot en desarrollo.</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

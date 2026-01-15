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

type TaskStatus = "pending" | "running" | "completed" | "failed";

type TaskRow = {
  id: string;
  searchTerm: string;
  location: string;
  status: TaskStatus;
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
  failed: {
    label: "Fallida",
    className: "border-red-500/70 bg-red-500/10 text-red-50",
    dotClass: "bg-red-400",
  },
};

const demoTasks: TaskRow[] = [
  {
    id: "T-2048",
    searchTerm: "Pizzerías",
    location: "Madrid, ES",
    status: "completed",
    sources: ["Google", "Yelp", "Manta"],
    leads: 126,
    createdAt: "Hace 4h",
  },
  {
    id: "T-2047",
    searchTerm: "Clínicas dentales",
    location: "Ciudad de México",
    status: "running",
    sources: ["Google", "MapQuest"],
    leads: 78,
    createdAt: "Hace 10m",
  },
  {
    id: "T-2046",
    searchTerm: "Coffee shops",
    location: "Austin, TX",
    status: "pending",
    sources: ["Yelp", "Manta", "Google"],
    leads: 0,
    createdAt: "Hace 6m",
  },
  {
    id: "T-2045",
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
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
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
        cell: () => (
          <Button variant="ghost" size="sm" className="gap-2 text-sm">
            Ver detalles
            <ArrowUpRight className="h-4 w-4" />
          </Button>
        ),
      },
    ],
    [],
  );

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: demoTasks,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="overflow-hidden rounded-2xl border border-border/70 bg-black/40 shadow-[0_20px_50px_-35px_rgba(0,0,0,0.85)]">
      <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-white">Tareas recientes</p>
          <p className="text-xs text-muted-foreground">
            Procesamiento asíncrono en la cola de scraping.
          </p>
        </div>
        <Badge variant="outline" className="border-white/10 text-xs">
          Auto-refresh 15s
        </Badge>
      </div>
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

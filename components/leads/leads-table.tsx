"use client";

import * as React from "react";
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    getSortedRowModel,
    getFilteredRowModel,
    useReactTable,
    SortingState,
} from "@tanstack/react-table";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Search, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type LeadRow = {
    id: string;
    name: string;
    phone: string | null;
    website: string | null;
    category: string | null;
    address: string | null;
    source: string;
    businessProfile: string | null;
    createdAt: string;
    createdAtRaw: string; // Used for accurate sorting
};

interface LeadsTableProps {
    taskId?: string | null;
}

export function LeadsTable({ taskId }: LeadsTableProps) {
    const [data, setData] = React.useState<LeadRow[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);
    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = React.useState("");

    const fetchLeads = React.useCallback(async () => {
        try {
            setLoading(true);
            let url = "/api/leads";
            if (taskId) {
                url += `?taskId=${taskId}`;
            }
            const response = await fetch(url);
            if (!response.ok) throw new Error("Failed to fetch leads");
            const json = await response.json();

            const mapped = json.map((l: any) => ({
                id: l.id.toString(),
                name: l.name,
                phone: l.phone,
                website: l.website,
                category: l.category,
                address: l.address,
                source: l.source,
                businessProfile: l.business_profile,
                createdAt: new Date(l.created_at).toLocaleDateString(),
                createdAtRaw: l.created_at,
            }));

            setData(mapped);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error unknown");
        } finally {
            setLoading(false);
        }
    }, [taskId]);

    React.useEffect(() => {
        fetchLeads();
    }, [fetchLeads]);

    const columns = React.useMemo<ColumnDef<LeadRow>[]>(
        () => [
            {
                accessorKey: "name",
                header: ({ column }) => (
                    <button
                        className="flex items-center gap-1 hover:text-white"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Compañía
                        {column.getIsSorted() === "asc" ? (
                            <ArrowUp className="h-3 w-3" />
                        ) : column.getIsSorted() === "desc" ? (
                            <ArrowDown className="h-3 w-3" />
                        ) : (
                            <ArrowUpDown className="h-3 w-3 opacity-30" />
                        )}
                    </button>
                ),
                cell: ({ row }) => (
                    <div className="font-medium text-white">{row.original.name}</div>
                ),
            },
            {
                accessorKey: "phone",
                header: "Teléfono",
                cell: ({ row }) => (
                    <span className="text-muted-foreground">{row.original.phone || "N/A"}</span>
                ),
            },
            {
                accessorKey: "website",
                header: "Website",
                cell: ({ row }) => (
                    row.original.website ? (
                        <a
                            href={row.original.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-emerald-400 hover:underline"
                        >
                            Link <ExternalLink className="h-3 w-3" />
                        </a>
                    ) : "-"
                ),
            },
            {
                accessorKey: "businessProfile",
                header: "Profile Business",
                cell: ({ row }) => (
                    row.original.businessProfile ? (
                        <a
                            href={row.original.businessProfile}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-sky-400 hover:underline"
                        >
                            Profile <ExternalLink className="h-3 w-3" />
                        </a>
                    ) : "-"
                ),
            },
            {
                accessorKey: "category",
                header: ({ column }) => (
                    <button
                        className="flex items-center gap-1 hover:text-white"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Categoría
                        {column.getIsSorted() === "asc" ? <ArrowUp className="h-3 w-3" /> : column.getIsSorted() === "desc" ? <ArrowDown className="h-3 w-3" /> : <ArrowUpDown className="h-3 w-3 opacity-30" />}
                    </button>
                ),
                cell: ({ row }) => (
                    <Badge variant="outline" className="text-[10px]">
                        {row.original.category || "General"}
                    </Badge>
                ),
            },
            {
                accessorKey: "address",
                header: "Dirección",
                cell: ({ row }) => (
                    <p className="max-w-[200px] truncate text-xs text-muted-foreground">
                        {row.original.address || "-"}
                    </p>
                ),
            },
            {
                accessorKey: "createdAtRaw",
                header: ({ column }) => (
                    <button
                        className="flex items-center gap-1 hover:text-white"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Fecha
                        {column.getIsSorted() === "asc" ? <ArrowUp className="h-3 w-3" /> : column.getIsSorted() === "desc" ? <ArrowDown className="h-3 w-3" /> : <ArrowUpDown className="h-3 w-3 opacity-30" />}
                    </button>
                ),
                cell: ({ row }) => (
                    <span className="text-xs text-muted-foreground">{row.original.createdAt}</span>
                ),
            },
        ],
        [],
    );

    const table = useReactTable({
        data,
        columns,
        state: {
            sorting,
            globalFilter,
        },
        onSortingChange: setSorting,
        onGlobalFilterChange: setGlobalFilter,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
    });

    return (
        <div className="space-y-4">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    placeholder="Filtrar por cualquier medio (nombre, categoría, tlf, dirección)..."
                    value={globalFilter ?? ""}
                    onChange={(e) => setGlobalFilter(e.target.value)}
                    className="pl-9 bg-black/20 border-border/50 text-white"
                />
            </div>

            <div className="overflow-hidden rounded-xl border border-border/70 bg-black/40">
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
                                                header.getContext()
                                            )}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-24 text-center">
                                    Cargando leads...
                                </TableCell>
                            </TableRow>
                        ) : table.getRowModel().rows.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                                    No se encontraron leads.
                                </TableCell>
                            </TableRow>
                        ) : (
                            table.getRowModel().rows.map((row) => (
                                <TableRow key={row.id}>
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id}>
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
            <div className="flex items-center justify-end space-x-2 text-xs text-muted-foreground p-1">
                {table.getFilteredRowModel().rows.length} leads encontrados
            </div>
        </div>
    );
}

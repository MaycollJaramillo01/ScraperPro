import { NextResponse } from "next/server";
import { getServiceRoleClient } from "@/lib/supabase";
import { hasPhone } from "@/lib/lead-utils";

const LATINO_MARKERS = [
    "espanol",
    "se habla espanol",
    "hablamos espanol",
    "bilingue",
    "latino",
    "latina",
    "hispano",
    "hispana",
];

function isLatinoProbable(fields: Array<string | null | undefined>): boolean {
    const haystack = fields
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
    return LATINO_MARKERS.some((marker) => haystack.includes(marker));
}

async function tagTaskAsExported(taskId: string) {
    const supabase = getServiceRoleClient();
    const { data: task } = await supabase
        .from("scrape_tasks")
        .select("id,notes")
        .eq("id", taskId)
        .maybeSingle();

    if (!task) return;

    const notes = typeof task.notes === "string" ? task.notes : "";
    if (notes.toLowerCase().includes("exportada")) return;

    const nextNotes = notes ? `${notes} | exportada` : "exportada";
    await supabase.from("scrape_tasks").update({ notes: nextNotes }).eq("id", taskId);
}

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const taskId = (await params).id;

    try {
        const supabase = getServiceRoleClient();

        // Fetch leads for this task
        const { data: leads, error } = await supabase
            .from("leads")
            .select("*")
            .eq("task_id", taskId);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Generate CSV content
        const BOM = "\uFEFF";
        const delimiter = ";";
        const headers = [
            "Nombre",
            "Telefono",
            "Email",
            "Sitio Web",
            "Direccion",
            "Ciudad",
            "Region",
            "Codigo Postal",
            "Pais",
            "Categoria",
            "Fuente",
            "URL Fuente",
            "Fecha Creacion",
            "Latino probable",
        ];

        interface Lead {
            name?: string;
            phone?: string;
            email?: string;
            website?: string;
            street?: string;
            city?: string;
            region?: string;
            postal_code?: string;
            address?: string;
            country?: string;
            category?: string;
            source?: string;
            source_url?: string;
            created_at?: string;
        }

        const rows = ((leads as Lead[]) || [])
            .filter((lead) => hasPhone(lead.phone || null))
            .map((lead) => [
            lead.name || "",
            lead.phone || "",
            lead.email || "",
            lead.website || "",
            lead.address || lead.street || "",
            lead.city || "",
            lead.region || "",
            lead.postal_code || "",
            lead.country || "",
            lead.category || "",
            lead.source || "",
            lead.source_url || "",
            lead.created_at ? new Date(lead.created_at).toLocaleString() : "",
            isLatinoProbable([
                lead.name,
                lead.category,
                lead.website,
                lead.source_url,
            ])
                ? "Si"
                : "No",
        ]);

        const escapeCSV = (value: string) => {
            if (
                value.includes(delimiter) ||
                value.includes('"') ||
                value.includes("\n")
            ) {
                return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
        };

        const csvContent =
            BOM +
            headers.map(escapeCSV).join(delimiter) +
            "\n" +
            rows.map((row) => row.map(escapeCSV).join(delimiter)).join("\n");

        void tagTaskAsExported(taskId).catch((err) => {
            console.error("Failed to tag exported task", err);
        });

        // Return as downloadable file
        return new Response(csvContent, {
            headers: {
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition": `attachment; filename="leads-${taskId.substring(0, 8)}.csv"`,
            },
        });
    } catch (error) {
        console.error("Export failed", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Unknown error" },
            { status: 500 }
        );
    }
}

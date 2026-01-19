import { NextResponse } from "next/server";
import { getServiceRoleClient } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const { taskIds } = await request.json();

    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
      return NextResponse.json(
        { error: "taskIds array is required" },
        { status: 400 }
      );
    }

    const supabase = getServiceRoleClient();

    // Fetch all leads for the selected tasks
    const { data: leads, error } = await supabase
      .from("leads")
      .select("*")
      .in("task_id", taskIds)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!leads || leads.length === 0) {
      return NextResponse.json(
        { error: "No leads found for the selected tasks" },
        { status: 404 }
      );
    }

    // Create Excel-compatible CSV with BOM for proper UTF-8 encoding
    const BOM = "\uFEFF";
    const delimiter = ";";
    const headers = [
      "Nombre",
      "Teléfono",
      "Email",
      "Sitio Web",
      "Dirección",
      "Ciudad",
      "Región",
      "Código Postal",
      "País",
      "Categoría",
      "Fuente",
      "URL Fuente",
      "Fecha Creación",
    ];

    const rows = leads.map((lead: any) => [
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
    ]);

    // Escape CSV values
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
      rows.map((row: string[]) => row.map(escapeCSV).join(delimiter)).join("\n");

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const filename = `leads-bulk-${taskIds.length}tasks-${timestamp}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Bulk export error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

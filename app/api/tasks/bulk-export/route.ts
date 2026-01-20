import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { getServiceRoleClient } from "@/lib/supabase";
import { hasPhone } from "@/lib/lead-utils";

export const runtime = "nodejs";

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

    const rows = (leads || [])
      .filter((lead: any) => hasPhone(lead.phone || null))
      .map((lead: any) => [
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

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "ScraperPro";
    workbook.created = new Date();

    const chunkSize = 500;
    const totalChunks = Math.max(1, Math.ceil(rows.length / chunkSize));

    for (let i = 0; i < totalChunks; i += 1) {
      const start = i * chunkSize;
      const chunk = rows.slice(start, start + chunkSize);
      const sheet = workbook.addWorksheet(`Leads ${i + 1}`);

      sheet.addRow(headers);
      if (chunk.length > 0) {
        sheet.addRows(chunk);
      }

      sheet.getRow(1).font = { bold: true };
      sheet.columns = headers.map(() => ({ width: 22 }));
    }

    const workbookBuffer = await workbook.xlsx.writeBuffer();

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const filename = `leads-bulk-${taskIds.length}tasks-${timestamp}.xlsx`;

    return new NextResponse(Buffer.from(workbookBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename=\"${filename}\"`,
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

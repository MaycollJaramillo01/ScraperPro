import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { getServiceRoleClient } from "@/lib/supabase";
import { hasPhone } from "@/lib/lead-utils";

export const runtime = "nodejs";

const SHEET_NAMES = [
  "Alicia",
  "Roberto",
  "Hellen",
  "Sarai",
  "Alejandra",
  "Camilo",
  "Gerson",
  "Faviola",
];

const LATINO_MARKERS = [
  "espanol",
  "español",
  "se habla espanol",
  "se habla español",
  "hablamos espanol",
  "hablamos español",
  "bilingue",
  "bilingüe",
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

async function tagTasksAsExported(taskIds: string[]) {
  if (!taskIds.length) return;
  const supabase = getServiceRoleClient();
  const { data: tasks } = await supabase
    .from("scrape_tasks")
    .select("id,notes")
    .in("id", taskIds);

  if (!tasks || tasks.length === 0) return;

  await Promise.all(
    tasks.map((task) => {
      const notes = typeof task.notes === "string" ? task.notes : "";
      if (notes.toLowerCase().includes("exportada")) {
        return Promise.resolve();
      }
      const nextNotes = notes ? `${notes} | exportada` : "exportada";
      return supabase.from("scrape_tasks").update({ notes: nextNotes }).eq("id", task.id);
    }),
  );
}

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

    const batchSize = 1000;
    let offset = 0;
    let leads: any[] = [];

    while (true) {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .in("task_id", taskIds)
        .order("created_at", { ascending: false })
        .range(offset, offset + batchSize - 1);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      if (!data || data.length === 0) {
        break;
      }

      leads = leads.concat(data);

      if (data.length < batchSize) {
        break;
      }

      offset += batchSize;
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
      "Latino probable",
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
      isLatinoProbable([
        lead.name,
        lead.category,
        lead.website,
        lead.source_url,
      ])
        ? "Si"
        : "No",
    ]);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "ScraperPro";
    workbook.created = new Date();

    const chunkSize = 500;
    const totalChunks = Math.max(1, Math.ceil(rows.length / chunkSize));

    const sheetCounts: Record<string, number> = {};

    for (let i = 0; i < totalChunks; i += 1) {
      const start = i * chunkSize;
      const chunk = rows.slice(start, start + chunkSize);
      const baseName = SHEET_NAMES[i % SHEET_NAMES.length];
      sheetCounts[baseName] = (sheetCounts[baseName] || 0) + 1;
      const sheetName = sheetCounts[baseName] > 1
        ? `${baseName} ${sheetCounts[baseName]}`
        : baseName;
      const sheet = workbook.addWorksheet(sheetName);

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

    void tagTasksAsExported(taskIds).catch((err) => {
      console.error("Failed to tag exported tasks", err);
    });

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

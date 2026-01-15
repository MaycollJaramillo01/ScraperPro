import { NextResponse } from "next/server";
import { getServiceRoleClient } from "@/lib/supabase";

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

        if (!leads || leads.length === 0) {
            return NextResponse.json({ error: "No leads found for this task" }, { status: 404 });
        }

        // Generate CSV content
        const headers = [
            "Name",
            "Phone",
            "Website",
            "Street",
            "City",
            "Region",
            "Postal Code",
            "Address",
            "Category",
            "Source URL",
            "Source",
            "Profile Business",
        ];

        interface Lead {
            name?: string;
            phone?: string;
            website?: string;
            street?: string;
            city?: string;
            region?: string;
            postal_code?: string;
            address?: string;
            category?: string;
            source_url?: string;
            source?: string;
            business_profile?: string;
        }

        const csvRows = (leads as Lead[]).map((lead) => [
            `"${(lead.name || "").replace(/"/g, '""')}"`,
            `"${(lead.phone || "").replace(/"/g, '""')}"`,
            `"${(lead.website || "").replace(/"/g, '""')}"`,
            `"${(lead.street || "").replace(/"/g, '""')}"`,
            `"${(lead.city || "").replace(/"/g, '""')}"`,
            `"${(lead.region || "").replace(/"/g, '""')}"`,
            `"${(lead.postal_code || "").replace(/"/g, '""')}"`,
            `"${(lead.address || "").replace(/"/g, '""')}"`,
            `"${(lead.category || "").replace(/"/g, '""')}"`,
            `"${(lead.source_url || "").replace(/"/g, '""')}"`,
            `"${(lead.source || "").replace(/"/g, '""')}"`,
            `"${(lead.business_profile || "").replace(/"/g, '""')}"`,
        ]);

        const csvContent = [headers.join(","), ...csvRows.map((row) => row.join(","))].join("\n");

        // Return as downloadable file
        return new Response(csvContent, {
            headers: {
                "Content-Type": "text/csv",
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

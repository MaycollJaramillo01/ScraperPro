import { NextResponse } from "next/server";
import { getServiceRoleClient } from "@/lib/supabase";

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const taskId = (await params).id;
    const { status } = await request.json();

    if (!status) {
        return NextResponse.json({ error: "status is required" }, { status: 400 });
    }

    try {
        const supabase = getServiceRoleClient();

        const { error } = await supabase
            .from("scrape_tasks")
            .update({ status } as any)
            .eq("id", taskId);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, status });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Unknown error" },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const taskId = (await params).id;

    try {
        const supabase = getServiceRoleClient();

        // First, update leads to remove the task_id reference
        // This keeps the leads in the database so they won't be counted as duplicates
        // in future scrapes (the duplicate check is based on phone/name/address)
        const { error: leadsError } = await supabase
            .from("leads")
            .update({ task_id: null } as any)
            .eq("task_id", taskId);

        if (leadsError) {
            console.error("Error updating leads:", leadsError);
            // Continue with deletion even if leads update fails
        }

        // Now delete the task
        const { error: taskError } = await supabase
            .from("scrape_tasks")
            .delete()
            .eq("id", taskId);

        if (taskError) {
            return NextResponse.json({ error: taskError.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: "Task deleted successfully" });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Unknown error" },
            { status: 500 }
        );
    }
}

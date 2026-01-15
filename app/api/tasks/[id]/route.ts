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

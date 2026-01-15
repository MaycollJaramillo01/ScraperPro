import { NextResponse } from "next/server";
import { getServiceRoleClient } from "@/lib/supabase";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get("taskId");

    try {
        const supabase = getServiceRoleClient();
        let query = supabase.from("leads").select("*");

        if (taskId) {
            query = query.eq("task_id", taskId);
        }

        const { data, error } = await query.order("created_at", { ascending: false }).limit(2000);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Unknown error" },
            { status: 500 }
        );
    }
}

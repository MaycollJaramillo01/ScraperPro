import { NextResponse } from "next/server";
import { getServiceRoleClient } from "@/lib/supabase";
import { getPendingLoginRequests } from "@/lib/auth-notifications";
import { ADMIN_EMAIL } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    // Verify admin access
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getServiceRoleClient();
    const token = authHeader.replace("Bearer ", "");
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const { data: userData } = await supabase
      .from("users")
      .select("role, email")
      .eq("id", user.id)
      .single();

    if (userData?.role !== "admin" && userData?.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const requests = getPendingLoginRequests();

    return NextResponse.json({ requests });
  } catch (error) {
    console.error("Error getting login requests:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}


import { NextResponse } from "next/server";
import { getServiceRoleClient } from "@/lib/supabase";
import { approveUser } from "@/lib/auth";
import { updateLoginRequestStatus } from "@/lib/auth-notifications";
import { ADMIN_EMAIL } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { userId, requestId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 },
      );
    }

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

    // Approve user
    const result = await approveUser(userId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 },
      );
    }

    // Update login request status if provided
    if (requestId) {
      updateLoginRequestStatus(requestId, "approved");
    }

    return NextResponse.json({
      success: true,
      message: "User approved successfully",
    });
  } catch (error) {
    console.error("Error approving user:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}


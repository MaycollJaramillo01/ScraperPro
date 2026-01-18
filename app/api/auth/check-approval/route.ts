import { NextResponse } from "next/server";
import { getServiceRoleClient } from "@/lib/supabase";
import { isUserApproved } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { userId, email } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 },
      );
    }

    const approved = await isUserApproved(userId);

    return NextResponse.json({ approved });
  } catch (error) {
    console.error("Error checking approval:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}


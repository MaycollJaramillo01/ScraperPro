import { NextResponse } from "next/server";
import { getServiceRoleClient } from "@/lib/supabase";
import { getUserByEmail, isAdminEmail } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { userId, email } = await request.json();

    if (!userId || !email) {
      return NextResponse.json(
        { error: "User ID and email are required" },
        { status: 400 },
      );
    }

    const supabase = getServiceRoleClient();

    // First check if user exists in users table
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("approved, role")
      .eq("id", userId)
      .single();

    if (userError || !userData) {
      // User doesn't exist in users table, create them
      const isAdmin = isAdminEmail(email);
      const newUser = {
        id: userId,
        email: email.toLowerCase(),
        role: isAdmin ? "admin" : "user",
        approved: isAdmin, // Admin is auto-approved
        created_at: new Date().toISOString(),
      };

      const { data: insertedUser, error: insertError } = await supabase
        .from("users")
        .insert([newUser])
        .select("approved, role")
        .single();

      if (insertError) {
        console.error("Error creating user:", insertError);
        return NextResponse.json(
          { error: "Failed to create user record" },
          { status: 500 },
        );
      }

      return NextResponse.json({
        approved: insertedUser.approved || insertedUser.role === "admin",
        role: insertedUser.role,
      });
    }

    // User exists, check if approved
    const approved = userData.role === "admin" || userData.approved === true;

    return NextResponse.json({
      approved,
      role: userData.role,
    });
  } catch (error) {
    console.error("Error checking approval:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}


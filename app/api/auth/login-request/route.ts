import { NextResponse } from "next/server";
import { createLoginRequest } from "@/lib/auth-notifications";
import { headers } from "next/headers";

export async function POST(request: Request) {
  try {
    const { email, userId } = await request.json();

    if (!email || !userId) {
      return NextResponse.json(
        { error: "Email and user ID are required" },
        { status: 400 },
      );
    }

    const headersList = await headers();
    const ipAddress = headersList.get("x-forwarded-for") || 
                     headersList.get("x-real-ip") || 
                     "unknown";
    const userAgent = headersList.get("user-agent") || "unknown";

    const requestId = await createLoginRequest(email, ipAddress, userAgent);

    return NextResponse.json({
      success: true,
      requestId,
      message: "Login request created and admin notified",
    });
  } catch (error) {
    console.error("Error creating login request:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}


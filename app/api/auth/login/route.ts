import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email y contraseña son requeridos" },
        { status: 400 }
      );
    }

    const validEmail = process.env.AUTH_USER_EMAIL;
    const validPassword = process.env.AUTH_USER_PASSWORD;

    if (!validEmail || !validPassword) {
      return NextResponse.json(
        { error: "Autenticación no configurada" },
        { status: 500 }
      );
    }

    // Check credentials
    if (
      email.toLowerCase().trim() === validEmail.toLowerCase() &&
      password === validPassword
    ) {
      // Create a simple session token
      const sessionToken = Buffer.from(
        JSON.stringify({
          email: email.toLowerCase().trim(),
          role: "admin",
          exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
        })
      ).toString("base64");

      // Set cookie
      const cookieStore = await cookies();
      cookieStore.set("session", sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60, // 7 days
        path: "/",
      });

      return NextResponse.json({
        success: true,
        user: {
          email: email.toLowerCase().trim(),
          role: "admin",
        },
      });
    }

    return NextResponse.json(
      { error: "Credenciales inválidas" },
      { status: 401 }
    );
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error desconocido" },
      { status: 500 }
    );
  }
}

import { cookies } from "next/headers";

export interface SessionData {
  email: string;
  role: "admin" | "user";
  exp: number;
}

export async function getSession(): Promise<SessionData | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session");

    if (!sessionCookie?.value) {
      return null;
    }

    const decoded = Buffer.from(sessionCookie.value, "base64").toString("utf-8");
    const session = JSON.parse(decoded) as SessionData;

    // Check if session is expired
    if (session.exp < Date.now()) {
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();
  return session !== null;
}

export async function isAdmin(): Promise<boolean> {
  const session = await getSession();
  return session?.role === "admin";
}

export async function getCurrentUser(): Promise<{ email: string; role: string } | null> {
  const session = await getSession();
  if (!session) return null;
  
  return {
    email: session.email,
    role: session.role,
  };
}

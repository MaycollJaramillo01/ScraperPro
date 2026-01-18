"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pendingApproval, setPendingApproval] = React.useState(false);

  const redirectTo = searchParams.get("redirect") || "/";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setPendingApproval(false);

    try {
      const supabase = getSupabaseClient();

      // Sign in with email and password
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password,
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      if (!authData.user) {
        setError("Error al iniciar sesión. Por favor intenta de nuevo.");
        setLoading(false);
        return;
      }

      // Check if user needs approval
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("approved, role")
        .eq("id", authData.user.id)
        .single();

      if (userError || !userData) {
        // User doesn't exist in users table, create login request
        const response = await fetch("/api/auth/check-approval", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: authData.user.id, email: email.toLowerCase().trim() }),
        });

        const result = await response.json();

        if (!result.approved) {
          // Create login request notification
          await fetch("/api/auth/login-request", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: email.toLowerCase().trim(),
              userId: authData.user.id,
            }),
          });

          setPendingApproval(true);
          setLoading(false);
          return;
        }
        return;
      }

      // If user is admin or approved, redirect
      if (userData.role === "admin" || userData.approved) {
        router.push(redirectTo);
        router.refresh();
      } else {
        // User needs approval
        setPendingApproval(true);
        
        // Create login request notification
        await fetch("/api/auth/login-request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: email.toLowerCase().trim(),
            userId: authData.user.id,
          }),
        });
      }

    setLoading(false);
  } catch (err) {
    setError(err instanceof Error ? err.message : "Error desconocido");
    setLoading(false);
  }
};

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md border-border/70 bg-black/40 backdrop-blur">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-semibold text-white">ScraperPro</CardTitle>
          <CardDescription className="text-muted-foreground">
            Inicia sesión para acceder al sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingApproval ? (
            <div className="space-y-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
              <div className="flex items-center gap-2 text-amber-200">
                <AlertCircle className="h-5 w-5" />
                <h3 className="font-semibold">Solicitud de acceso pendiente</h3>
              </div>
              <p className="text-sm text-amber-100/80">
                Tu solicitud de acceso ha sido enviada al administrador. 
                Recibirás una notificación cuando tu cuenta sea aprobada.
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setPendingApproval(false);
                  setEmail("");
                  setPassword("");
                }}
                className="w-full"
              >
                Intentar de nuevo
              </Button>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              {error && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className="bg-white/5"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground">
                  Contraseña
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="bg-white/5"
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Iniciando sesión...
                  </>
                ) : (
                  "Iniciar sesión"
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, LogOut } from "lucide-react";

export default function PendingApprovalPage() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      const supabase = getSupabaseClient();
      await supabase.auth.signOut();
      router.push("/login");
    } catch (error) {
      console.error("Error logging out:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md border-border/70 bg-black/40 backdrop-blur">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-semibold text-white">
            Acceso pendiente de aprobación
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Tu cuenta está esperando la aprobación del administrador
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-400 mt-0.5" />
              <div className="space-y-2">
                <p className="text-sm font-medium text-amber-200">
                  Solicitud enviada
                </p>
                <p className="text-sm text-amber-100/80">
                  El administrador ha sido notificado de tu solicitud de acceso. 
                  Recibirás una notificación cuando tu cuenta sea aprobada.
                </p>
              </div>
            </div>
          </div>

          <Button
            variant="outline"
            onClick={handleLogout}
            disabled={loading}
            className="w-full gap-2"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}


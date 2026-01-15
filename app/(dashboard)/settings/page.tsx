import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function SettingsPage() {
  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm uppercase tracking-[0.16em] text-muted-foreground">
          Ajustes
        </p>
        <h1 className="text-2xl font-semibold text-white">Workspace</h1>
        <p className="text-sm text-muted-foreground">
          Configura API keys y permisos por equipo.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-border/70 bg-black/40">
          <CardHeader>
            <CardTitle className="text-white">API externa</CardTitle>
            <p className="text-sm text-muted-foreground">
              Usa este espacio para guardar la API key del servicio Python/SerpApi.
            </p>
          </CardHeader>
          <CardContent className="flex items-center justify-between rounded-lg border border-border/60 bg-white/[0.02] px-3 py-2 text-sm text-muted-foreground">
            <span>Placeholder: .env.local o bóveda segura</span>
            <Badge variant="outline" className="border-emerald-500/50">
              Pendiente
            </Badge>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-black/40">
          <CardHeader>
            <CardTitle className="text-white">Usuarios</CardTitle>
            <p className="text-sm text-muted-foreground">
              Define roles para operaciones de scraping y exportaciones.
            </p>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Placeholder: agrega auth/roles en /app/(auth) e integra con
            Supabase/Prisma.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

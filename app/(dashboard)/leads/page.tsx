import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function LeadsPage() {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.16em] text-muted-foreground">
            Data explorer
          </p>
          <h1 className="text-2xl font-semibold text-white">Leads</h1>
          <p className="text-sm text-muted-foreground">
            Tabla avanzada lista para miles de filas con TanStack Table.
          </p>
        </div>
        <Button variant="outline">Exportar CSV</Button>
      </div>

      <Card className="border-border/70 bg-black/40">
        <CardHeader>
          <CardTitle className="text-white">Exploración de datos</CardTitle>
          <p className="text-sm text-muted-foreground">
            Conecta la API de scraping para poblar esta vista.
          </p>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Placeholder listo para integrar con la API REST de leads (Supabase/Prisma).
        </CardContent>
      </Card>
    </div>
  );
}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export default function ExportsPage() {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.16em] text-muted-foreground">
            Exportaciones
          </p>
          <h1 className="text-2xl font-semibold text-white">
            CSV y sincronización
          </h1>
          <p className="text-sm text-muted-foreground">
            Prepara entregas a Salesforce / HubSpot o descargas en CSV.
          </p>
        </div>
        <Button className="gap-2">
          <Download className="h-4 w-4" />
          Descargar CSV
        </Button>
      </div>

      <Card className="border-border/70 bg-black/40">
        <CardHeader>
          <CardTitle className="text-white">Sincronización</CardTitle>
          <p className="text-sm text-muted-foreground">
            Conecta tus credenciales de CRM para exportar leads válidos.
          </p>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Placeholder: agrega integración con Salesforce/HubSpot una vez que el
          backend esté listo. El layout soporta acciones asincrónicas.
        </CardContent>
      </Card>
    </div>
  );
}

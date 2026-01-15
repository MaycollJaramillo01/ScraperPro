import { TasksTable } from "@/components/dashboard/tasks-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowUpRight,
  Clock4,
  Rocket,
  ShieldCheck,
  Signal,
} from "lucide-react";

const stats = [
  {
    title: "Créditos disponibles",
    value: "1,200",
    helper: "+180 usados hoy",
    icon: ShieldCheck,
  },
  {
    title: "Tareas en curso",
    value: "3",
    helper: "Cola estable (12s)",
    icon: Clock4,
  },
  {
    title: "Leads validados",
    value: "4,380",
    helper: "+340 esta semana",
    icon: Signal,
  },
  {
    title: "Integraciones",
    value: "Salesforce · HubSpot",
    helper: "Sincronización activa",
    icon: Rocket,
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm uppercase tracking-[0.16em] text-muted-foreground">
            Panorama general
          </p>
          <h1 className="text-2xl font-semibold leading-tight text-white md:text-3xl">
            Dashboard de scraping
          </h1>
          <p className="text-sm text-muted-foreground">
            Monitorea créditos, tareas en background y exportaciones recientes.
          </p>
        </div>
        <Badge
          variant="outline"
          className="border-white/10 bg-white/[0.04] text-xs"
        >
          Arquitectura lista para API externa de scraping
        </Badge>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Card
            key={stat.title}
            className="border-border/70 bg-black/40 backdrop-blur"
          >
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
              <div>
                <p className="text-xs uppercase text-muted-foreground">
                  {stat.title}
                </p>
                <CardTitle className="mt-1 text-lg font-semibold text-white">
                  {stat.value}
                </CardTitle>
              </div>
              <div className="rounded-full border border-border/60 bg-white/[0.04] p-2">
                <stat.icon className="h-4 w-4 text-emerald-300" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <ArrowUpRight className="h-4 w-4 text-emerald-300" />
                {stat.helper}
              </p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.25fr_1fr]">
        <Card className="border-border/70 bg-gradient-to-br from-white/[0.04] via-transparent to-emerald-500/[0.06]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <div>
              <p className="text-sm font-semibold text-white">
                Pipeline de scraping
              </p>
              <p className="text-xs text-muted-foreground">
                Google Maps · Yelp · MapQuest · Manta
              </p>
            </div>
            <Badge variant="secondary" className="text-xs">
              Async queue
            </Badge>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Cada tarea corre en background. Cuando termine, notificamos y
              podrás explorar los leads normalizados en la tabla avanzada.
            </p>
            <p className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-emerald-100">
              Status API externo: listo para conectar (REST). Placeholder de
              cola y webhooks ya modelado.
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-black/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-white">
              Checklist de la cuenta
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Siguiente paso: lanza una tarea y exporta a tu CRM.
            </p>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-center justify-between rounded-lg border border-border/70 bg-white/[0.02] px-3 py-2">
              <div>
                <p className="text-white">Definir nicho y ubicación</p>
                <p className="text-xs text-muted-foreground">
                  Ej. “Pizzerías, Madrid”
                </p>
              </div>
              <Badge variant="outline" className="border-emerald-500/50">
                Listo
              </Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/70 bg-white/[0.02] px-3 py-2">
              <div>
                <p className="text-white">Seleccionar fuentes</p>
                <p className="text-xs text-muted-foreground">
                  Google, Yelp, Manta, MapQuest
                </p>
              </div>
              <Badge variant="outline" className="border-emerald-500/50">
                Listo
              </Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/70 bg-white/[0.02] px-3 py-2">
              <div>
                <p className="text-white">Sincronizar CRM</p>
                <p className="text-xs text-muted-foreground">
                  Salesforce / HubSpot ready
                </p>
              </div>
              <Badge variant="outline" className="border-white/20">
                Próximo
              </Badge>
            </div>
          </CardContent>
        </Card>
      </section>

      <TasksTable />
    </div>
  );
}

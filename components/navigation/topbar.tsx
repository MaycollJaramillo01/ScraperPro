import Link from "next/link";
import { MobileNav } from "@/components/navigation/mobile-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Bell, CircleUserRound, Download } from "lucide-react";

export function Topbar() {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border/70 bg-black/30 px-4 py-3 backdrop-blur">
      <div className="flex items-center gap-3">
        <MobileNav />
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
            Pipeline
          </p>
          <p className="text-sm font-semibold text-white">
            Inteligencia de Leads
          </p>
        </div>
        <Separator orientation="vertical" className="hidden h-6 lg:block" />
        <Badge
          variant="outline"
          className="hidden items-center gap-1 border-emerald-500/40 text-emerald-300 lg:inline-flex"
        >
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          Cola estable
        </Badge>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="hidden sm:inline-flex">
          <Bell className="h-4 w-4" />
          <span className="sr-only">Notificaciones</span>
        </Button>
        <Button variant="outline" size="sm" className="gap-2" asChild>
          <Link href="/exports">
            <Download className="h-4 w-4" />
            Exportar CSV
          </Link>
        </Button>
        <Button size="sm" className="gap-2" asChild>
          <Link href="/tasks/new">Nueva tarea</Link>
        </Button>
        <div className="flex items-center gap-2 rounded-full border border-border/60 px-3 py-1 text-sm text-muted-foreground">
          <CircleUserRound className="h-4 w-4" />
          Equipo RevOps
        </div>
      </div>
    </header>
  );
}

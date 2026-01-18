"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItems } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sparkles } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase-client";

export function Sidebar() {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const checkAdmin = async () => {
      try {
        const supabase = getSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          const { data: userData } = await supabase
            .from("users")
            .select("role")
            .eq("id", user.id)
            .single();
          
          setIsAdmin(userData?.role === "admin" || false);
        }
      } catch (error) {
        console.error("Error checking admin status:", error);
      } finally {
        setLoading(false);
      }
    };

    checkAdmin();
  }, []);

  return (
    <aside className="hidden border-r border-border/70 bg-black/40 backdrop-blur lg:flex lg:w-64 xl:w-72">
      <div className="flex w-full flex-col gap-6 px-4 py-6">
        <div className="flex items-center justify-between px-2">
          <div>
            <p className="text-lg font-semibold tracking-tight">ScraperPro</p>
            <p className="text-xs text-muted-foreground">Lead intelligence</p>
          </div>
          <Badge variant="secondary" className="px-2 py-0.5 text-[11px]">
            BETA
          </Badge>
        </div>

        <nav className="space-y-1">
          {navItems
            .filter((item) => !item.adminOnly || isAdmin)
            .map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.title}
                  href={item.href}
                  className={cn(
                    "group flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-all duration-150",
                    "hover:bg-white/5 hover:text-foreground",
                    isActive
                      ? "bg-white/[0.08] text-white shadow-[0_0_0_1px_rgba(255,255,255,0.08)]"
                      : "text-muted-foreground",
                  )}
                >
                  <span className="flex items-center gap-3">
                    <item.icon className="h-4 w-4" />
                    {item.title}
                  </span>
                  {item.badge ? (
                    <Badge
                      variant={isActive ? "default" : "outline"}
                      className="rounded-full px-2 py-0 text-[10px]"
                    >
                      {item.badge}
                    </Badge>
                  ) : null}
                </Link>
              );
            })}
        </nav>

        <Separator className="border-border/70" />

        <div className="space-y-3 rounded-2xl border border-border/80 bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-4 shadow-[0_10px_40px_-24px_rgba(0,0,0,0.75)]">
          <div className="flex items-center justify-between text-sm">
            <p className="text-muted-foreground">Créditos</p>
            <span className="text-xs text-emerald-400">+240 hoy</span>
          </div>
          <div className="flex items-baseline justify-between">
            <div>
              <p className="text-2xl font-semibold leading-none">1,200</p>
              <p className="text-xs text-muted-foreground">Disponibles</p>
            </div>
            <Badge variant="outline" className="border-emerald-500/40 text-xs">
              Equipo Growth
            </Badge>
          </div>
          <Button size="sm" className="w-full gap-2">
            <Sparkles className="h-4 w-4" />
            Comprar más
          </Button>
        </div>
      </div>
    </aside>
  );
}

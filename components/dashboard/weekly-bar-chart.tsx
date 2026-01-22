"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface WeeklyBarPoint {
  weekStart: string;
  count: number;
}

interface WeeklyBarChartProps {
  data: WeeklyBarPoint[];
  title: string;
  subtitle?: string;
  className?: string;
}

export function WeeklyBarChart({ data, title, subtitle, className }: WeeklyBarChartProps) {
  if (!data || data.length === 0) {
    return (
      <div
        className={cn(
          "flex flex-col gap-4 p-6 rounded-2xl border border-border/70 bg-black/40 backdrop-blur",
          className
        )}
      >
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <div className="h-48 flex items-center justify-center text-muted-foreground text-xs">
          Sin datos suficientes para mostrar tendencias.
        </div>
      </div>
    );
  }

  const maxValue = Math.max(...data.map(item => item.count), 1);
  const lastIndex = data.length - 1;
  const gridLevels = [0, 0.25, 0.5, 0.75, 1];

  const formatShort = (weekStart: string) => {
    const date = new Date(weekStart);
    return date.toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-4 p-6 rounded-2xl border border-border/70 bg-black/40 backdrop-blur shadow-xl",
        className
      )}
    >
      <div>
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>

      <div className="relative h-52">
        <div className="absolute inset-0 flex flex-col justify-between">
          {gridLevels.map((level) => (
            <div key={level} className="flex items-center gap-2">
              <div className="h-px flex-1 bg-white/5" />
              <span className="w-10 text-[10px] text-muted-foreground text-right">
                {Math.round(maxValue * level).toLocaleString()}
              </span>
            </div>
          ))}
        </div>

        <div className="relative z-10 flex items-end gap-3 h-full pt-6">
          {data.map((item, index) => {
          const height = Math.max(6, Math.round((item.count / maxValue) * 100));
          const isLast = index === lastIndex;
          const showValue = item.count > 0 || isLast;
          const barColor = isLast ? "from-emerald-400 to-emerald-600" : "from-emerald-500/80 to-emerald-500/50";
          const barGlow = isLast ? "shadow-[0_0_20px_rgba(16,185,129,0.35)]" : "shadow-[0_0_10px_rgba(16,185,129,0.2)]";
          return (
            <div key={item.weekStart} className="flex-1 h-full flex flex-col items-center justify-end gap-2">
              {showValue && (
                <div className="px-2 py-0.5 rounded-full bg-white/10 text-[10px] text-white/80">
                  {item.count.toLocaleString()}
                </div>
              )}
              <div className="w-full h-full flex items-end">
                <div
                  className={cn(
                    "w-full rounded-full bg-gradient-to-b transition-all duration-500",
                    barColor,
                    barGlow,
                    item.count === 0 ? "opacity-50" : "opacity-90"
                  )}
                  style={{ height: `${height}%` }}
                  title={`${item.count.toLocaleString()} leads`}
                />
              </div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
                {formatShort(item.weekStart)}
              </div>
            </div>
          );
          })}
        </div>
      </div>
    </div>
  );
}

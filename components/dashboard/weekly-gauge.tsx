"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface WeeklyGaugeProps {
  current: number;
  target: number;
  title: string;
  subtitle?: string;
  className?: string;
}

export function WeeklyGauge({
  current,
  target,
  title,
  subtitle,
  className,
}: WeeklyGaugeProps) {
  const safeTarget = Math.max(target, 1);
  const rawProgress = current / safeTarget;
  const clamped = Math.min(Math.max(rawProgress, 0), 1);
  const angle = -90 + 180 * clamped;
  const percent = Math.round(rawProgress * 100);

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

      <div className="relative flex items-center justify-center h-52">
        <svg viewBox="0 0 200 120" className="h-full w-full">
          <defs>
            <linearGradient id="gaugeGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
          </defs>

          {/* Background arc */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="18"
            strokeLinecap="round"
            pathLength={1}
          />

          {/* Progress arc */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="url(#gaugeGradient)"
            strokeWidth="18"
            strokeLinecap="round"
            pathLength={1}
            style={{
              strokeDasharray: "1",
              strokeDashoffset: `${1 - clamped}`,
              transition: "stroke-dashoffset 600ms ease",
            }}
          />

          {/* Needle */}
          <g transform={`rotate(${angle} 100 100)`}>
            <circle cx="100" cy="100" r="6" fill="rgba(16,185,129,0.9)" />
            <rect x="100" y="98" width="62" height="4" rx="2" fill="rgba(16,185,129,0.9)" />
          </g>
        </svg>

        <div className="absolute bottom-2 flex flex-col items-center">
          <div className="text-3xl font-semibold text-white">
            {current.toLocaleString()}
          </div>
          <div className="text-xs text-muted-foreground">
            {percent}% de la meta
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>0</span>
        <span>{Math.round(safeTarget * 0.5).toLocaleString()}</span>
        <span>{safeTarget.toLocaleString()}</span>
      </div>
    </div>
  );
}

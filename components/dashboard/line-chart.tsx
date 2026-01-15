"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface DataPoint {
    date: string;
    sources: Record<string, number>;
}

interface LineChartProps {
    data: DataPoint[];
    title: string;
    subtitle?: string;
    className?: string;
}

export function LineChart({ data, title, subtitle, className }: LineChartProps) {
    if (!data || data.length === 0) {
        return (
            <div className={cn("flex flex-col gap-4 p-6 rounded-2xl border border-border/70 bg-black/40 backdrop-blur", className)}>
                <h3 className="text-sm font-semibold text-white">{title}</h3>
                <div className="h-48 flex items-center justify-center text-muted-foreground text-xs">
                    Sin datos suficientes para mostrar tendencias.
                </div>
            </div>
        );
    }

    const sources = Array.from(new Set(data.flatMap(d => Object.keys(d.sources))));
    const sourceColors: Record<string, string> = {
        "Yellow Pages": "#fbbf24", // amber
        "Google Maps": "#ef4444",   // red
        "Yelp": "#f97316",          // orange
        "Manta": "#3b82f6",         // blue
        "MapQuest": "#10b981",      // emerald
    };

    // Calcular escalas
    const maxValue = Math.max(...data.flatMap(d => Object.values(d.sources)), 10) * 1.2;
    const width = 500;
    const height = 200;
    const padding = 20;

    const getX = (index: number) => padding + (index * (width - 2 * padding)) / (data.length - 1 || 1);
    const getY = (value: number) => height - padding - (value * (height - 2 * padding)) / maxValue;

    return (
        <div className={cn("flex flex-col gap-4 p-6 rounded-2xl border border-border/70 bg-black/40 backdrop-blur shadow-xl", className)}>
            <div>
                <h3 className="text-sm font-semibold text-white">{title}</h3>
                {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
            </div>

            <div className="relative flex items-center justify-center py-2 overflow-hidden">
                <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-48 overflow-visible">
                    {/* Grid Lines */}
                    {[0, 0.25, 0.5, 0.75, 1].map((p, i) => (
                        <line
                            key={i}
                            x1={padding}
                            y1={getY(maxValue * p)}
                            x2={width - padding}
                            y2={getY(maxValue * p)}
                            className="stroke-white/5"
                            strokeWidth="1"
                        />
                    ))}

                    {/* Lines for each source */}
                    {sources.map((source) => {
                        const pathData = data.map((d, i) => {
                            const val = d.sources[source] || 0;
                            return `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(val)}`;
                        }).join(" ");

                        const color = sourceColors[source] || "#fff";

                        return (
                            <React.Fragment key={source}>
                                {/* Line path */}
                                <path
                                    d={pathData}
                                    fill="none"
                                    stroke={color}
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="opacity-80 transition-all duration-[2000ms]"
                                    style={{
                                        filter: `drop-shadow(0 0 6px ${color}33)`,
                                        strokeDasharray: "1000",
                                        strokeDashoffset: "0",
                                        animation: "draw 2s ease-out forwards"
                                    }}
                                />
                                {/* Data points */}
                                {data.map((d, i) => (
                                    <circle
                                        key={i}
                                        cx={getX(i)}
                                        cy={getY(d.sources[source] || 0)}
                                        r="2.5"
                                        fill={color}
                                        className="transition-all hover:r-4 cursor-pointer"
                                    />
                                ))}
                            </React.Fragment>
                        );
                    })}

                    <style>{`
                        @keyframes draw {
                            from { stroke-dashoffset: 1000; }
                            to { stroke-dashoffset: 0; }
                        }
                    `}</style>

                    {/* X Axis Labels */}
                    {data.map((d, i) => {
                        if (i % (data.length > 5 ? 2 : 1) !== 0) return null;
                        const dateObj = new Date(d.date);
                        const label = `${dateObj.getDate()}/${dateObj.getMonth() + 1}`;
                        return (
                            <text
                                key={i}
                                x={getX(i)}
                                y={height - 2}
                                textAnchor="middle"
                                className="fill-muted-foreground text-[10px]"
                            >
                                {label}
                            </text>
                        );
                    })}
                </svg>
            </div>

            <div className="flex flex-wrap gap-4 mt-2">
                {sources.map((source) => (
                    <div key={source} className="flex items-center gap-2">
                        <div
                            className="h-1.5 w-6 rounded-full"
                            style={{ backgroundColor: sourceColors[source] || "#fff" }}
                        />
                        <span className="text-[10px] text-muted-foreground">
                            {source}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

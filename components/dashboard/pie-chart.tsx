"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface PieChartData {
    label: string;
    value: number;
    color: string;
}

interface PieChartProps {
    data: PieChartData[];
    title: string;
    subtitle?: string;
    className?: string;
}

export function PieChart({ data, title, subtitle, className }: PieChartProps) {
    const total = data.reduce((acc, curr) => acc + curr.value, 0);
    let cumulativePercent = 0;

    const getCoordinatesForPercent = (percent: number) => {
        const x = Math.cos(2 * Math.PI * percent);
        const y = Math.sin(2 * Math.PI * percent);
        return [x, y];
    };

    return (
        <div className={cn("flex flex-col gap-4 p-6 rounded-2xl border border-border/70 bg-black/40 backdrop-blur shadow-xl", className)}>
            <div>
                <h3 className="text-sm font-semibold text-white">{title}</h3>
                {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
            </div>

            <div className="relative flex items-center justify-center py-4">
                <svg viewBox="-1 -1 2 2" className="h-48 w-48 -rotate-90">
                    {data.map((slice, i) => {
                        const [startX, startY] = getCoordinatesForPercent(cumulativePercent);
                        cumulativePercent += slice.value / total;
                        const [endX, endY] = getCoordinatesForPercent(cumulativePercent);

                        const largeArcFlag = slice.value / total > 0.5 ? 1 : 0;

                        const pathData = [
                            `M ${startX} ${startY}`,
                            `A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY}`,
                            "L 0 0",
                        ].join(" ");

                        return (
                            <path
                                key={i}
                                d={pathData}
                                fill={slice.color}
                                tabIndex={-1}
                                className="transition-all duration-300 hover:opacity-80 cursor-pointer outline-none select-none active:outline-none focus:outline-none"
                                style={{ stroke: "rgba(0,0,0,0.1)", strokeWidth: "0.01" }}
                            />
                        );
                    })}
                    {/* Inner circle for Donut effect */}
                    <circle cx="0" cy="0" r="0.65" className="fill-black/90" />

                    <text
                        x="0"
                        y="0"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="fill-white font-bold text-[0.2px] pointer-events-none"
                        transform="rotate(90)"
                    >
                        {total}
                    </text>
                </svg>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-2">
                {data.map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                        <div
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: item.color }}
                        />
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                            {item.label} ({Math.round((item.value / total) * 100)}%)
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

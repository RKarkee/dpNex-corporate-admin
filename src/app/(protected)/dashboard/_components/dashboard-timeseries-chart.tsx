"use client";

import * as React from "react";
import { LineChart } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { EmptyState } from "@/shared/components/empty-state";
import type { DashboardTimeseriesPoint } from "../types";

/**
 * Trend-over-time chart for the dashboard's `timeseries` array.
 *
 * The endpoint has returned an empty array in every response seen so far, so
 * this shape is unconfirmed — the reader below is deliberately defensive: it
 * looks for the first string-ish field as the x-axis label and up to three
 * numeric fields as series, rather than assuming fixed key names. When the
 * array is empty (the only case observed in practice) this renders a quiet
 * placeholder instead of an empty plot.
 *
 * Built per the dataviz skill: one shared axis (never dual-axis), thin 2px
 * lines with rounded data-ends, a legend whenever there's more than one
 * series, a hover crosshair + tooltip, and the app's own three-tone palette
 * (navy/crimson/orange — the same series identity `StatCard` already uses)
 * standing in for the skill's generic categorical slots.
 */

const SERIES_COLORS = [
  "var(--color-primary)",
  "var(--color-brand-crimson)",
  "var(--color-brand-orange)",
];

function isNumeric(value: unknown): value is number {
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "string" && value.trim() !== "") return Number.isFinite(Number(value));
  return false;
}

function toNumber(value: unknown): number {
  return typeof value === "number" ? value : Number(value);
}

function detectSeries(points: DashboardTimeseriesPoint[]) {
  const first = points[0];
  if (!first) return { labelKey: null as string | null, seriesKeys: [] as string[] };

  const keys = Object.keys(first);
  const labelKey =
    keys.find((key) => /date|day|period|label|month|week/i.test(key)) ??
    keys.find((key) => typeof first[key] === "string");
  const seriesKeys = keys
    .filter((key) => key !== labelKey && points.every((point) => isNumeric(point[key])))
    .slice(0, 3);

  return { labelKey: labelKey ?? null, seriesKeys };
}

export function DashboardTimeseriesChart({ points }: { points: DashboardTimeseriesPoint[] }) {
  const [hoverIndex, setHoverIndex] = React.useState<number | null>(null);
  const { labelKey, seriesKeys } = React.useMemo(() => detectSeries(points), [points]);
  const hoverPoint = hoverIndex !== null ? points[hoverIndex] : undefined;

  if (points.length === 0 || !labelKey || seriesKeys.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Trend</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <EmptyState
            icon={LineChart}
            title="No trend data for this period"
            description="A trend chart will appear here once the report starts returning time-series data."
          />
        </CardContent>
      </Card>
    );
  }

  const width = 720;
  const height = 260;
  const padding = { top: 12, right: 16, bottom: 28, left: 44 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  const values = seriesKeys.flatMap((key) => points.map((point) => toNumber(point[key])));
  const maxValue = Math.max(...values, 0);
  const minValue = Math.min(...values, 0);
  const range = maxValue - minValue || 1;

  const xFor = (index: number) =>
    padding.left + (points.length === 1 ? innerWidth / 2 : (index / (points.length - 1)) * innerWidth);
  const yFor = (value: number) => padding.top + innerHeight - ((value - minValue) / range) * innerHeight;

  const gridLines = 4;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle>Trend</CardTitle>
        <div className="flex flex-wrap items-center gap-4">
          {seriesKeys.map((key, index) => (
            <div key={key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span
                className="size-2.5 rounded-full"
                style={{ backgroundColor: SERIES_COLORS[index % SERIES_COLORS.length] }}
              />
              {key.replace(/[_-]+/g, " ")}
            </div>
          ))}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full"
          onMouseLeave={() => setHoverIndex(null)}
        >
          {Array.from({ length: gridLines + 1 }).map((_, index) => {
            const y = padding.top + (index / gridLines) * innerHeight;
            return (
              <line
                key={index}
                x1={padding.left}
                x2={width - padding.right}
                y1={y}
                y2={y}
                stroke="var(--color-border)"
                strokeWidth={1}
              />
            );
          })}

          {seriesKeys.map((key, seriesIndex) => {
            const path = points
              .map((point, index) => `${index === 0 ? "M" : "L"}${xFor(index)},${yFor(toNumber(point[key]))}`)
              .join(" ");
            return (
              <path
                key={key}
                d={path}
                fill="none"
                stroke={SERIES_COLORS[seriesIndex % SERIES_COLORS.length]}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            );
          })}

          {hoverIndex !== null ? (
            <line
              x1={xFor(hoverIndex)}
              x2={xFor(hoverIndex)}
              y1={padding.top}
              y2={height - padding.bottom}
              stroke="var(--color-muted-foreground)"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
          ) : null}

          {points.map((_point, index) => (
            <rect
              key={index}
              x={xFor(index) - innerWidth / Math.max(points.length - 1, 1) / 2}
              y={padding.top}
              width={innerWidth / Math.max(points.length - 1, 1)}
              height={innerHeight}
              fill="transparent"
              onMouseEnter={() => setHoverIndex(index)}
            />
          ))}
        </svg>

        {hoverPoint ? (
          <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 rounded-lg border border-border/70 bg-secondary/50 px-3 py-2 text-xs">
            <span className="font-semibold text-foreground">
              {String(hoverPoint[labelKey])}
            </span>
            {seriesKeys.map((key, index) => (
              <span key={key} className="flex items-center gap-1.5 text-muted-foreground">
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: SERIES_COLORS[index % SERIES_COLORS.length] }}
                />
                {key.replace(/[_-]+/g, " ")}:{" "}
                <span className="font-semibold tabular-nums text-foreground">
                  {toNumber(hoverPoint[key]).toLocaleString()}
                </span>
              </span>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

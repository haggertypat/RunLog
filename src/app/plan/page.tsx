"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PLAN_ITEMS } from "@/lib/plan";
import { loadLogs } from "@/lib/storage";
import { LogEntry } from "@/lib/types";

const WEEK_ONE_START = new Date("2026-03-02"); // Monday
const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const WEEKS = 10;
const DAYS = 7;

function getDateFor(week: number, dayIndex: number): Date {
  const d = new Date(WEEK_ONE_START);
  d.setDate(d.getDate() + (week - 1) * 7 + (dayIndex - 1));
  return d;
}

function formatCellDate(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatRange(min?: number, max?: number, unit = "") {
  if (typeof min !== "number" && typeof max !== "number") return null;
  if (typeof min === "number" && typeof max === "number") return `${min}–${max}${unit}`;
  return `${typeof min === "number" ? min : max}${unit}`;
}

function formatLoggedSummary(log: LogEntry): string {
  const parts: string[] = [`Logged ${log.date}`, `RPE ${log.rpe}`];
  if (typeof log.distanceMi === "number") parts.push(`${Number(log.distanceMi.toFixed(2))} mi`);
  if (typeof log.durationMin === "number") parts.push(`${Number(log.durationMin.toFixed(0))} min`);
  return parts.join(" • ");
}

function formatTotal(value: number | null, unit: string): string {
  if (value === null) return "—";
  const rounded = Number.isInteger(value) ? value : Number(value.toFixed(1));
  return `${rounded}${unit}`;
}

export default function PlanPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    setLogs(loadLogs());
  }, []);

  const grid = useMemo(() => {
    const map = new Map<string, typeof PLAN_ITEMS>();
    for (const item of PLAN_ITEMS) {
      const key = `${item.week}-${item.dayIndex}`;
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }
    return map;
  }, []);

  const logsByPlanItemId = useMemo(() => {
    const map = new Map<string, LogEntry[]>();
    for (const log of logs) {
      if (!log.planItemId) continue;
      const list = map.get(log.planItemId) ?? [];
      list.push(log);
      map.set(log.planItemId, list);
    }
    return map;
  }, [logs]);

  const weeklyTotals = useMemo(() => {
    const map = new Map<number, {
      estimatedMiles: number;
      estimatedTime: number;
      actualMiles: number;
      actualTime: number;
    }>();

    for (let week = 1; week <= WEEKS; week += 1) {
      map.set(week, { estimatedMiles: 0, estimatedTime: 0, actualMiles: 0, actualTime: 0 });
    }

    for (const item of PLAN_ITEMS) {
      const totals = map.get(item.week);
      if (!totals) continue;

      if (typeof item.estimatedMilesMin === "number" || typeof item.estimatedMilesMax === "number") {
        const low = item.estimatedMilesMin ?? item.estimatedMilesMax ?? 0;
        const high = item.estimatedMilesMax ?? item.estimatedMilesMin ?? 0;
        totals.estimatedMiles += (low + high) / 2;
      }

      if (typeof item.estimatedTimeMin === "number" || typeof item.estimatedTimeMax === "number") {
        const low = item.estimatedTimeMin ?? item.estimatedTimeMax ?? 0;
        const high = item.estimatedTimeMax ?? item.estimatedTimeMin ?? 0;
        totals.estimatedTime += (low + high) / 2;
      }
    }

    for (const log of logs) {
      const totals = map.get(log.week);
      if (!totals) continue;
      if (typeof log.distanceMi === "number") totals.actualMiles += log.distanceMi;
      if (typeof log.durationMin === "number") totals.actualTime += log.durationMin;
    }

    return map;
  }, [logs]);

  return (
    <section className="space-y-4">
      <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-sm dark:border-stone-700 dark:bg-stone-800">
        <table className="w-full min-w-[800px] border-collapse">
          <thead>
            <tr className="border-b border-stone-200 dark:border-stone-600">
              <th className="w-16 p-2 text-left text-xs font-medium uppercase text-stone-500 dark:text-stone-400">
                Week
              </th>
              {DAY_NAMES.map((name, i) => (
                <th
                  key={name}
                  className="min-w-[140px] p-2 text-center text-xs font-medium uppercase text-stone-500 dark:text-stone-400"
                >
                  {name}
                </th>
              ))}
              <th className="min-w-[200px] p-2 text-left text-xs font-medium uppercase text-stone-500 dark:text-stone-400">
                Weekly totals
              </th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: WEEKS }, (_, i) => i + 1).map((week) => (
              <tr
                key={week}
                className="border-b border-stone-100 dark:border-stone-700 last:border-b-0"
              >
                <td className="w-16 p-2 align-top text-sm font-medium text-stone-600 dark:text-stone-300">
                  {week}
                </td>
                {Array.from({ length: DAYS }, (_, i) => i + 1).map((dayIndex) => {
                  const key = `${week}-${dayIndex}`;
                  const items = grid.get(key) ?? [];
                  const date = getDateFor(week, dayIndex+1);
                  return (
                    <td
                      key={key}
                      className="min-w-[140px] border-l border-stone-100 p-2 align-top first:border-l-0 dark:border-stone-700"
                    >
                      <div className="space-y-2">
                        <p className="text-xs text-stone-500 dark:text-stone-400">
                          {formatCellDate(date)}
                        </p>
                        {items.map((item) => (
                          (() => {
                            const itemLogs = logsByPlanItemId.get(item.id) ?? [];
                            const latestLog = itemLogs[0];
                            const isLogged = Boolean(latestLog);
                            return (
                          <Link
                            key={item.id}
                            href={`/log?planItemId=${item.id}`}
                            className={[
                              "block rounded-lg border p-3 transition hover:ring-2 hover:ring-stone-300 dark:hover:ring-stone-500",
                              isLogged
                                ? "border-green-200 bg-green-50 dark:border-green-900/60 dark:bg-green-900/10"
                                : "border-stone-200 bg-stone-50 dark:border-stone-600 dark:bg-stone-800/80",
                            ].join(" ")}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-xs uppercase text-stone-500 dark:text-stone-400">{item.type}</p>
                              {isLogged ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-green-800 dark:bg-green-900/40 dark:text-green-200">
                                  ✓ Logged
                                </span>
                              ) : null}
                            </div>
                            <h3
                              className={[
                                "mt-0.5 font-semibold",
                                isLogged
                                  ? "text-stone-600 line-through dark:text-stone-400"
                                  : "text-stone-900 dark:text-stone-100",
                              ].join(" ")}
                            >
                              {item.title}
                            </h3>
                            <p className="mt-1 line-clamp-2 text-xs text-stone-600 dark:text-stone-300">
                              {item.description ?? item.details}
                            </p>
                            {formatRange(item.estimatedMilesMin, item.estimatedMilesMax, " mi") ? (
                              <p className="mt-1 text-[11px] text-stone-500 dark:text-stone-400">
                                Miles: {formatRange(item.estimatedMilesMin, item.estimatedMilesMax, " mi")}
                              </p>
                            ) : null}
                            {formatRange(item.estimatedTimeMin, item.estimatedTimeMax, " min") ? (
                              <p className="mt-0.5 text-[11px] text-stone-500 dark:text-stone-400">
                                Time: {formatRange(item.estimatedTimeMin, item.estimatedTimeMax, " min")}
                              </p>
                            ) : null}
                            {latestLog ? (
                              <div className="mt-2 space-y-1">
                                <p className="text-xs text-green-800 dark:text-green-200">{formatLoggedSummary(latestLog)}</p>
                                <p className="text-[11px] font-medium text-stone-700 dark:text-stone-300">Edit log →</p>
                              </div>
                            ) : (
                              <p className="mt-2 inline-block rounded bg-stone-900 px-2 py-1.5 text-xs font-medium text-white dark:bg-stone-100 dark:text-stone-900">
                                Log this
                              </p>
                            )}
                          </Link>
                            );
                          })()
                        ))}
                      </div>
                    </td>
                  );
                })}
                {(() => {
                  const totals = weeklyTotals.get(week);
                  const estimatedMiles = totals?.estimatedMiles ?? null;
                  const estimatedTime = totals?.estimatedTime ?? null;
                  const actualMiles = totals?.actualMiles ?? null;
                  const actualTime = totals?.actualTime ?? null;

                  return (
                    <td className="min-w-[200px] border-l border-stone-100 bg-stone-50/70 p-3 align-top dark:border-stone-700 dark:bg-stone-900/20">
                      <p className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                        Estimated
                      </p>
                      <p className="mt-1 text-sm text-stone-700 dark:text-stone-200">
                        {formatTotal(estimatedMiles, " mi")} • {formatTotal(estimatedTime, " min")}
                      </p>
                      <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                        Actual
                      </p>
                      <p className="mt-1 text-sm text-stone-700 dark:text-stone-200">
                        {formatTotal(actualMiles, " mi")} • {formatTotal(actualTime, " min")}
                      </p>
                    </td>
                  );
                })()}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

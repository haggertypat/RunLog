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

type ViewMode = "list" | "calendar";
const PLAN_VIEW_MODE_KEY = "runlog-plan-view-mode";

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

function formatTotalRange(min: number | null, max: number | null, unit: string): string {
  if (min === null && max === null) return "—";
  if (min !== null && max !== null) {
    const low = Number.isInteger(min) ? min : Number(min.toFixed(1));
    const high = Number.isInteger(max) ? max : Number(max.toFixed(1));
    return `${low}–${high}${unit}`;
  }
  const single = min ?? max;
  return formatTotal(single, unit);
}

export default function PlanPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedWeek, setSelectedWeek] = useState(1);

  useEffect(() => {
    setLogs(loadLogs());
  }, []);

  useEffect(() => {
    const savedViewMode = window.localStorage.getItem(PLAN_VIEW_MODE_KEY);
    if (savedViewMode === "list" || savedViewMode === "calendar") {
      setViewMode(savedViewMode);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(PLAN_VIEW_MODE_KEY, viewMode);
  }, [viewMode]);

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
      estimatedMilesMin: number;
      estimatedMilesMax: number;
      estimatedTimeMin: number;
      estimatedTimeMax: number;
      actualMiles: number;
      actualTime: number;
    }>();

    for (let week = 1; week <= WEEKS; week += 1) {
      map.set(week, {
        estimatedMilesMin: 0,
        estimatedMilesMax: 0,
        estimatedTimeMin: 0,
        estimatedTimeMax: 0,
        actualMiles: 0,
        actualTime: 0,
      });
    }

    for (const item of PLAN_ITEMS) {
      const totals = map.get(item.week);
      if (!totals) continue;

      if (typeof item.estimatedMilesMin === "number" || typeof item.estimatedMilesMax === "number") {
        const low = item.estimatedMilesMin ?? item.estimatedMilesMax ?? 0;
        const high = item.estimatedMilesMax ?? item.estimatedMilesMin ?? 0;
        totals.estimatedMilesMin += low;
        totals.estimatedMilesMax += high;
      }

      if (typeof item.estimatedTimeMin === "number" || typeof item.estimatedTimeMax === "number") {
        const low = item.estimatedTimeMin ?? item.estimatedTimeMax ?? 0;
        const high = item.estimatedTimeMax ?? item.estimatedTimeMin ?? 0;
        totals.estimatedTimeMin += low;
        totals.estimatedTimeMax += high;
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

  const selectedWeekItems = useMemo(() => {
    return PLAN_ITEMS
      .filter((item) => item.week === selectedWeek)
      .sort((a, b) => a.dayIndex - b.dayIndex);
  }, [selectedWeek]);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-stone-400">Use list view for planning and quick logging.</p>
        <div className="hidden items-center gap-2 rounded-lg border border-stone-700 bg-stone-800 p-1 sm:flex">
          <button
            type="button"
            onClick={() => setViewMode("list")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
              viewMode === "list" ? "bg-stone-100 text-stone-900" : "text-stone-300 hover:text-white"
            }`}
          >
            List view
          </button>
          <button
            type="button"
            onClick={() => setViewMode("calendar")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
              viewMode === "calendar" ? "bg-stone-100 text-stone-900" : "text-stone-300 hover:text-white"
            }`}
          >
            Calendar view
          </button>
        </div>
      </div>

      {viewMode === "list" ? (
        <>
          <div className="flex items-center justify-between gap-2 rounded-xl border border-stone-700 bg-stone-800 p-3">
            <p className="text-sm font-medium text-stone-200">Week {selectedWeek}</p>
            <label className="text-xs text-stone-400">
              Jump to week
              <select
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(Number(e.target.value))}
                className="ml-2 rounded-md border border-stone-600 bg-stone-900 px-2 py-1 text-sm text-stone-100"
              >
                {Array.from({ length: WEEKS }, (_, i) => i + 1).map((week) => (
                  <option key={week} value={week}>
                    Week {week}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="space-y-3">
            {selectedWeekItems.map((item) => {
              const itemLogs = logsByPlanItemId.get(item.id) ?? [];
              const latestLog = itemLogs[0];
              const isLogged = Boolean(latestLog);
              const date = getDateFor(item.week, item.dayIndex);
              return (
                <Link
                  key={item.id}
                  href={`/log?planItemId=${item.id}`}
                  className={[
                    "block rounded-lg border p-4 transition-shadow hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 dark:focus-visible:ring-stone-500",
                    isLogged
                      ? "border-green-200 bg-green-50 dark:border-green-900/60 dark:bg-green-900/10"
                      : "border-stone-200 bg-stone-50 dark:border-stone-600 dark:bg-stone-800/80",
                  ].join(" ")}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-xs uppercase text-stone-500 dark:text-stone-400">{item.type}</p>
                      <h3
                        className={[
                          "mt-1 text-lg font-semibold",
                          isLogged
                            ? "text-stone-600 line-through dark:text-stone-400"
                            : "text-stone-900 dark:text-stone-100",
                        ].join(" ")}
                      >
                        {item.title}
                      </h3>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-stone-500 dark:text-stone-400">{DAY_NAMES[item.dayIndex - 1]} • {formatCellDate(date)}</p>
                      {isLogged ? (
                        <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-green-800 dark:bg-green-900/40 dark:text-green-200">
                          ✓ Logged
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-stone-600 dark:text-stone-300">{item.description ?? item.details}</p>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-stone-500 dark:text-stone-400">
                    {formatRange(item.estimatedMilesMin, item.estimatedMilesMax, " mi") ? (
                      <p>Miles: {formatRange(item.estimatedMilesMin, item.estimatedMilesMax, " mi")}</p>
                    ) : null}
                    {formatRange(item.estimatedTimeMin, item.estimatedTimeMax, " min") ? (
                      <p>Time: {formatRange(item.estimatedTimeMin, item.estimatedTimeMax, " min")}</p>
                    ) : null}
                  </div>
                  {latestLog ? (
                    <div className="mt-2 space-y-1">
                      <p className="text-xs text-green-800 dark:text-green-200">{formatLoggedSummary(latestLog)}</p>
                      <p className="text-[11px] font-medium text-stone-700 dark:text-stone-300">Edit log →</p>
                    </div>
                  ) : (
                    <p className="mt-3 inline-block rounded bg-stone-900 px-2 py-1.5 text-xs font-medium text-white dark:bg-stone-100 dark:text-stone-900">
                      Log this
                    </p>
                  )}
                </Link>
              );
            })}
          </div>
        </>
      ) : (
        <div className="relative left-1/2 right-1/2 w-[calc(100vw-2rem)] max-w-[88rem] -translate-x-1/2 overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-sm dark:border-stone-700 dark:bg-stone-800 sm:w-[calc(100vw-3rem)]">
          <table className="w-full min-w-[940px] border-collapse">
            <thead>
              <tr className="border-b border-stone-200 dark:border-stone-600">
                <th className="w-16 p-2 text-left text-xs font-medium uppercase text-stone-500 dark:text-stone-400">
                  Week
                </th>
                {DAY_NAMES.map((name) => (
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
                    const date = getDateFor(week, dayIndex);
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
                                "block rounded-lg border p-3 transition-shadow hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 dark:focus-visible:ring-stone-500",
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
                    const estimatedMilesMin = totals?.estimatedMilesMin ?? null;
                    const estimatedMilesMax = totals?.estimatedMilesMax ?? null;
                    const estimatedTimeMin = totals?.estimatedTimeMin ?? null;
                    const estimatedTimeMax = totals?.estimatedTimeMax ?? null;
                    const actualMiles = totals?.actualMiles ?? null;
                    const actualTime = totals?.actualTime ?? null;

                    return (
                      <td className="min-w-[200px] border-l border-stone-100 bg-stone-50/70 p-3 align-top dark:border-stone-700 dark:bg-stone-900/20">
                        <p className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                          Estimated
                        </p>
                        <p className="mt-1 text-sm text-stone-700 dark:text-stone-200">
                          {formatTotalRange(estimatedMilesMin, estimatedMilesMax, " mi")} • {formatTotalRange(estimatedTimeMin, estimatedTimeMax, " min")}
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
      )}
    </section>
  );
}

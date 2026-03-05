"use client";

import Link from "next/link";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { PLAN_ITEMS } from "@/lib/plan";
import { importLogs, loadLogs } from "@/lib/storage";
import { LogEntry } from "@/lib/types";

const WEEK_ONE_START = new Date(2026, 2, 2); // Monday (local time)
const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const WEEKS = 10;
const DAYS = 7;
const PLAN_VIEW_MODE_STORAGE_KEY = "runlog_plan_view_mode";

type PlanViewMode = "list" | "calendar";

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
  const parts: string[] = [];
  if (typeof log.rpe === "number") parts.push(`RPE ${log.rpe}`);
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
  const [dataMessage, setDataMessage] = useState<string | null>(null);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [planViewMode, setPlanViewMode] = useState<PlanViewMode>("list");
  const [canShowCalendarView, setCanShowCalendarView] = useState(false);

  useEffect(() => {
    setLogs(loadLogs());

    const mediaQuery = window.matchMedia("(min-width: 768px)");
    const syncWithScreen = () => {
      const desktop = mediaQuery.matches;
      setCanShowCalendarView(desktop);
      setPlanViewMode((current) => {
        if (!desktop) {
          return "list";
        }
        const stored = window.localStorage.getItem(PLAN_VIEW_MODE_STORAGE_KEY);
        return stored === "calendar" ? "calendar" : current;
      });
    };

    syncWithScreen();
    mediaQuery.addEventListener("change", syncWithScreen);

    return () => mediaQuery.removeEventListener("change", syncWithScreen);
  }, []);

  useEffect(() => {
    if (!canShowCalendarView) return;
    window.localStorage.setItem(PLAN_VIEW_MODE_STORAGE_KEY, planViewMode);
  }, [canShowCalendarView, planViewMode]);

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `runlog-export-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setDataMessage(`Downloaded ${logs.length} log ${logs.length === 1 ? "entry" : "entries"}.`);
  };

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const contents = await file.text();
      const result = importLogs(contents);
      setLogs(loadLogs());
      setDataMessage(`Imported ${result.logsImported} log ${result.logsImported === 1 ? "entry" : "entries"}.`);
    } catch {
      setDataMessage("Import failed. Please select a valid JSON export file.");
    } finally {
      event.target.value = "";
    }
  };

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
    const map = new Map<
      number,
      {
        estimatedMilesMin: number;
        estimatedMilesMax: number;
        estimatedTimeMin: number;
        estimatedTimeMax: number;
        actualMiles: number;
        actualTime: number;
      }
    >();

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
      if (typeof log.week !== "number") continue;
      const totals = map.get(log.week);
      if (!totals) continue;
      if (typeof log.distanceMi === "number") totals.actualMiles += log.distanceMi;
      if (typeof log.durationMin === "number") totals.actualTime += log.durationMin;
    }

    return map;
  }, [logs]);

  const listItems = useMemo(() => PLAN_ITEMS.filter((item) => item.week === selectedWeek), [selectedWeek]);

  return (
    <section className="space-y-4">
      <div className="">
        <div className="flex flex-wrap items-center justify-end gap-3">
          <div className="flex items-center gap-2 p-1">
            <button
              type="button"
              onClick={() => setPlanViewMode("list")}
              className={[
                "rounded-md px-3 py-1.5 text-sm font-medium",
                planViewMode === "list"
                  ? "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900"
                  : "text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-700",
              ].join(" ")}
            >
              List
            </button>
            {canShowCalendarView ? (
              <button
                type="button"
                onClick={() => setPlanViewMode("calendar")}
                className={[
                  "rounded-md px-3 py-1.5 text-sm font-medium",
                  planViewMode === "calendar"
                    ? "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900"
                    : "text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-700",
                ].join(" ")}
              >
                Calendar
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {planViewMode === "calendar" && canShowCalendarView ? (
        <div className="relative left-1/2 w-[min(100vw-2rem,84rem)] -translate-x-1/2 overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-sm dark:border-stone-700 dark:bg-stone-800 sm:w-[min(100vw-3rem,84rem)]">
          <table className="w-full min-w-[800px] border-collapse">
            <thead>
              <tr className="border-b border-stone-200 dark:border-stone-600">
                <th className="w-16 p-2 text-left text-xs font-medium uppercase text-stone-500 dark:text-stone-400">Week</th>
                {DAY_NAMES.map((name) => (
                  <th key={name} className="min-w-[140px] p-2 text-center text-xs font-medium uppercase text-stone-500 dark:text-stone-400">
                    {name}
                  </th>
                ))}
                <th className="min-w-[200px] p-2 text-left text-xs font-medium uppercase text-stone-500 dark:text-stone-400">Weekly totals</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: WEEKS }, (_, i) => i + 1).map((week) => (
                <tr key={week} className="border-b border-stone-100 last:border-b-0 dark:border-stone-700">
                  <td className="w-16 p-2 align-top text-sm font-medium text-stone-600 dark:text-stone-300">{week}</td>
                  {Array.from({ length: DAYS }, (_, i) => i + 1).map((dayIndex) => {
                    const key = `${week}-${dayIndex}`;
                    const items = grid.get(key) ?? [];
                    const date = getDateFor(week, dayIndex);
                    return (
                      <td key={key} className="min-w-[140px] border-l border-stone-100 p-2 align-top first:border-l-0 dark:border-stone-700">
                        <div className="space-y-2">
                          <p className="text-xs text-stone-500 dark:text-stone-400">{formatCellDate(date)}</p>
                          {items.map((item) => {
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
                                <h3 className={["mt-0.5 font-semibold", isLogged ? "text-stone-600 line-through dark:text-stone-400" : "text-stone-900 dark:text-stone-100"].join(" ")}>
                                  {item.title}
                                </h3>
                                {formatRange(item.estimatedMilesMin, item.estimatedMilesMax, " mi") ? (
                                  <p className="mt-1 text-[11px] text-stone-500 dark:text-stone-400">Miles: {formatRange(item.estimatedMilesMin, item.estimatedMilesMax, " mi")}</p>
                                ) : null}
                                {formatRange(item.estimatedTimeMin, item.estimatedTimeMax, " min") ? (
                                  <p className="mt-0.5 text-[11px] text-stone-500 dark:text-stone-400">Time: {formatRange(item.estimatedTimeMin, item.estimatedTimeMax, " min")}</p>
                                ) : null}
                                {latestLog ? (
                                  <div className="mt-2 space-y-1">
                                    <p className="text-xs text-green-800 dark:text-green-200">{formatLoggedSummary(latestLog)}</p>
                                  </div>
                                ) : null }
                              </Link>
                            );
                          })}
                          {items.length === 0 ? (
                            <div className="rounded-lg border border-dashed border-stone-300 bg-stone-50 p-3 dark:border-stone-600 dark:bg-stone-800/60">
                              <p className="text-xs uppercase text-stone-500 dark:text-stone-400">Rest day</p>
                              <p className="mt-1 text-sm font-medium text-stone-700 dark:text-stone-200">No workout scheduled</p>
                            </div>
                          ) : null}
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
                        <p className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">Estimated</p>
                        <p className="mt-1 text-sm text-stone-700 dark:text-stone-200">
                          {formatTotalRange(estimatedMilesMin, estimatedMilesMax, " mi")} • {formatTotalRange(estimatedTimeMin, estimatedTimeMax, " min")}
                        </p>
                        <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">Actual</p>
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
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-end gap-3 p-4">

            <select
              id="week-select"
              value={selectedWeek}
              onChange={(event) => setSelectedWeek(Number(event.target.value))}
              className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-700 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-200"
            >
              {Array.from({ length: WEEKS }, (_, i) => i + 1).map((week) => {
                const start = getDateFor(week, 1);
                const end = getDateFor(week, 7);
                return (
                  <option key={week} value={week}>
                    Week {week} ({formatCellDate(start)} – {formatCellDate(end)})
                  </option>
                );
              })}
            </select>
          </div>

          {listItems.map((item) => {
            const itemLogs = logsByPlanItemId.get(item.id) ?? [];
            const latestLog = itemLogs[0];
            const isLogged = Boolean(latestLog);
            const date = getDateFor(item.week, item.dayIndex);
            return (
              <Link
                key={item.id}
                href={`/log?planItemId=${item.id}`}
                className={[
                  "block rounded-xl border bg-white p-4 shadow-sm transition hover:ring-2 hover:ring-stone-300 dark:bg-stone-800 dark:hover:ring-stone-500",
                  isLogged
                    ? "border-green-200 dark:border-green-900/60"
                    : "border-stone-200 dark:border-stone-700",
                ].join(" ")}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400">
                    {DAY_NAMES[item.dayIndex - 1]} • {formatCellDate(date)}
                  </p>
                  {isLogged ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-green-800 dark:bg-green-900/40 dark:text-green-200">
                      ✓ Logged
                    </span>
                  ) : null}
                </div>
                <h3 className={["mt-1 text-lg font-semibold", isLogged ? "text-stone-600 line-through dark:text-stone-400" : "text-stone-900 dark:text-stone-100"].join(" ")}>
                  {item.title}
                </h3>
                <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">{item.description ?? item.details}</p>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-stone-500 dark:text-stone-400">
                  {formatRange(item.estimatedMilesMin, item.estimatedMilesMax, " mi") ? <span>Miles: {formatRange(item.estimatedMilesMin, item.estimatedMilesMax, " mi")}</span> : null}
                  {formatRange(item.estimatedTimeMin, item.estimatedTimeMax, " min") ? <span>Time: {formatRange(item.estimatedTimeMin, item.estimatedTimeMax, " min")}</span> : null}
                </div>
                {latestLog ? (
                  <div className="mt-3 space-y-1">
                    <p className="text-sm text-green-800 dark:text-green-200">{formatLoggedSummary(latestLog)}</p>
                    <p className="text-xs font-medium text-stone-700 dark:text-stone-300">Edit log →</p>
                  </div>
                ) : (
                  <p className="mt-3 inline-block rounded bg-stone-900 px-2 py-1.5 text-xs font-medium text-white dark:bg-stone-100 dark:text-stone-900">Log this</p>
                )}
              </Link>
            );
          })}
        </div>
      )}
       <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-700 dark:bg-stone-800">
        <p className="text-sm text-stone-700 dark:text-stone-200">Logs are stored in your browser&apos;s local storage on this device.</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExport}
            className="rounded-lg bg-stone-900 px-3 py-2 text-sm font-medium text-white dark:bg-stone-100 dark:text-stone-900"
          >
            Download logs
          </button>
          <label className="cursor-pointer rounded-lg border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700 dark:border-stone-600 dark:text-stone-200">
            Import logs
            <input type="file" accept="application/json" className="sr-only" onChange={handleImport} />
          </label>
        </div>
        {dataMessage ? <p className="mt-2 text-sm text-stone-600 dark:text-stone-300">{dataMessage}</p> : null}
      </div>

    </section>
  );
}

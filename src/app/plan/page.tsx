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

function formatLoggedSummary(log: LogEntry): string {
  const parts: string[] = [`Logged ${log.date}`, `RPE ${log.rpe}`];
  if (typeof log.distanceMi === "number") parts.push(`${Number(log.distanceMi.toFixed(2))} mi`);
  if (typeof log.durationMin === "number") parts.push(`${Number(log.durationMin.toFixed(0))} min`);
  return parts.join(" • ");
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

  return (
    <section className="space-y-4">
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <table className="w-full min-w-[800px] border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-600">
              <th className="w-16 p-2 text-left text-xs font-medium uppercase text-slate-500 dark:text-slate-400">
                Week
              </th>
              {DAY_NAMES.map((name, i) => (
                <th
                  key={name}
                  className="min-w-[140px] p-2 text-center text-xs font-medium uppercase text-slate-500 dark:text-slate-400"
                >
                  {name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: WEEKS }, (_, i) => i + 1).map((week) => (
              <tr
                key={week}
                className="border-b border-slate-100 dark:border-slate-700 last:border-b-0"
              >
                <td className="w-16 p-2 align-top text-sm font-medium text-slate-600 dark:text-slate-300">
                  {week}
                </td>
                {Array.from({ length: DAYS }, (_, i) => i + 1).map((dayIndex) => {
                  const key = `${week}-${dayIndex}`;
                  const items = grid.get(key) ?? [];
                  const date = getDateFor(week, dayIndex);
                  return (
                    <td
                      key={key}
                      className="min-w-[140px] border-l border-slate-100 p-2 align-top first:border-l-0 dark:border-slate-700"
                    >
                      <div className="space-y-2">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
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
                              "block rounded-lg border p-3 transition hover:ring-2 hover:ring-slate-300 dark:hover:ring-slate-500",
                              isLogged
                                ? "border-green-200 bg-green-50 dark:border-green-900/60 dark:bg-green-900/10"
                                : "border-slate-200 bg-slate-50 dark:border-slate-600 dark:bg-slate-800/80",
                            ].join(" ")}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-xs uppercase text-slate-500 dark:text-slate-400">{item.type}</p>
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
                                  ? "text-slate-600 line-through dark:text-slate-400"
                                  : "text-slate-900 dark:text-slate-100",
                              ].join(" ")}
                            >
                              {item.title}
                            </h3>
                            <p className="mt-1 line-clamp-2 text-xs text-slate-600 dark:text-slate-300">
                              {item.details}
                            </p>
                            {latestLog ? (
                              <div className="mt-2 space-y-1">
                                <p className="text-xs text-green-800 dark:text-green-200">{formatLoggedSummary(latestLog)}</p>
                                <p className="text-[11px] font-medium text-slate-700 dark:text-slate-300">Edit log →</p>
                              </div>
                            ) : (
                              <p className="mt-2 inline-block rounded bg-slate-900 px-2 py-1.5 text-xs font-medium text-white dark:bg-slate-100 dark:text-slate-900">
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

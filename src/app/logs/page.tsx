"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { deleteLog, loadLogs } from "@/lib/storage";
import { LogEntry } from "@/lib/types";

function formatDateDisplay(value: string) {
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });
}

function formatDuration(durationMin?: number) {
  if (typeof durationMin !== "number") return "—";

  const roundedMinutes = Math.floor(durationMin);
  const seconds = Math.round((durationMin - roundedMinutes) * 60);
  if (seconds === 0) return `${roundedMinutes}m`;
  return `${roundedMinutes}m ${seconds}s`;
}

function formatDistance(distanceMi?: number) {
  if (typeof distanceMi !== "number") return "—";
  return `${Number(distanceMi.toFixed(2))} mi`;
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    setLogs(loadLogs());
  }, []);

  const sortedLogs = useMemo(
    () =>
      [...logs].sort((a, b) => {
        const dateDelta = b.date.localeCompare(a.date);
        if (dateDelta !== 0) return dateDelta;
        return b.createdAt.localeCompare(a.createdAt);
      }),
    [logs],
  );

  const handleDelete = async (log: LogEntry) => {
    if (!window.confirm("Delete this log entry?")) return;

    if (log.gpxUploadId) {
      await fetch(`/api/gpx/${log.gpxUploadId}`, { method: "DELETE" });
    }

    deleteLog(log.id);
    setLogs(loadLogs());
    setStatus("Log deleted.");
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg font-semibold">All logs</h1>
        <Link
          href="/log"
          className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-700 dark:border-stone-600 dark:text-stone-200"
        >
          New log
        </Link>
      </div>

      {status ? <p className="text-sm text-green-700 dark:text-green-400">{status}</p> : null}

      {sortedLogs.length === 0 ? (
        <article className="rounded-xl border border-stone-200 bg-white p-4 text-sm text-stone-600 shadow-sm dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300">
          No logs yet.
        </article>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-sm dark:border-stone-700 dark:bg-stone-800">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="border-b border-stone-200 text-xs uppercase text-stone-500 dark:border-stone-600 dark:text-stone-400">
              <tr>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Title</th>
                <th className="px-3 py-2">Week</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Distance</th>
                <th className="px-3 py-2">Duration</th>
                <th className="px-3 py-2">RPE</th>
                <th className="px-3 py-2">Linked</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedLogs.map((log) => (
                <tr key={log.id} className="border-b border-stone-100 last:border-b-0 dark:border-stone-700">
                  <td className="px-3 py-2">{formatDateDisplay(log.date)}</td>
                  <td className="px-3 py-2">{log.title || "—"}</td>
                  <td className="px-3 py-2">{log.week ?? "—"}</td>
                  <td className="px-3 py-2 capitalize">{log.type}</td>
                  <td className="px-3 py-2">{formatDistance(log.distanceMi)}</td>
                  <td className="px-3 py-2">{formatDuration(log.durationMin)}</td>
                  <td className="px-3 py-2">{log.rpe ?? "—"}</td>
                  <td className="px-3 py-2">{log.planItemId ? "Planned" : "Unplanned"}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/log?logId=${log.id}`} className="underline underline-offset-2">
                        View
                      </Link>
                      <Link href={`/log?logId=${log.id}&mode=edit`} className="underline underline-offset-2">
                        Edit
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDelete(log)}
                        className="text-red-700 underline underline-offset-2 dark:text-red-400"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

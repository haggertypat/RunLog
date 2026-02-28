"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { deleteLog, loadLogs, updateLog } from "@/lib/storage";
import { LogEntry, PlanItemType } from "@/lib/types";

export default function JournalPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [weekFilter, setWeekFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState<"all" | PlanItemType>("all");
  const [editing, setEditing] = useState<LogEntry | null>(null);

  useEffect(() => {
    setLogs(loadLogs());
  }, []);

  const filtered = useMemo(() => {
    return logs.filter((log) => {
      const weekMatches = weekFilter === "all" ? true : log.week === Number(weekFilter);
      const typeMatches = typeFilter === "all" ? true : log.type === typeFilter;
      return weekMatches && typeMatches;
    });
  }, [logs, typeFilter, weekFilter]);

  const onDelete = (id: string) => {
    deleteLog(id);
    setLogs(loadLogs());
  };

  const onSaveEdit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editing) return;
    updateLog(editing);
    setLogs(loadLogs());
    setEditing(null);
  };

  return (
    <section className="space-y-4">
      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:grid-cols-2">
        <label className="text-sm">Week
          <select className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1.5 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" value={weekFilter} onChange={(e) => setWeekFilter(e.target.value)}>
            <option value="all">All</option>
            {Array.from({ length: 10 }, (_, idx) => idx + 1).map((w) => (
              <option key={w} value={w}>{w}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">Type
          <select className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1.5 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as "all" | PlanItemType)}>
            <option value="all">All</option>
            <option value="run">Run</option>
            <option value="strength">Strength</option>
          </select>
        </label>
      </div>

      <div className="space-y-3">
        {filtered.map((log) => (
          <article key={log.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase text-slate-500 dark:text-slate-400">{log.date} • Week {log.week} • {log.type}</p>
                <p className="text-sm text-slate-700 dark:text-slate-300">RPE {log.rpe} • {log.distanceMi ?? "-"} mi • {log.durationMin ?? "-"} min</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">{log.surface}</p>
                {log.notes ? <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{log.notes}</p> : null}
              </div>
              <div className="flex gap-2">
                <button className="rounded border border-slate-300 px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-700" onClick={() => setEditing(log)}>Edit</button>
                <button className="rounded border border-red-200 px-2 py-1 text-sm text-red-700 dark:border-red-800 dark:text-red-400" onClick={() => onDelete(log.id)}>Delete</button>
              </div>
            </div>
          </article>
        ))}
        {!filtered.length ? <p className="text-sm text-slate-500 dark:text-slate-400">No logs match these filters.</p> : null}
      </div>

      {editing ? (
        <form onSubmit={onSaveEdit} className="space-y-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <h2 className="font-semibold">Edit log</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="text-sm">Date<input type="date" className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1.5 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" value={editing.date} onChange={(e) => setEditing({ ...editing, date: e.target.value })} /></label>
            <label className="text-sm">Week<input type="number" min={1} max={10} className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1.5 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" value={editing.week} onChange={(e) => setEditing({ ...editing, week: Number(e.target.value) })} /></label>
            <label className="text-sm">RPE<input type="number" min={1} max={10} className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1.5 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" value={editing.rpe} onChange={(e) => setEditing({ ...editing, rpe: Number(e.target.value) })} /></label>
            <label className="text-sm">Distance<input type="number" step="0.01" className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1.5 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" value={editing.distanceMi ?? ""} onChange={(e) => setEditing({ ...editing, distanceMi: e.target.value ? Number(e.target.value) : undefined })} /></label>
            <label className="text-sm">Duration<input type="number" className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1.5 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" value={editing.durationMin ?? ""} onChange={(e) => setEditing({ ...editing, durationMin: e.target.value ? Number(e.target.value) : undefined })} /></label>
            <label className="text-sm">Surface<input className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1.5 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" value={editing.surface} onChange={(e) => setEditing({ ...editing, surface: e.target.value })} /></label>
            <label className="text-sm sm:col-span-2">Notes<textarea className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1.5 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" rows={2} value={editing.notes} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} /></label>
          </div>
          <div className="flex gap-2">
            <button className="rounded bg-slate-900 px-3 py-2 text-sm text-white dark:bg-slate-100 dark:text-slate-900" type="submit">Save edits</button>
            <button className="rounded border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700" type="button" onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </form>
      ) : null}
    </section>
  );
}

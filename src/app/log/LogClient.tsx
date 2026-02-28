"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getPlanItemById } from "@/lib/plan";
import { addLog, deleteLog, loadLogs, updateLog } from "@/lib/storage";
import { LogEntry, PlanItemType } from "@/lib/types";

const today = new Date().toISOString().slice(0, 10);

function formatMetric(value: number | undefined, unit: string): string {
  return typeof value === "number" ? `${value} ${unit}` : `- ${unit}`;
}

export default function LogClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const planItemId = searchParams.get("planItemId") ?? "";
  const planItem = useMemo(() => (planItemId ? getPlanItemById(planItemId) : undefined), [planItemId]);

  const [date, setDate] = useState(today);
  const [week, setWeek] = useState(planItem?.week ?? 1);
  const [type, setType] = useState<PlanItemType>(planItem?.type ?? "run");
  const [distanceMi, setDistanceMi] = useState("");
  const [durationMin, setDurationMin] = useState("");
  const [rpe, setRpe] = useState(String(planItem?.targetRpeMin ?? 5));
  const [surface, setSurface] = useState("Road");
  const [notes, setNotes] = useState("");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [editing, setEditing] = useState<LogEntry | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    setWeek(planItem?.week ?? 1);
    setType(planItem?.type ?? "run");
    setRpe(String(planItem?.targetRpeMin ?? 5));
  }, [planItem]);

  useEffect(() => {
    setLogs(loadLogs());
  }, []);

  const itemLogs = useMemo(
    () => logs.filter((log) => (planItem ? log.planItemId === planItem.id : true)),
    [logs, planItem],
  );

  const refreshLogs = () => {
    setLogs(loadLogs());
    router.refresh();
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!date) {
      setError("Date is required.");
      return;
    }

    const parsedRpe = Number(rpe);
    if (Number.isNaN(parsedRpe) || parsedRpe < 1 || parsedRpe > 10) {
      setError("RPE must be between 1 and 10.");
      return;
    }

    const parsedWeek = Number(week);
    if (Number.isNaN(parsedWeek) || parsedWeek < 1 || parsedWeek > 10) {
      setError("Week must be between 1 and 10.");
      return;
    }

    const entry: LogEntry = {
      id: crypto.randomUUID(),
      date,
      planItemId: planItem?.id,
      week: parsedWeek,
      type,
      distanceMi: distanceMi ? Number(distanceMi) : undefined,
      durationMin: durationMin ? Number(durationMin) : undefined,
      rpe: parsedRpe,
      surface,
      notes,
      createdAt: new Date().toISOString(),
    };

    addLog(entry);
    setSuccess("Saved log entry.");
    setDistanceMi("");
    setDurationMin("");
    setNotes("");
    refreshLogs();
  };

  const handleDelete = (id: string) => {
    deleteLog(id);
    refreshLogs();
  };

  const handleEditSave = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editing) return;
    updateLog(editing);
    setEditing(null);
    refreshLogs();
  };

  return (
    <section className="space-y-4">
      {planItem ? (
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <p className="text-xs uppercase text-slate-500 dark:text-slate-400">Prefilled from plan item</p>
          <h2 className="font-semibold">{planItem.title}</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">{planItem.details}</p>
        </article>
      ) : null}

      <form
        className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800"
        onSubmit={handleSubmit}
      >
        <h2 className="font-semibold">New Log Entry</h2>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            Date
            <input
              type="date"
              className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1.5 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          <label className="text-sm">
            Week
            <input
              type="number"
              min={1}
              max={10}
              className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1.5 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
              value={week}
              onChange={(e) => setWeek(Number(e.target.value))}
            />
          </label>
          <label className="text-sm">
            Type
            <select
              className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1.5 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
              value={type}
              onChange={(e) => setType(e.target.value as PlanItemType)}
            >
              <option value="run">Run</option>
              <option value="strength">Strength</option>
            </select>
          </label>
          <label className="text-sm">
            RPE (1-10)
            <input
              type="number"
              min={1}
              max={10}
              className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1.5 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
              value={rpe}
              onChange={(e) => setRpe(e.target.value)}
            />
          </label>
          <label className="text-sm">
            Distance (mi)
            <input
              type="number"
              step="0.01"
              min={0}
              className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1.5 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
              value={distanceMi}
              onChange={(e) => setDistanceMi(e.target.value)}
            />
          </label>
          <label className="text-sm">
            Duration (min)
            <input
              type="number"
              min={0}
              className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1.5 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
              value={durationMin}
              onChange={(e) => setDurationMin(e.target.value)}
            />
          </label>
          <label className="text-sm sm:col-span-2">
            Surface
            <input
              className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1.5 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
              value={surface}
              onChange={(e) => setSurface(e.target.value)}
            />
          </label>
          <label className="text-sm sm:col-span-2">
            Notes
            <textarea
              className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1.5 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
        </div>

        {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
        {success ? <p className="text-sm text-green-700 dark:text-green-400">{success}</p> : null}

        <button
          type="submit"
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white dark:bg-slate-100 dark:text-slate-900"
        >
          Save
        </button>
      </form>

      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h2 className="font-semibold">{planItem ? "Logs for this workout" : "All logs"}</h2>
        {itemLogs.map((log) => (
          <article key={log.id} className="rounded-lg border border-slate-200 p-3 dark:border-slate-600">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase text-slate-500 dark:text-slate-400">
                  {log.date} • Week {log.week} • {log.type}
                </p>
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  RPE {log.rpe} • {formatMetric(log.distanceMi, "mi")} • {formatMetric(log.durationMin, "min")}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400">{log.surface}</p>
                {log.notes ? <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{log.notes}</p> : null}
              </div>
              <div className="flex gap-2">
                <button
                  className="rounded border border-slate-300 px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-700"
                  onClick={() => setEditing(log)}
                  type="button"
                >
                  Edit
                </button>
                <button
                  className="rounded border border-red-200 px-2 py-1 text-sm text-red-700 dark:border-red-800 dark:text-red-400"
                  onClick={() => handleDelete(log.id)}
                  type="button"
                >
                  Delete
                </button>
              </div>
            </div>
          </article>
        ))}
        {!itemLogs.length ? <p className="text-sm text-slate-500 dark:text-slate-400">No logs yet.</p> : null}
      </section>

      {editing ? (
        <form
          onSubmit={handleEditSave}
          className="space-y-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800"
        >
          <h2 className="font-semibold">Edit log</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="text-sm">
              Date
              <input
                type="date"
                className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1.5 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                value={editing.date}
                onChange={(e) => setEditing({ ...editing, date: e.target.value })}
              />
            </label>
            <label className="text-sm">
              Week
              <input
                type="number"
                min={1}
                max={10}
                className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1.5 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                value={editing.week}
                onChange={(e) => setEditing({ ...editing, week: Number(e.target.value) })}
              />
            </label>
            <label className="text-sm">
              RPE
              <input
                type="number"
                min={1}
                max={10}
                className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1.5 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                value={editing.rpe}
                onChange={(e) => setEditing({ ...editing, rpe: Number(e.target.value) })}
              />
            </label>
            <label className="text-sm">
              Distance
              <input
                type="number"
                step="0.01"
                className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1.5 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                value={editing.distanceMi ?? ""}
                onChange={(e) =>
                  setEditing({ ...editing, distanceMi: e.target.value ? Number(e.target.value) : undefined })
                }
              />
            </label>
            <label className="text-sm">
              Duration
              <input
                type="number"
                className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1.5 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                value={editing.durationMin ?? ""}
                onChange={(e) =>
                  setEditing({ ...editing, durationMin: e.target.value ? Number(e.target.value) : undefined })
                }
              />
            </label>
            <label className="text-sm">
              Surface
              <input
                className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1.5 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                value={editing.surface}
                onChange={(e) => setEditing({ ...editing, surface: e.target.value })}
              />
            </label>
            <label className="text-sm sm:col-span-2">
              Notes
              <textarea
                className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1.5 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                rows={2}
                value={editing.notes}
                onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
              />
            </label>
          </div>
          <div className="flex gap-2">
            <button className="rounded bg-slate-900 px-3 py-2 text-sm text-white dark:bg-slate-100 dark:text-slate-900" type="submit">
              Save edits
            </button>
            <button
              className="rounded border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700"
              type="button"
              onClick={() => setEditing(null)}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}
    </section>
  );
}

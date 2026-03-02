"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getPlanItemById } from "@/lib/plan";
import { addLog, deleteLog, loadLogs, updateLog } from "@/lib/storage";
import { LogEntry, PlanItemType } from "@/lib/types";

function formatRange(min?: number, max?: number, unit = "") {
  if (typeof min !== "number" && typeof max !== "number") return null;
  if (typeof min === "number" && typeof max === "number") {
    return `${min}–${max}${unit}`;
  }
  return `${typeof min === "number" ? min : max}${unit}`;
}

function parseDurationToMinutes(input: string): number | null {
  const value = input.trim();
  if (!value) return null;

  if (/^\d+(\.\d+)?$/.test(value)) {
    return Number(value);
  }

  const parts = value.split(":");
  if (parts.length !== 2 && parts.length !== 3) return null;
  if (parts.some((part) => !/^\d+$/.test(part))) return null;

  if (parts.length === 2) {
    const [minutes, seconds] = parts.map(Number);
    if (seconds > 59) return null;
    return minutes + seconds / 60;
  }

  const [hours, minutes, seconds] = parts.map(Number);
  if (minutes > 59 || seconds > 59) return null;
  return hours * 60 + minutes + seconds / 60;
}

export default function LogClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planItemId = searchParams.get("planItemId") ?? "";
  const planItem = useMemo(() => (planItemId ? getPlanItemById(planItemId) : undefined), [planItemId]);

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [week, setWeek] = useState(planItem?.week ?? 1);
  const [type, setType] = useState<PlanItemType>(planItem?.type ?? "run");
  const [distanceMi, setDistanceMi] = useState("");
  const [durationMin, setDurationMin] = useState("");
  const [rpe, setRpe] = useState(String(planItem?.targetRpeMin ?? 5));
  const [surface, setSurface] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const existingLog = useMemo(() => {
    if (!planItem) return null;
    return logs.find((log) => log.planItemId === planItem.id) ?? null;
  }, [logs, planItem]);

  const refreshLogs = () => {
    setLogs(loadLogs());
    router.refresh();
  };

  useEffect(() => {
    setLogs(loadLogs());
  }, []);

  useEffect(() => {
    if (existingLog) {
      setDate(existingLog.date);
      setWeek(existingLog.week);
      setType(existingLog.type);
      setDistanceMi(existingLog.distanceMi != null ? String(existingLog.distanceMi) : "");
      setDurationMin(existingLog.durationMin != null ? String(existingLog.durationMin) : "");
      setRpe(String(existingLog.rpe));
      setSurface(existingLog.surface);
      setNotes(existingLog.notes);
      return;
    }

    setDate(new Date().toISOString().slice(0, 10));
    setWeek(planItem?.week ?? 1);
    setType(planItem?.type ?? "run");
    setDistanceMi(planItem?.estimatedMilesMin != null ? String(planItem.estimatedMilesMin) : "");
    setDurationMin(planItem?.estimatedTimeMin != null ? String(planItem.estimatedTimeMin) : "");
    setRpe(String(planItem?.targetRpeMin ?? 5));
    setSurface("");
    setNotes("");
  }, [existingLog, planItem]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const parsedWeek = Number(week);
    const parsedRpe = Number(rpe);

    if (!date) return setError("Date is required.");
    if (!parsedWeek || parsedWeek < 1 || parsedWeek > 10) return setError("Week must be 1-10.");
    if (!parsedRpe || parsedRpe < 1 || parsedRpe > 10) return setError("RPE must be 1-10.");

    const parsedDurationMin = parseDurationToMinutes(durationMin);
    if (durationMin.trim() && parsedDurationMin == null) {
      return setError("Duration must be minutes (e.g. 45) or a time string like mm:ss or hh:mm:ss.");
    }

    const entry: LogEntry = {
      id: existingLog?.id ?? crypto.randomUUID(),
      date,
      planItemId: planItem?.id,
      week: parsedWeek,
      type,
      distanceMi: distanceMi ? Number(distanceMi) : undefined,
      durationMin: parsedDurationMin ?? undefined,
      rpe: parsedRpe,
      surface,
      notes,
      createdAt: existingLog?.createdAt ?? new Date().toISOString(),
    };

    if (existingLog) {
      updateLog(entry);
      setSuccess("Updated log.");
    } else {
      addLog(entry);
      setSuccess("Saved log entry.");
    }

    refreshLogs();
  };

  const handleDelete = () => {
    if (!existingLog) return;
    deleteLog(existingLog.id);
    setSuccess("Log deleted.");
    refreshLogs();
  };

  return (
    <section className="space-y-4">
      {planItem ? (
        <article className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-700 dark:bg-stone-800">
          <h1 className="font-semibold">{planItem.title}</h1>
          <h2 className="text-sm text-stone-600 dark:text-stone-300">{planItem.details}</h2>
          {planItem.description ? <p className="mt-2 text-sm text-stone-700 dark:text-stone-200">{planItem.description}</p> : null}
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            {formatRange(planItem.estimatedMilesMin, planItem.estimatedMilesMax, " mi") ? (
              <span className="rounded-full bg-stone-100 px-2 py-1 dark:bg-stone-700">
                Est. miles: {formatRange(planItem.estimatedMilesMin, planItem.estimatedMilesMax, " mi")}
              </span>
            ) : null}
            {formatRange(planItem.estimatedTimeMin, planItem.estimatedTimeMax, " min") ? (
              <span className="rounded-full bg-stone-100 px-2 py-1 dark:bg-stone-700">
                Est. time: {formatRange(planItem.estimatedTimeMin, planItem.estimatedTimeMax, " min")}
              </span>
            ) : null}
          </div>
        </article>
      ) : null}

      <form
        className="space-y-3 rounded-xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-700 dark:bg-stone-800"
        onSubmit={handleSubmit}
      >
        <h2 className="font-semibold">{existingLog ? "Edit Log" : "New Log Entry"}</h2>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            Date
            <input type="date" className="mt-1 w-full rounded border border-stone-300 bg-white px-2 py-1.5 dark:border-stone-600 dark:bg-stone-700 dark:text-stone-100" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label className="text-sm">
            Week
            <input type="number" min={1 } max={10} className="mt-1 w-full rounded border border-stone-300 bg-white px-2 py-1.5 dark:border-stone-600 dark:bg-stone-700 dark:text-stone-100" value={week} onChange={(e) => setWeek(Number(e.target.value))} />
          </label>
          <label className="text-sm">
            Type
            <select className="mt-1 w-full rounded border border-stone-300 bg-white px-2 py-1.5 dark:border-stone-600 dark:bg-stone-700 dark:text-stone-100" value={type} onChange={(e) => setType(e.target.value as PlanItemType)}>
              <option value="run">Run</option>
              <option value="strength">Strength</option>
            </select>
          </label>
          <label className="text-sm">
            RPE (1-10)
            <input type="number" min={1} max={10} className="mt-1 w-full rounded border border-stone-300 bg-white px-2 py-1.5 dark:border-stone-600 dark:bg-stone-700 dark:text-stone-100" value={rpe} onChange={(e) => setRpe(e.target.value)} />
          </label>
          <label className="text-sm">
            Distance (mi)
            <input type="number" step="0.01" min={0} className="mt-1 w-full rounded border border-stone-300 bg-white px-2 py-1.5 dark:border-stone-600 dark:bg-stone-700 dark:text-stone-100" value={distanceMi} onChange={(e) => setDistanceMi(e.target.value)} />
          </label>
          <label className="text-sm">
            Duration (min or mm:ss / hh:mm:ss)
            <input type="text" inputMode="decimal" placeholder="45 or 1:05:30" className="mt-1 w-full rounded border border-stone-300 bg-white px-2 py-1.5 dark:border-stone-600 dark:bg-stone-700 dark:text-stone-100" value={durationMin} onChange={(e) => setDurationMin(e.target.value)} />
          </label>
          <label className="text-sm">
            Surface
            <input className="mt-1 w-full rounded border border-stone-300 bg-white px-2 py-1.5 dark:border-stone-600 dark:bg-stone-700 dark:text-stone-100" value={surface} onChange={(e) => setSurface(e.target.value)} />
          </label>
          <label className="text-sm sm:col-span-2">
            Notes
            <textarea className="mt-1 w-full rounded border border-stone-300 bg-white px-2 py-1.5 dark:border-stone-600 dark:bg-stone-700 dark:text-stone-100" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
        </div>

        {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
        {success ? <p className="text-sm text-green-700 dark:text-green-400">{success}</p> : null}

        <div className="flex gap-2">
          <button type="submit" className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white dark:bg-stone-100 dark:text-stone-900">
            {existingLog ? "Save changes" : "Save"}
          </button>
          {existingLog ? (
            <button type="button" className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-700 dark:border-red-800 dark:text-red-400" onClick={handleDelete}>
              Delete log
            </button>
          ) : null}
        </div>
      </form>
    </section>
  );
}

"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getPlanItemById } from "@/lib/plan";
import { addLog } from "@/lib/storage";
import { LogEntry, PlanItemType } from "@/lib/types";

const today = new Date().toISOString().slice(0, 10);

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
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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

    router.refresh();
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
    </section>
  );
}


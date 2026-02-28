"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PLAN_ITEMS } from "@/lib/plan";

export default function PlanPage() {
  const [week, setWeek] = useState(1);

  const items = useMemo(
    () => PLAN_ITEMS.filter((item) => item.week === week).sort((a, b) => a.dayIndex - b.dayIndex),
    [week],
  );

  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="week-select">
          Week
        </label>
        <select
          id="week-select"
          value={week}
          onChange={(e) => setWeek(Number(e.target.value))}
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
        >
          {Array.from({ length: 10 }, (_, idx) => idx + 1).map((value) => (
            <option key={value} value={value}>
              Week {value}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-3">
        {items.map((item) => (
          <article key={item.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs uppercase text-slate-500 dark:text-slate-400">
                  Day {item.dayIndex} • {item.type}
                </p>
                <h2 className="font-semibold">{item.title}</h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{item.details}</p>
              </div>
              <Link
                href={`/log?planItemId=${item.id}`}
                className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white dark:bg-slate-100 dark:text-slate-900"
              >
                Log this
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

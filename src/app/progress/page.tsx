"use client";

import { useEffect, useMemo, useState } from "react";
import { loadLogs } from "@/lib/storage";
import { computeWeeklyStats } from "@/lib/stats";
import { LogEntry } from "@/lib/types";

export default function ProgressPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    setLogs(loadLogs());
  }, []);

  const stats = useMemo(() => computeWeeklyStats(logs), [logs]);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 font-semibold">Weekly Progress</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b text-slate-500">
              <th className="px-2 py-2">Week</th>
              <th className="px-2 py-2">Miles</th>
              <th className="px-2 py-2">Run Count</th>
              <th className="px-2 py-2">Planned Runs</th>
              <th className="px-2 py-2">Completed Planned Runs</th>
              <th className="px-2 py-2">Adherence</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((row) => (
              <tr key={row.week} className="border-b last:border-b-0">
                <td className="px-2 py-2">{row.week}</td>
                <td className="px-2 py-2">{row.miles}</td>
                <td className="px-2 py-2">{row.runCount}</td>
                <td className="px-2 py-2">{row.plannedRuns}</td>
                <td className="px-2 py-2">{row.completedPlannedRuns}</td>
                <td className="px-2 py-2">{row.adherencePct}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

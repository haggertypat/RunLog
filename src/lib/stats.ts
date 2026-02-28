import { PLAN_ITEMS } from "@/lib/plan";
import { LogEntry } from "@/lib/types";

export type WeeklyStats = {
  week: number;
  miles: number;
  runCount: number;
  plannedRuns: number;
  completedPlannedRuns: number;
  adherencePct: number;
};

export const computeWeeklyStats = (logs: LogEntry[]): WeeklyStats[] => {
  return Array.from({ length: 10 }, (_, idx) => idx + 1).map((week) => {
    const weekLogs = logs.filter((log) => log.week === week);
    const runLogs = weekLogs.filter((log) => log.type === "run");

    const plannedRuns = PLAN_ITEMS.filter((item) => item.week === week && item.type === "run");
    const plannedRunIds = new Set(plannedRuns.map((item) => item.id));
    const completedPlannedRuns = new Set(
      runLogs.map((log) => log.planItemId).filter((id): id is string => Boolean(id && plannedRunIds.has(id))),
    ).size;

    const miles = runLogs.reduce((acc, log) => acc + (log.distanceMi ?? 0), 0);
    const adherencePct = plannedRuns.length ? Math.round((completedPlannedRuns / plannedRuns.length) * 100) : 0;

    return {
      week,
      miles: Number(miles.toFixed(2)),
      runCount: runLogs.length,
      plannedRuns: plannedRuns.length,
      completedPlannedRuns,
      adherencePct,
    };
  });
};

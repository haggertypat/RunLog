import { LogEntry } from "@/lib/types";

export const LOG_STORAGE_KEY = "run_log_v1";

const isClient = () => typeof window !== "undefined";

type SaveLogsResult = {
  strippedGpxCount: number;
  strippedEntryIds: string[];
};

const isQuotaExceededError = (error: unknown) =>
  error instanceof DOMException && (error.name === "QuotaExceededError" || error.code === 22);

export const loadLogs = (): LogEntry[] => {
  if (!isClient()) return [];

  try {
    const raw = window.localStorage.getItem(LOG_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LogEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const saveLogs = (logs: LogEntry[], stripEntryIds?: string[]): SaveLogsResult => {
  if (!isClient()) return { strippedGpxCount: 0, strippedEntryIds: [] };

  const persist = (candidateLogs: LogEntry[]) => {
    window.localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(candidateLogs));
  };

  try {
    persist(logs);
    return { strippedGpxCount: 0, strippedEntryIds: [] };
  } catch (error) {
    if (!isQuotaExceededError(error)) throw error;

    const nextLogs = [...logs];
    let strippedGpxCount = 0;
    const strippedEntryIds: string[] = [];

    const stripIds = stripEntryIds?.length
      ? stripEntryIds
      : nextLogs.map((log) => log.id).reverse();

    for (const stripId of stripIds) {
      const index = nextLogs.findIndex((log) => log.id === stripId);
      if (index < 0 || !nextLogs[index]?.gpxData) continue;
      nextLogs[index] = { ...nextLogs[index], gpxData: undefined, gpxFileName: undefined };
      strippedGpxCount += 1;
      strippedEntryIds.push(nextLogs[index].id);

      try {
        persist(nextLogs);
        return { strippedGpxCount, strippedEntryIds };
      } catch (retryError) {
        if (!isQuotaExceededError(retryError)) throw retryError;
      }
    }

    throw error;
  }
};

export const addLog = (entry: LogEntry): SaveLogsResult => {
  const logs = loadLogs();
  return saveLogs([entry, ...logs], [entry.id]);
};

export const updateLog = (entry: LogEntry): SaveLogsResult => {
  const logs = loadLogs();
  const next = logs.map((log) => (log.id === entry.id ? entry : log));
  return saveLogs(next, [entry.id]);
};

export const deleteLog = (id: string) => {
  const logs = loadLogs();
  saveLogs(logs.filter((log) => log.id !== id));
};

function isLogEntry(value: unknown): value is LogEntry {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<LogEntry>;

  return (
    typeof candidate.id === "string" &&
    typeof candidate.date === "string" &&
    (typeof candidate.title === "undefined" || typeof candidate.title === "string") &&
    (typeof candidate.week === "number" || candidate.week === null) &&
    (candidate.type === "run" || candidate.type === "strength") &&
    (typeof candidate.rpe === "number" || candidate.rpe === null) &&
    typeof candidate.surface === "string" &&
    typeof candidate.notes === "string" &&
    (typeof candidate.gpxFileName === "undefined" || typeof candidate.gpxFileName === "string") &&
    (typeof candidate.gpxUploadId === "undefined" || typeof candidate.gpxUploadId === "string") &&
    (typeof candidate.gpxData === "undefined" || typeof candidate.gpxData === "string") &&
    typeof candidate.createdAt === "string"
  );
}

export const importLogs = (raw: string): { logsImported: number } => {
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error("Expected a JSON array of log entries.");
  }

  const nextLogs = parsed.filter(isLogEntry);
  saveLogs(nextLogs);

  return { logsImported: nextLogs.length };
};

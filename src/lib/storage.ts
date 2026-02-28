import { LogEntry } from "@/lib/types";

export const LOG_STORAGE_KEY = "run_log_v1";

const isClient = () => typeof window !== "undefined";

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

export const saveLogs = (logs: LogEntry[]) => {
  if (!isClient()) return;
  window.localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(logs));
};

export const addLog = (entry: LogEntry) => {
  const logs = loadLogs();
  saveLogs([entry, ...logs]);
};

export const updateLog = (entry: LogEntry) => {
  const logs = loadLogs();
  const next = logs.map((log) => (log.id === entry.id ? entry : log));
  saveLogs(next);
};

export const deleteLog = (id: string) => {
  const logs = loadLogs();
  saveLogs(logs.filter((log) => log.id !== id));
};

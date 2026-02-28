export type PlanItemType = "run" | "strength";

export type PlanItem = {
  id: string;
  week: number;
  dayIndex: number;
  type: PlanItemType;
  title: string;
  details: string;
  targetRpeMin?: number;
  targetRpeMax?: number;
  strides?: string;
};

export type LogEntry = {
  id: string;
  date: string;
  planItemId?: string;
  week: number;
  type: PlanItemType;
  distanceMi?: number;
  durationMin?: number;
  rpe: number;
  surface: string;
  notes: string;
  createdAt: string;
};

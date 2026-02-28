import { PlanItem } from "@/lib/types";

const strengthDetails =
  "2 rounds: calves/soleus raises, tib raises, split squats, single-leg RDL, dead bugs, side plank.";

const runByWeek: Record<number, { dayIndex: number; title: string; details: string; targetRpeMin?: number; targetRpeMax?: number; strides?: string }[]> = {
  1: [
    { dayIndex: 1, title: "Easy + strides", details: "Easy run + 6 x 20s relaxed strides.", targetRpeMin: 3, targetRpeMax: 4, strides: "6x20s" },
    { dayIndex: 3, title: "3 x 5 min threshold", details: "3 x 5 min threshold with 2 min easy jog recoveries.", targetRpeMin: 7, targetRpeMax: 8 },
    { dayIndex: 5, title: "Easy", details: "Easy aerobic run.", targetRpeMin: 3, targetRpeMax: 4 },
    { dayIndex: 7, title: "55 min long", details: "Steady long run for 55 minutes.", targetRpeMin: 4, targetRpeMax: 5 },
  ],
  2: [
    { dayIndex: 1, title: "Easy + strides", details: "Easy run + 6 x 20s relaxed strides.", targetRpeMin: 3, targetRpeMax: 4, strides: "6x20s" },
    { dayIndex: 3, title: "4 x 5 min threshold", details: "4 x 5 min threshold with 2 min easy jog recoveries.", targetRpeMin: 7, targetRpeMax: 8 },
    { dayIndex: 5, title: "Easy", details: "Easy aerobic run.", targetRpeMin: 3, targetRpeMax: 4 },
    { dayIndex: 7, title: "60 min long", details: "Steady long run for 60 minutes.", targetRpeMin: 4, targetRpeMax: 5 },
  ],
  3: [
    { dayIndex: 1, title: "Easy + strides", details: "Easy run + 6 x 20s relaxed strides.", targetRpeMin: 3, targetRpeMax: 4, strides: "6x20s" },
    { dayIndex: 3, title: "3 x 8 min threshold", details: "3 x 8 min threshold with 2–3 min easy jog recoveries.", targetRpeMin: 7, targetRpeMax: 8 },
    { dayIndex: 5, title: "Easy + pickups", details: "Easy run + 6 x 30s smooth pickups.", targetRpeMin: 4, targetRpeMax: 6, strides: "6x30s pickups" },
    { dayIndex: 7, title: "60 min long", details: "Steady long run for 60 minutes.", targetRpeMin: 4, targetRpeMax: 5 },
  ],
  4: [
    { dayIndex: 1, title: "Easy + strides", details: "Easy run + 6 x 20s relaxed strides.", targetRpeMin: 3, targetRpeMax: 4, strides: "6x20s" },
    { dayIndex: 3, title: "6 x 2 min @ RPE 8", details: "6 x 2 min hard with 2 min easy recoveries.", targetRpeMin: 8, targetRpeMax: 8 },
    { dayIndex: 5, title: "Easy", details: "Easy aerobic run.", targetRpeMin: 3, targetRpeMax: 4 },
    { dayIndex: 7, title: "65 min long", details: "Steady long run for 65 minutes.", targetRpeMin: 4, targetRpeMax: 5 },
  ],
  5: [
    { dayIndex: 1, title: "Easy + strides", details: "Easy run + 6 x 20s relaxed strides.", targetRpeMin: 3, targetRpeMax: 4, strides: "6x20s" },
    { dayIndex: 3, title: "2-mile controlled time trial", details: "2-mile controlled time trial. Strong, even effort.", targetRpeMin: 8, targetRpeMax: 9 },
    { dayIndex: 5, title: "Easy", details: "Easy aerobic run.", targetRpeMin: 3, targetRpeMax: 4 },
    { dayIndex: 7, title: "65 min long", details: "Steady long run for 65 minutes.", targetRpeMin: 4, targetRpeMax: 5 },
  ],
  6: [
    { dayIndex: 1, title: "Easy + strides", details: "Easy run + 6 x 20s relaxed strides.", targetRpeMin: 3, targetRpeMax: 4, strides: "6x20s" },
    { dayIndex: 3, title: "5 x 3 min @ RPE 8", details: "5 x 3 min hard with 2 min easy recoveries.", targetRpeMin: 8, targetRpeMax: 8 },
    { dayIndex: 5, title: "Easy", details: "Easy aerobic run.", targetRpeMin: 3, targetRpeMax: 4 },
    { dayIndex: 7, title: "65 min long", details: "Steady long run for 65 minutes.", targetRpeMin: 4, targetRpeMax: 5 },
  ],
  7: [
    { dayIndex: 1, title: "Easy + strides", details: "Easy run + 6 x 20s relaxed strides.", targetRpeMin: 3, targetRpeMax: 4, strides: "6x20s" },
    { dayIndex: 3, title: "4 x 5 min strong threshold", details: "4 x 5 min strong threshold with 2 min easy recoveries.", targetRpeMin: 7, targetRpeMax: 8 },
    { dayIndex: 5, title: "Easy", details: "Easy aerobic run.", targetRpeMin: 3, targetRpeMax: 4 },
    { dayIndex: 7, title: "65 min long", details: "Steady long run for 65 minutes.", targetRpeMin: 4, targetRpeMax: 5 },
  ],
  8: [
    { dayIndex: 1, title: "Easy + strides", details: "Easy run + 6 x 20s relaxed strides.", targetRpeMin: 3, targetRpeMax: 4, strides: "6x20s" },
    { dayIndex: 3, title: "3 x 1 mile @ 5K pace", details: "3 x 1 mile at 5K pace with full easy recoveries.", targetRpeMin: 8, targetRpeMax: 9 },
    { dayIndex: 5, title: "Easy", details: "Easy aerobic run.", targetRpeMin: 3, targetRpeMax: 4 },
    { dayIndex: 7, title: "60 min long", details: "Steady long run for 60 minutes.", targetRpeMin: 4, targetRpeMax: 5 },
  ],
  9: [
    { dayIndex: 1, title: "Easy + strides", details: "Easy run + 6 x 20s relaxed strides.", targetRpeMin: 3, targetRpeMax: 4, strides: "6x20s" },
    { dayIndex: 3, title: "8 x 400 slightly faster than 5K pace", details: "8 x 400 m slightly faster than 5K pace with easy jog recoveries.", targetRpeMin: 8, targetRpeMax: 9 },
    { dayIndex: 5, title: "Easy", details: "Easy aerobic run.", targetRpeMin: 3, targetRpeMax: 4 },
    { dayIndex: 7, title: "60 min long", details: "Steady long run for 60 minutes.", targetRpeMin: 4, targetRpeMax: 5 },
  ],
  10: [
    { dayIndex: 1, title: "Taper: 4 x 400 @ race pace", details: "Early week taper workout: 4 x 400 m at race pace.", targetRpeMin: 7, targetRpeMax: 8 },
    { dayIndex: 3, title: "Easy", details: "Easy run during taper.", targetRpeMin: 3, targetRpeMax: 4 },
    { dayIndex: 5, title: "Easy", details: "Second easy taper run.", targetRpeMin: 3, targetRpeMax: 4 },
    { dayIndex: 7, title: "Race day May 9", details: "Race day. Warm up, race hard, cool down.", targetRpeMin: 9, targetRpeMax: 10 },
  ],
};

export const PLAN_ITEMS: PlanItem[] = Array.from({ length: 10 }, (_, idx) => idx + 1).flatMap((week) => {
  const runItems = (runByWeek[week] ?? []).map((item, runIndex) => ({
    id: `w${week}-run-${runIndex + 1}`,
    week,
    dayIndex: item.dayIndex,
    type: "run" as const,
    title: item.title,
    details: item.details,
    targetRpeMin: item.targetRpeMin,
    targetRpeMax: item.targetRpeMax,
    strides: item.strides,
  }));

  const strengthItems: PlanItem[] = [
    {
      id: `w${week}-strength-1`,
      week,
      dayIndex: 2,
      type: "strength",
      title: "Strength A",
      details: strengthDetails,
      targetRpeMin: 5,
      targetRpeMax: 6,
    },
    {
      id: `w${week}-strength-2`,
      week,
      dayIndex: 6,
      type: "strength",
      title: "Strength B",
      details: strengthDetails,
      targetRpeMin: 5,
      targetRpeMax: 6,
    },
  ];

  return [...runItems, ...strengthItems].sort((a, b) => a.dayIndex - b.dayIndex);
});

export const getPlanItemById = (id: string) => PLAN_ITEMS.find((item) => item.id === id);

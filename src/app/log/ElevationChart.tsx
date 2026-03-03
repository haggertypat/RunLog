"use client";

type ElevationPoint = {
  distanceMi: number;
  elevationFt: number;
};

type ElevationChartProps = {
  profile: ElevationPoint[];
};

const CHART_WIDTH = 760;
const CHART_HEIGHT = 180;
const PADDING = 18;

function formatFeet(value: number) {
  return `${Math.round(value).toLocaleString()} ft`;
}

export default function ElevationChart({ profile }: ElevationChartProps) {
  if (profile.length < 2) {
    return null;
  }

  const minElevation = Math.min(...profile.map((point) => point.elevationFt));
  const maxElevation = Math.max(...profile.map((point) => point.elevationFt));
  const totalDistance = profile[profile.length - 1].distanceMi;

  const distanceDenominator = totalDistance || 1;
  const elevationDenominator = maxElevation - minElevation || 1;

  const points = profile
    .map((point) => {
      const x = PADDING + (point.distanceMi / distanceDenominator) * (CHART_WIDTH - PADDING * 2);
      const y = CHART_HEIGHT - PADDING - ((point.elevationFt - minElevation) / elevationDenominator) * (CHART_HEIGHT - PADDING * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <div className="mt-3 rounded border border-stone-300 p-2 dark:border-stone-600">
      <div className="mb-1 flex items-center justify-between text-xs text-stone-600 dark:text-stone-300">
        <span>Elevation profile (from GPX track points)</span>
        <span>
          {formatFeet(minElevation)} - {formatFeet(maxElevation)}
        </span>
      </div>
      <svg viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} className="h-36 w-full" role="img" aria-label="Elevation profile">
        <line x1={PADDING} y1={CHART_HEIGHT - PADDING} x2={CHART_WIDTH - PADDING} y2={CHART_HEIGHT - PADDING} stroke="currentColor" opacity="0.25" />
        <line x1={PADDING} y1={PADDING} x2={PADDING} y2={CHART_HEIGHT - PADDING} stroke="currentColor" opacity="0.25" />
        <polyline fill="none" stroke="#16a34a" strokeWidth="2.5" points={points} />
      </svg>
      <div className="mt-1 flex justify-between text-[11px] text-stone-500 dark:text-stone-400">
        <span>0 mi</span>
        <span>{totalDistance.toFixed(2)} mi</span>
      </div>
    </div>
  );
}

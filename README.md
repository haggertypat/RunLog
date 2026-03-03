# RunLog

Minimal Next.js (App Router) + React + TypeScript + Tailwind app for tracking a 10-week run plan.

## Features

- `/plan`: week selector with seeded run + strength plan items and “Log this” shortcuts.
- `/log`: create a log entry with optional prefill from `planItemId` query.
- `/log`: GPX import with route map preview and selectable map backgrounds (OpenStreetMap, CARTO, Esri imagery, USGS topo).
- `/progress`: weekly totals (miles, run count) and adherence to planned runs.
- `/journal`: filter, edit, and delete completed logs.
- localStorage persistence under key `run_log_v1`.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Optional custom USGS quadrangle overlay

If you have a single georeferenced quadrangle image you want to use as an overlay in the map preview, set:

```bash
NEXT_PUBLIC_USGS_QUAD_IMAGE_URL=/my-quad-image.png
NEXT_PUBLIC_USGS_QUAD_BOUNDS=south,west,north,east
```

Example bounds format:

```bash
NEXT_PUBLIC_USGS_QUAD_BOUNDS=39.70,-105.06,39.78,-104.96
```

Then choose **USGS Quad (custom image overlay)** in the map background selector on `/log`.

## Data model

- Seed plan: `src/lib/plan.ts`
- Local storage helpers: `src/lib/storage.ts`
- Weekly stats helpers: `src/lib/stats.ts`

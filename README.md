# RunLog

Minimal Next.js (App Router) + React + TypeScript + Tailwind app for tracking a 10-week run plan.

## Features

- `/plan`: week selector with seeded run + strength plan items and “Log this” shortcuts.
- `/log`: create a log entry with optional prefill from `planItemId` query.
- `/progress`: weekly totals (miles, run count) and adherence to planned runs.
- `/journal`: filter, edit, and delete completed logs.
- localStorage persistence under key `run_log_v1`.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Data model

- Seed plan: `src/lib/plan.ts`
- Local storage helpers: `src/lib/storage.ts`
- Weekly stats helpers: `src/lib/stats.ts`

import { Suspense } from "react";
import LogClient from "@/app/log/LogClient";

function Loading() {
  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <p className="text-sm text-slate-600 dark:text-slate-300">Loading…</p>
      </div>
    </section>
  );
}

export default function LogPage() {
  return (
    <Suspense fallback={<Loading />}>
      <LogClient />
    </Suspense>
  );
}

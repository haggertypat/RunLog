import { Suspense } from "react";
import LogClient from "@/app/log/LogClient";

function Loading() {
  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-700 dark:bg-stone-800">
        <p className="text-sm text-stone-600 dark:text-stone-300">Loading…</p>
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

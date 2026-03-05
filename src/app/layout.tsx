import type { Metadata } from "next";
import "@/app/globals.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "RunLog",
  description: "Simple running plan and workout log",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        <main className="mx-auto min-h-screen w-full max-w-4xl p-4 sm:p-6">
          <header className="mb-4 flex items-start justify-between gap-4">
            <div className="space-y-2">
              <Link href="/">
                <h1 className="text-2xl font-bold">Spring 5K Training Plan</h1>
              </Link>
              <nav className="flex flex-wrap gap-2 text-xs">
                <Link href="/plan" className="rounded border border-stone-300 px-2 py-1 dark:border-stone-600">Plan</Link>
                <Link href="/log" className="rounded border border-stone-300 px-2 py-1 dark:border-stone-600">Log</Link>
                <Link href="/logs" className="rounded border border-stone-300 px-2 py-1 dark:border-stone-600">Logs</Link>
                <Link href="/map" className="rounded border border-stone-300 px-2 py-1 dark:border-stone-600">Map</Link>
              </nav>
            </div>
          </header>
          {children}
        </main>
      </body>
    </html>
  );
}

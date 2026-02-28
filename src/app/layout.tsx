import type { Metadata } from "next";
import "@/app/globals.css";
import { Nav } from "@/components/nav";

export const metadata: Metadata = {
  title: "RunLog",
  description: "Simple running plan and workout log",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        <main className="mx-auto min-h-screen w-full max-w-6xl p-4 sm:p-6">
          <header className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">RunLog</h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">Simple training plan + logging</p>
            </div>
          </header>
          <Nav />
          {children}
        </main>
      </body>
    </html>
  );
}

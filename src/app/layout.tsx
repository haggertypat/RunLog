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
        <main className="mx-auto min-h-screen w-full max-w-6xl p-4 sm:p-6">
          <header className="mb-4 flex items-start justify-between gap-4">
            <div>
            <Link
                        href="/"><h1 className="text-2xl font-bold">Spring 5K Training Plan</h1>
                        </Link>
            </div>
          </header>
          {children}
        </main>
      </body>
    </html>
  );
}

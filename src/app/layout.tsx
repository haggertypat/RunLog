import type { Metadata } from "next";
import "@/app/globals.css";
import { Nav } from "@/components/nav";

export const metadata: Metadata = {
  title: "RunLog",
  description: "Simple running plan and workout log",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <main className="mx-auto min-h-screen w-full max-w-4xl p-4 sm:p-6">
          <header className="mb-4">
            <h1 className="text-2xl font-bold">RunLog</h1>
            <p className="text-sm text-slate-600">Simple training plan + logging</p>
          </header>
          <Nav />
          {children}
        </main>
      </body>
    </html>
  );
}

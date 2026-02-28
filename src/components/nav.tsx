"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/plan", label: "Plan" },
  { href: "/log", label: "Log" },
  { href: "/progress", label: "Progress" },
  { href: "/journal", label: "Journal" },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="mb-6 rounded-xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <ul className="flex flex-wrap gap-2">
        {links.map((link) => {
          const active = pathname === link.href;
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                className={`inline-block rounded-lg px-3 py-2 text-sm font-medium ${
                  active
                    ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
                }`}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

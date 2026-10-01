"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface NavLink {
  href: string;
  label: string;
  /** A count next to the label, e.g. the open faults of the technical staff. */
  badge?: { count: number; title: string };
}

export function NavLinks({ links }: { links: NavLink[] }) {
  const pathname = usePathname();
  return (
    <nav className="flex items-center gap-1 text-sm">
      {links.map(({ href, label, badge }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`rounded-md px-3 py-2 font-medium ${
              active ? "bg-sky-50 text-sky-800" : "text-neutral-700 hover:bg-neutral-100"
            }`}
          >
            {label}
            {badge && badge.count > 0 && (
              <span title={badge.title} className="ml-1.5 rounded-full bg-red-600 px-1.5 py-0.5 text-xs font-semibold text-white tabular-nums">
                <span aria-hidden="true">{badge.count}</span>
                <span className="sr-only">{badge.title}</span>
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

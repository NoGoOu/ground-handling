"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLinks({ links }: { links: { href: string; label: string }[] }) {
  const pathname = usePathname();
  return (
    <nav className="flex items-center gap-1 text-sm">
      {links.map(({ href, label }) => {
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
          </Link>
        );
      })}
    </nav>
  );
}

import Link from "next/link";
import { messages } from "@/lib/messages";

const t = messages.staffing;

/** The two views of the staffing demand: a day, and a period of at most 31 days. */
export function StaffingViews({ active, date }: { active: "daily" | "overview"; date?: string }) {
  const tab = (key: "daily" | "overview", href: string, label: string) => (
    <Link
      href={href}
      aria-current={active === key ? "page" : undefined}
      className={`rounded-lg px-3 py-1.5 text-sm font-medium ${active === key ? "bg-sky-700 text-white" : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"}`}
    >
      {label}
    </Link>
  );
  return (
    <nav className="flex flex-wrap gap-2">
      {tab("daily", date ? `/staffing?date=${date}` : "/staffing", t.daily)}
      {tab("overview", "/staffing/overview", t.overview)}
    </nav>
  );
}

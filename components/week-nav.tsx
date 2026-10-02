import Link from "next/link";
import { messages } from "@/lib/messages";
import { addDays } from "@/lib/time";

const t = messages.roster;

/** Week picker of the roster pages, Monday to Sunday; works without JavaScript (plain GET form). */
export function WeekNav({ basePath, weekStart, thisWeek }: { basePath: string; weekStart: string; thisWeek: string }) {
  const href = (date: string) => `${basePath}?date=${date}`;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link href={href(addDays(weekStart, -7))} className="btn btn-secondary" aria-label={t.previousWeek}>
        <span className="sm:hidden">‹</span>
        <span className="hidden sm:inline">{t.previousWeek}</span>
      </Link>
      <form action={basePath} className="flex items-center gap-2">
        <label className="sr-only" htmlFor="date">
          {messages.dateNav.date}
        </label>
        <input id="date" type="date" name="date" defaultValue={weekStart} className="input w-auto py-1.5" />
        <button type="submit" className="btn btn-secondary">
          {messages.dateNav.show}
        </button>
      </form>
      <Link href={href(addDays(weekStart, 7))} className="btn btn-secondary" aria-label={t.nextWeek}>
        <span className="sm:hidden">›</span>
        <span className="hidden sm:inline">{t.nextWeek}</span>
      </Link>
      {weekStart !== thisWeek && (
        <Link href={basePath} className="btn btn-secondary">
          {t.thisWeek}
        </Link>
      )}
    </div>
  );
}

import Link from "next/link";
import { messages } from "@/lib/messages";
import { addDays } from "@/lib/time";

const t = messages.dateNav;

/** Day picker for list pages; works without JavaScript (plain GET form). */
export function DateNav({ basePath, date, today }: { basePath: string; date: string; today: string }) {
  const href = (d: string) => `${basePath}?date=${d}`;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link href={href(addDays(date, -1))} className="btn btn-secondary" aria-label={t.previous}>
        <span className="sm:hidden">‹</span>
        <span className="hidden sm:inline">{t.previous}</span>
      </Link>
      <form action={basePath} className="flex items-center gap-2">
        <label className="sr-only" htmlFor="date">
          {t.date}
        </label>
        <input id="date" type="date" name="date" defaultValue={date} className="input w-auto py-1.5" />
        <button type="submit" className="btn btn-secondary">
          {t.show}
        </button>
      </form>
      <Link href={href(addDays(date, 1))} className="btn btn-secondary" aria-label={t.next}>
        <span className="sm:hidden">›</span>
        <span className="hidden sm:inline">{t.next}</span>
      </Link>
      {date !== today && (
        <Link href={basePath} className="btn btn-secondary">
          {t.today}
        </Link>
      )}
    </div>
  );
}

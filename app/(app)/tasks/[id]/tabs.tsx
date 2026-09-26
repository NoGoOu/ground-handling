import Link from "next/link";
import { messages } from "@/lib/messages";

const t = messages.flightMessages;

/** The task view's tabs: its milestones, and the messages of its flight (7. mérföldkő). */
export function TaskTabs({ taskId, active }: { taskId: string; active: "task" | "messages" }) {
  const tabs = [
    { key: "task", href: `/tasks/${taskId}`, label: t.tabTask },
    { key: "messages", href: `/tasks/${taskId}/messages`, label: t.tabMessages },
  ] as const;
  return (
    <nav className="flex gap-1 border-b border-neutral-200">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          aria-current={tab.key === active ? "page" : undefined}
          className={
            tab.key === active
              ? "-mb-px rounded-t-lg border border-b-white border-neutral-200 bg-white px-4 py-2 font-medium"
              : "px-4 py-2 text-sky-700 hover:underline"
          }
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

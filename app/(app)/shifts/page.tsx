import { DateNav } from "@/components/date-nav";
import { listShiftsForDay } from "@/lib/data/shifts";
import { listAgentOptions } from "@/lib/data/users";
import { messages } from "@/lib/messages";
import { fmt } from "@/lib/messages/format";
import { canManageShifts } from "@/lib/permissions";
import { dateParam } from "@/lib/search-params";
import { requireCapability } from "@/lib/session";
import { formatTimeOnDay, toLocalDate, toLocalDateTimeInput } from "@/lib/time";
import { diffMinutes } from "@/lib/turnaround";
import { createShift, deleteShift, updateShift } from "./actions";
import { NewShiftForm, ShiftRowForm } from "./shift-forms";

const t = messages.shiftForm;

export default async function ShiftsPage(props: PageProps<"/shifts">) {
  await requireCapability(canManageShifts);
  const { date: dateValue } = await props.searchParams;
  const date = dateParam(dateValue);
  const shifts = await listShiftsForDay(date);
  const agents = await listAgentOptions(shifts.map((shift) => shift.user.id));

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold">{messages.pages.shifts}</h1>
        <p className="text-sm text-neutral-600">{fmt(t.count, { count: shifts.length })}</p>
      </div>
      <DateNav basePath="/shifts" date={date} today={toLocalDate(new Date())} />
      <NewShiftForm action={createShift} agents={agents} day={date} />

      {shifts.length === 0 ? (
        <p className="rounded-lg border border-dashed border-neutral-300 p-8 text-center text-neutral-600">{t.empty}</p>
      ) : (
        <ul className="divide-y divide-neutral-100 overflow-hidden rounded-xl border border-neutral-200 bg-white">
          {shifts.map((shift) => (
            <ShiftRowForm
              key={shift.id}
              saveAction={updateShift.bind(null, shift.id)}
              deleteAction={deleteShift.bind(null, shift.id)}
              agents={agents}
              initial={{
                userId: shift.user.id,
                startsAt: toLocalDateTimeInput(shift.startsAt),
                endsAt: toLocalDateTimeInput(shift.endsAt),
                note: shift.note ?? "",
              }}
            />
          ))}
        </ul>
      )}

      {shifts.length > 0 && (
        <p className="text-sm text-neutral-600">
          {shifts
            .map(
              (shift) =>
                `${shift.user.name}: ${formatTimeOnDay(shift.startsAt, date)} – ${formatTimeOnDay(shift.endsAt, date)} (${fmt(
                  t.duration,
                  { hours: Math.round((diffMinutes(shift.endsAt, shift.startsAt) / 60) * 10) / 10 },
                )})`,
            )
            .join(" · ")}
        </p>
      )}
    </div>
  );
}

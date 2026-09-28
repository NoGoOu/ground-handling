import { parsedOf } from "@/lib/data/messages";
import { prisma } from "@/lib/db";
import { PROCESSED_SLOT_TITLES } from "@/lib/telex/adexp";
import { slotOf, type Slot } from "@/lib/telex/slot";

// The slot of a departure (CLAUDE.md, 8. mérföldkő): from the current SAM or
// SRM of the flight's departure part. It never changes the ETD.

export interface FlightSlot extends Slot {
  messageId: string;
  receivedAt: Date;
}

export async function currentSlots(flightIds: readonly string[]): Promise<Map<string, FlightSlot>> {
  if (flightIds.length === 0) return new Map();
  const rows = await prisma.message.findMany({
    where: { flightId: { in: [...flightIds] }, part: "DEPARTURE_PART", current: true, type: { in: PROCESSED_SLOT_TITLES } },
    orderBy: { receivedAt: "asc" },
  });
  const slots = new Map<string, FlightSlot>();
  for (const row of rows) {
    const parsed = parsedOf(row);
    const slot = parsed.type === "SLOT" ? slotOf(parsed.data) : null;
    // The latest counts when a flight has more flight plans.
    if (slot && row.flightId) slots.set(row.flightId, { ...slot, messageId: row.id, receivedAt: row.receivedAt });
  }
  return slots;
}

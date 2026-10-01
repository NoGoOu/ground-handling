// Faults and the state of the equipment (CLAUDE.md, 11. mérföldkő,
// "Hibajegy"): open → in progress (taken over) → closed (fixed or not a
// fault). An open fault may be closed without being taken over; a closed one
// is never reopened, a new fault is reported instead (approved decision 4).

export type FaultStatus = "OPEN" | "IN_PROGRESS" | "CLOSED";
export type EquipmentStatus = "OPERATIONAL" | "OUT_OF_SERVICE" | "RETIRED";

const FAULT_STEPS: Record<FaultStatus, FaultStatus[]> = {
  OPEN: ["IN_PROGRESS", "CLOSED"],
  IN_PROGRESS: ["CLOSED"],
  CLOSED: [],
};

export function canMoveFault(from: FaultStatus, to: FaultStatus): boolean {
  return FAULT_STEPS[from].includes(to);
}

/** A retired piece of equipment is out of use for good: nothing is reported on it. */
export const isReportable = (status: EquipmentStatus) => status !== "RETIRED";

/**
 * The equipment's status after a report: marked out of service, an
 * operational piece becomes out of service at once; otherwise it stays.
 * Null when nothing changes.
 */
export function statusOnReport(current: EquipmentStatus, outOfService: boolean): EquipmentStatus | null {
  return outOfService && current === "OPERATIONAL" ? "OUT_OF_SERVICE" : null;
}

/**
 * The status changes the technical staff make by hand, each logged: out of
 * service and back (setting it back is always their own step, never the
 * closing of a fault on its own), retiring, and bringing a retired piece back.
 */
const EQUIPMENT_STEPS: Record<EquipmentStatus, EquipmentStatus[]> = {
  OPERATIONAL: ["OUT_OF_SERVICE", "RETIRED"],
  OUT_OF_SERVICE: ["OPERATIONAL", "RETIRED"],
  RETIRED: ["OPERATIONAL"],
};

export function canMoveEquipment(from: EquipmentStatus, to: EquipmentStatus): boolean {
  return EQUIPMENT_STEPS[from].includes(to);
}

/** Who may make a change of status: retiring and bringing back is managing equipment; the rest is handling faults. */
export function equipmentStepNeeds(from: EquipmentStatus, to: EquipmentStatus): "EQUIPMENT_MANAGE" | "FAULT_MANAGE" {
  return to === "RETIRED" || from === "RETIRED" ? "EQUIPMENT_MANAGE" : "FAULT_MANAGE";
}

export const isOpenFault = (status: FaultStatus) => status !== "CLOSED";

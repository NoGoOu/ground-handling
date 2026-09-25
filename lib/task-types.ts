// The tasks a new flight gets (CLAUDE.md, 5. mérföldkő): one per active task
// type of its airline, each with the template set for it; the airline's
// primary task type gives the primary task. Later changes to the task types
// only reach new flights. Pure, shared by the flight form and the import.

export interface AirlineTaskTypeSpec {
  taskTypeId: string;
  /** Sorts the tasks; the task types are few, the code is short and unique. */
  code: string;
  templateId: string;
  active: boolean;
  isPrimary: boolean;
}

export interface TaskSpec {
  taskTypeId: string;
  templateId: string;
  isPrimary: boolean;
}

/**
 * One task per active task type, by code. Exactly one is primary: the
 * airline's primary task type, or, should it not be active, the first one.
 * Empty when the airline has no active task type: it cannot take flights.
 */
export function tasksForNewFlight(types: readonly AirlineTaskTypeSpec[]): TaskSpec[] {
  const active = types.filter((type) => type.active).sort((a, b) => (a.code < b.code ? -1 : a.code > b.code ? 1 : 0));
  const primary = active.find((type) => type.isPrimary) ?? active[0];
  return active.map((type) => ({
    taskTypeId: type.taskTypeId,
    templateId: type.templateId,
    isPrimary: type === primary,
  }));
}

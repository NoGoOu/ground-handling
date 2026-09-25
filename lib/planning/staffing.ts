// Whether a plan day's positions can be staffed (CLAUDE.md, 6. mérföldkő,
// "Tervező"): every position needs its own agent who holds all the
// qualifications the position needs on that day. That is a bipartite matching
// between positions and agents; counting the people per qualification is not
// enough (3 with PRM and 3 with DG, only one with both: at most one position
// may need both). Pure and deterministic: positions and agents in the given order.

/** The agents of the day: the ids of each one's usable qualifications. */
export interface Staffing {
  agents: readonly ReadonlySet<string>[];
}

export const covers = (agent: ReadonlySet<string>, required: readonly string[]) => required.every((id) => agent.has(id));

/**
 * A maximum matching (augmenting paths): for each position the index of its
 * agent, or null when it stays empty.
 */
export function matchPositions(required: readonly (readonly string[])[], staffing: Staffing): (number | null)[] {
  const agentOf: (number | null)[] = required.map(() => null);
  const positionOf: (number | null)[] = staffing.agents.map(() => null);
  const candidates = required.map((needs) =>
    staffing.agents.flatMap((agent, index) => (covers(agent, needs) ? [index] : [])),
  );
  const tryPosition = (position: number, seen: boolean[]): boolean => {
    for (const agent of candidates[position]) {
      if (seen[agent]) continue;
      seen[agent] = true;
      const holder = positionOf[agent];
      if (holder === null || tryPosition(holder, seen)) {
        positionOf[agent] = position;
        agentOf[position] = agent;
        return true;
      }
    }
    return false;
  };
  required.forEach((_, position) => tryPosition(position, staffing.agents.map(() => false)));
  return agentOf;
}

/** How many positions stay empty at best: 0 when the day can be staffed. */
export function deficiency(required: readonly (readonly string[])[], staffing: Staffing): number {
  return matchPositions(required, staffing).filter((agent) => agent === null).length;
}

export interface Shortage {
  /** Indexes of the positions a best staffing leaves empty. */
  unfilled: number[];
  /** Per qualification a position needs: how many positions need it, how many agents hold it. */
  perQualification: { qualificationId: string; need: number; have: number }[];
}

/** The shortage of a day, for the plan to show ("PRM: kell 4, van 3"). */
export function shortage(required: readonly (readonly string[])[], staffing: Staffing): Shortage {
  const matched = matchPositions(required, staffing);
  const ids = [...new Set(required.flat())].sort();
  return {
    unfilled: matched.flatMap((agent, index) => (agent === null ? [index] : [])),
    perQualification: ids.map((qualificationId) => ({
      qualificationId,
      need: required.filter((needs) => needs.includes(qualificationId)).length,
      have: staffing.agents.filter((agent) => agent.has(qualificationId)).length,
    })),
  };
}

/** The union of what the windows of a position need, sorted. */
export function positionRequirement(windows: readonly { requires?: readonly string[] }[]): string[] {
  return [...new Set(windows.flatMap((w) => w.requires ?? []))].sort();
}

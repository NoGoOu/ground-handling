// The placeholder values of the 10. mérföldkő in one place. They are only the
// defaults: every one of them is a parameter saved with its training or exam
// sheet and can be changed there.

/** The OJT requirement of a new training. */
export const DEFAULT_OJT_REQUIREMENT = {
  /** How many suitable practices are needed. */
  requiredCount: 10,
  /** The share of the required milestones of the part that have an actual time. */
  minCompletenessPercent: 100,
  /** The share of the recorded rows with a green or yellow deviation; 0 means no threshold. */
  minOnTimePercent: 0,
} as const;

/** How a question with several right answers scores on a new exam sheet. */
export const DEFAULT_MULTIPLE_SCORING = "ALL_OR_NOTHING" as const;

/** How far back the tasks of a practical exam can be chosen from, in days. */
export const PRACTICAL_EXAM_LOOKBACK_DAYS = 14;

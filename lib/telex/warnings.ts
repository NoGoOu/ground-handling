// Warnings of the message processing (7. mérföldkő). They never stop the
// processing; the texts are in lib/messages/hu.ts (telex.warnings), so a
// warning is stored as its code and parameters.

export const WARNING_CODES = [
  // The header line is missing or not "flight/date.registration…".
  "noHeader",
  "badHeader",
  // A line or a field the parser does not know; the rest is still read.
  "unknownLine",
  "unknownField",
  "badTime",
  // DL: a code that is not one, or not as many durations as codes.
  "badDelay",
  "delayCount",
  "badPosition",
  // Lines after CPM END.
  "afterEnd",
  // UCM: IN and OUT in one message, or neither.
  "mixedDirections",
  "noDirection",
  // The flight part has another registration (e.g. an aircraft change).
  "registrationMismatch",
] as const;

export type WarningCode = (typeof WARNING_CODES)[number];

export type WarningParams = Record<string, string | number>;

export interface TelexWarning {
  code: WarningCode;
  params?: WarningParams;
}

export const warn = (code: WarningCode, params?: WarningParams): TelexWarning => (params ? { code, params } : { code });

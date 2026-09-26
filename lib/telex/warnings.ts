// Warnings of the message processing (7. mérföldkő). They never stop the
// processing; the texts are in lib/messages/hu.ts (telex.warnings), so a
// warning is stored as its code and parameters.

export const WARNING_CODES = [
  // The header line is missing or not "flight/date.registration…".
  "noHeader",
  "badHeader",
] as const;

export type WarningCode = (typeof WARNING_CODES)[number];

export type WarningParams = Record<string, string | number>;

export interface TelexWarning {
  code: WarningCode;
  params?: WarningParams;
}

export const warn = (code: WarningCode, params?: WarningParams): TelexWarning => (params ? { code, params } : { code });

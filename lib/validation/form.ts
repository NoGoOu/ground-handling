import type { z } from "zod";

export type FieldErrors = Record<string, string>;

/** Reads the named fields of a form as strings (missing fields become ""). */
export function formValues<const K extends string>(formData: FormData, keys: readonly K[]): Record<K, string> {
  const values = {} as Record<K, string>;
  for (const key of keys) {
    const value = formData.get(key);
    values[key] = typeof value === "string" ? value : "";
  }
  return values;
}

/** First error message per top-level field. */
export function fieldErrors(error: z.ZodError): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    errors[key] ??= issue.message;
  }
  return errors;
}

/** State shared by the form server actions and their client forms. */
export interface FormState<V extends Record<string, string> = Record<string, string>> {
  errors?: FieldErrors;
  /** Submitted values, so the form keeps them after a failed attempt. */
  values?: Partial<V>;
  message?: string;
}

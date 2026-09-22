/** Fills {placeholders} in a message: fmt("+{minutes} perc", { minutes: 6 }) → "+6 perc". */
export function fmt(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}

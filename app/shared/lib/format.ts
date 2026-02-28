/** Format a date string as "1. Feb. 2026" (de-CH locale). */
export function formatDate(dateStr: string, includeTime = false): string {
  try {
    const opts: Intl.DateTimeFormatOptions = {
      day: "numeric",
      month: "short",
      year: "numeric",
    };
    if (includeTime) {
      opts.hour = "2-digit";
      opts.minute = "2-digit";
    }
    return new Date(dateStr).toLocaleDateString("de-CH", opts);
  } catch {
    return dateStr;
  }
}

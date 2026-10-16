// Immutable formatter, initialized with the module rather than on every HTTP
// request. Preserve Santiago's real time zone (including daylight saving).
const dayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Santiago", year: "numeric", month: "2-digit", day: "2-digit",
});

export function chileanDay(date = new Date()) {
  return dayFormatter.format(date);
}

/** Legacy calendar dates stay literal; timestamped publications use Chile time. */
export function storedChileanDay(value:string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)?value:chileanDay(new Date(value));
}

// Immutable formatter, initialized with the module rather than on every HTTP
// request. Preserve Santiago's real time zone (including daylight saving).
const dayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Santiago", year: "numeric", month: "2-digit", day: "2-digit",
});

export function chileanDay(date = new Date()) {
  return dayFormatter.format(date);
}

/** Inclusive calendar-day cutoff matching the Chilean day stored by event APIs. */
export function profileStatisticsCutoff(daysBack: number, now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const value = (type: string) => parts.find(part => part.type === type)!.value;
  const cutoff = new Date(`${value("year")}-${value("month")}-${value("day")}T12:00:00Z`);
  cutoff.setUTCDate(cutoff.getUTCDate() - daysBack);
  return cutoff.toISOString().slice(0, 10);
}

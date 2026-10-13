/** D1 CURRENT_TIMESTAMP is UTC, even though it has no timezone suffix. */
export function adminAuditInstant(value: string) {
  return value.includes("T") ? value : `${value.replace(" ", "T")}Z`;
}

export function adminAuditDate(value: string) {
  const date = new Date(adminAuditInstant(value));
  return Number.isNaN(date.getTime()) ? "Fecha no disponible" : new Intl.DateTimeFormat("es-CL", {
    timeZone: "America/Santiago", dateStyle: "medium", timeStyle: "short",
  }).format(date);
}

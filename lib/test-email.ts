/** Reserved .invalid addresses must never be passed to an email provider. */
export function isReservedTestEmail(email: string) {
  const domain = email.trim().toLowerCase().split("@").at(-1) ?? "";
  return domain === "invalid" || domain.endsWith(".invalid");
}

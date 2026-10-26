/** Search formatted Chilean numbers and local subscriber digits alike. The
 * original digits also remain a term so partial numbers keep working. */
export function samplePhoneSearchTerms(value: unknown): string[] {
  if (typeof value !== "string" || value.length > 80) return [];
  const input = value.trim();
  if (!input || !/^[+\d\s().-]+$/.test(input)) return [];
  const digits = input.replace(/\D/g, "");
  if (!digits) return [];
  let local = digits;
  if (digits.startsWith("0056") && digits.length > 4) local = digits.slice(4);
  else if (digits.startsWith("56") && (digits.length > 9 || input.startsWith("+") || (digits.startsWith("569") && digits.length > 3))) local = digits.slice(2);
  else if (digits.length === 10 && digits.startsWith("0")) local = digits.slice(1);
  return [...new Set([digits, local].filter(Boolean))];
}

export function boundedSampleFilter(value: unknown, maxLength = 120) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

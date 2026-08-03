// Shared limits for the report form and its server endpoint. Keeping these
// values in a browser-safe module prevents the UI from importing database code.
export const MAX_REPORT_EVIDENCE_IMAGES = 10;
export const MAX_REPORT_EVIDENCE_BYTES = 5_000_000;
export const MAX_REPORT_EVIDENCE_TOTAL_BYTES = 25_000_000;

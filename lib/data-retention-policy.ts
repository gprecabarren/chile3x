export const RETENTION_POLICY_DATE = "2026-10-14";
// A 30-day rollout window protects existing uploads from retroactive erasure.
export const RETENTION_ENFORCE_AT = "2026-11-13T12:00:00.000Z";
export const RETENTION_DAYS = { identity:90, medical:30, closedReport:180, conversation:365, audit:365, operational:30, expiredSession:30, deletionHistory:180 } as const;
export function verificationRetentionExpiresAt(kind:"identity"|"medical", uploadedAt = new Date()) {
  return new Date(Math.max(uploadedAt.getTime()+RETENTION_DAYS[kind]*86400_000,Date.parse(RETENTION_ENFORCE_AT))).toISOString();
}

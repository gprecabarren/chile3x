import { and, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { users } from "@/db/schema";

export function emailVerificationFilter(state: string) {
  const due = sql`julianday(coalesce(${users.emailVerificationDeadline}, datetime(${users.createdAt}, '+7 days'))) <= julianday('now')`;
  const pending = and(isNull(users.emailVerifiedAt), sql`${users.role} <> 'admin'`);
  if (state === "verified") return isNotNull(users.emailVerifiedAt);
  if (state === "unverified") return pending;
  if (state === "exempt") return and(pending, isNotNull(users.emailVerificationExemptAt));
  if (state === "blocked") return and(pending, eq(users.isActive, true), isNull(users.emailVerificationExemptAt), due);
  if (state === "grace") return and(pending, isNull(users.emailVerificationExemptAt), sql`not (${due})`);
  return undefined;
}

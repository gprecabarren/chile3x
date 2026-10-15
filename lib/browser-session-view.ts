import { cache } from "react";
import { getCurrentAdmin, getVerificationUser, sha256 } from "@/lib/auth";
import type { SessionView } from "@/lib/session-view-policy";

/** A display fingerprint, never an authentication credential or permission. */
export const getBrowserSessionView = cache(async (): Promise<SessionView> => {
  const [admin, account] = await Promise.all([getCurrentAdmin(), getVerificationUser()]);
  const user = admin ?? account;
  const mode = admin ? "admin" : account ? "account" : null;
  return { mode, identity: user ? await sha256(`${mode}:${user.id}`) : null };
});

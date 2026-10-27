import { getCurrentAdmin } from "@/lib/auth";
import { browserSessionState } from "./session-policy";

/** Administrative or ambiguous browser identities are not visitor traffic.
 * Excluding the cookie context also covers old admin tabs during logout or
 * grant revocation; an invalid session must not become an anonymous click. */
export async function isAdministrativeContactTraffic(request: Request) {
  const session = browserSessionState(request.headers.get("cookie"));
  if (session.conflict || session.mode === "admin") return true;
  return Boolean(await getCurrentAdmin());
}

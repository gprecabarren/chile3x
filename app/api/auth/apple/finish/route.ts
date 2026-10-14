import { NextRequest, NextResponse } from "next/server";
import { createUserSession, setUserSessionCookie, revokeAuthAttemptSessions, safeAccountReturnTo } from "@/lib/auth";
import { APPLE_COMPLETION_COOKIE, APPLE_COMPLETION_COOKIE_PATH, consumeAppleSessionCompletion } from "@/lib/apple-session-completion";
export async function GET(request: NextRequest) {
  const completion=await consumeAppleSessionCompletion(request.cookies.get(APPLE_COMPLETION_COOKIE)?.value);
  const response=NextResponse.redirect(new URL(completion?safeAccountReturnTo(completion.returnTo):"/ingresar?error=apple_state",request.url),303);
  response.headers.set("cache-control","private, no-store");response.headers.set("x-robots-tag","noindex, nofollow");
  response.cookies.delete({name:APPLE_COMPLETION_COOKIE,path:APPLE_COMPLETION_COOKIE_PATH});
  if(!completion)return response;
  try {
    // The same-origin GET receives the *current* browser credential, even if
    // another login occurred while the Apple dialog was open.
    const token=await createUserSession(completion.userId,request,"apple");
    await revokeAuthAttemptSessions(completion.previousSessions);
    setUserSessionCookie(response,token);
    return response;
  } catch {return NextResponse.redirect(new URL("/ingresar?error=apple_admin_email",request.url),303);}
}

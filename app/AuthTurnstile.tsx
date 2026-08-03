"use client";
import { useCallback, useState } from "react";
import { TurnstileWidget } from "@/app/perfil/TurnstileWidget";
import { TURNSTILE_PROFILE_REVIEW_SITEKEY } from "@/lib/turnstile";

export function AuthTurnstile({ action }: { action: string }) {
  const [token, setToken] = useState(""); const [error, setError] = useState("");
  const onToken = useCallback((value: string) => { setToken(value); if (value) setError(""); }, []);
  const onError = useCallback((value: string) => setError(value), []);
  return <div className="auth-turnstile"><input type="hidden" name="cf-turnstile-response" value={token} /><TurnstileWidget action={action} sitekey={TURNSTILE_PROFILE_REVIEW_SITEKEY} resetKey={0} onToken={onToken} onError={onError} />{error && <small role="alert">{error}</small>}</div>;
}

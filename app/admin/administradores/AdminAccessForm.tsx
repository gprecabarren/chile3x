"use client";
import { useState } from "react";
import { ActionButton } from "@/app/ActionButton";
import { normalizeGithubLogin, validAdminEmail, validGithubLogin, ADMIN_ACCESS_NOTICES } from "@/lib/admin-access-validation";

export function AdminAccessForm() {
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  return <form action="/api/admin/administradores" method="post" onSubmit={async event => {
    event.preventDefault(); if (busy) return;
    const data = new FormData(event.currentTarget);
    const invalid = !validGithubLogin(normalizeGithubLogin(String(data.get("github_login") ?? ""))) ? "invalid_login" : !validAdminEmail(String(data.get("protected_email") ?? "").trim().toLowerCase()) ? "invalid_email" : null;
    if (invalid) { setError(ADMIN_ACCESS_NOTICES[invalid]); return; }
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/admin/administradores", { method: "POST", body: data, headers: { accept: "application/json" } });
      const result = await response.json() as { redirectTo?: string; message?: string };
      if (response.ok && result.redirectTo?.startsWith("/admin/administradores?")) { window.location.assign(result.redirectTo); return; }
      setError(result.message || "No se pudo guardar la autorización. Recarga la página e inténtalo de nuevo.");
    } catch { setError("No se pudo comprobar el acceso. Revisa la conexión antes de intentarlo nuevamente."); }
    finally { setBusy(false); }
  }}>
    <label>Usuario de GitHub<div className="admin-access-login-field"><span aria-hidden="true">@</span><input name="github_login" required minLength={1} maxLength={40} autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="usuario-github" disabled={busy} /></div><small>Es el usuario que aparece debajo del nombre visible en GitHub, o en github.com/usuario.</small></label>
    <label>Correo verificado en GitHub<input name="protected_email" type="email" required maxLength={160} autoComplete="off" placeholder="persona@correo.com" disabled={busy} /><small>Puede ser privado. GitHub deberá confirmar que pertenece a esa cuenta y está verificado al ingresar.</small></label>
    <label>Nivel de acceso<select name="access_level" defaultValue="moderator" disabled={busy}><option value="moderator">Moderación</option><option value="administrator">Administrador</option><option value="editor">Noticias</option><option value="support">Soporte</option></select></label>
    <ActionButton className="button button-primary" type="submit" disabled={busy}>{busy ? "Comprobando en GitHub…" : "Autorizar acceso"}</ActionButton>
    {error && <p className="admin-access-form-error" role="alert">{error}</p>}
  </form>;
}

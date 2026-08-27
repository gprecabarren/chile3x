"use client";

import { useState } from "react";
import { MIN_PASSWORD_LENGTH, passwordRequirementText } from "@/lib/password-policy";

const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

function createPassword(length = 14) {
  const values = new Uint32Array(length);
  crypto.getRandomValues(values);
  return Array.from(values, (value) => alphabet[value % alphabet.length]).join("");
}

function CopyIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false"><rect x="8" y="8" width="11" height="11" rx="2" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M16 8V6.5A2.5 2.5 0 0 0 13.5 4h-7A2.5 2.5 0 0 0 4 6.5v7A2.5 2.5 0 0 0 6.5 16H8" fill="none" stroke="currentColor" strokeWidth="2" /></svg>;
}

export function PasswordChangeForm() {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [copyStatus, setCopyStatus] = useState("");

  function generatePassword() {
    const nextPassword = createPassword();
    setPassword(nextPassword);
    setConfirmation(nextPassword);
    setCopyStatus("");
  }

  async function copyPassword() {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      setCopyStatus("Clave copiada.");
    } catch {
      setCopyStatus("Cópiala manualmente.");
    }
  }

  return <div className="account-password-fields">
    <label>Nueva contraseña<div className="account-password-entry"><input name="password" type="password" required minLength={MIN_PASSWORD_LENGTH} autoComplete="new-password" value={password} placeholder="Escribe o genera una contraseña" onChange={(event) => { setPassword(event.target.value); setCopyStatus(""); }} /><button className="button button-outline" type="button" onClick={generatePassword}>Generar clave</button><button className="button button-outline account-password-copy-button" type="button" disabled={!password} onClick={copyPassword} aria-label="Copiar nueva contraseña" title="Copiar nueva contraseña"><CopyIcon /><span className="sr-only">Copiar nueva contraseña</span></button></div><small>{passwordRequirementText} Puedes crear una al azar y guardarla con seguridad.</small></label>
    <label>Confirma la nueva contraseña<input name="password_confirmation" type="password" required minLength={MIN_PASSWORD_LENGTH} autoComplete="new-password" value={confirmation} placeholder="Vuelve a escribir la misma contraseña" onChange={(event) => setConfirmation(event.target.value)} /></label>
    {copyStatus && <span className="account-password-copy-status" role="status">{copyStatus}</span>}
  </div>;
}

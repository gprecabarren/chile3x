"use client";

import { useState } from "react";
import { MIN_PASSWORD_LENGTH, passwordRequirementText } from "@/lib/password-policy";

const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

function CopyIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false"><rect x="8" y="8" width="11" height="11" rx="2" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M16 8V6.5A2.5 2.5 0 0 0 13.5 4h-7A2.5 2.5 0 0 0 4 6.5v7A2.5 2.5 0 0 0 6.5 16H8" fill="none" stroke="currentColor" strokeWidth="2" /></svg>;
}

function createPassword(length = 14) {
  const values = new Uint32Array(length);
  crypto.getRandomValues(values);
  return Array.from(values, (value) => alphabet[value % alphabet.length]).join("");
}

export function AdminPasswordField({ label, submitLabel }: { label: string; submitLabel: string }) {
  const [password, setPassword] = useState("");
  const [copyStatus, setCopyStatus] = useState("");

  async function copyPassword() {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      setCopyStatus("Copiada");
    } catch {
      setCopyStatus("Cópiala manualmente");
    }
  }

  function generatePassword() {
    setPassword(createPassword());
    setCopyStatus("");
  }

  return <div className="admin-password-field"><span>{label}</span><div><input name="password" type="text" required minLength={MIN_PASSWORD_LENGTH} autoComplete="new-password" value={password} placeholder="Escribe o genera una contraseña" onChange={(event) => { setPassword(event.target.value); setCopyStatus(""); }} /><button className="button button-outline" type="button" onClick={generatePassword}>Generar clave</button><button className="button button-outline admin-password-copy-button" type="button" onClick={copyPassword} disabled={!password} aria-label="Copiar contraseña" title="Copiar contraseña"><CopyIcon /><span className="sr-only">Copiar contraseña</span></button></div><small>{passwordRequirementText} Puedes generar una clave y copiarla para compartirla de forma segura. Chile3X nunca guarda la clave en texto visible.</small>{copyStatus && <span className="admin-password-copy-status" role="status">{copyStatus}</span>}<button className="button button-primary" type="submit">{submitLabel}</button></div>;
}

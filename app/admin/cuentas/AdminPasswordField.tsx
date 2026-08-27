"use client";

import { useState } from "react";
import { MIN_PASSWORD_LENGTH, passwordRequirementText } from "@/lib/password-policy";

const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

function CopyIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false"><rect x="8" y="8" width="11" height="11" rx="2" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M16 8V6.5A2.5 2.5 0 0 0 13.5 4h-7A2.5 2.5 0 0 0 4 6.5v7A2.5 2.5 0 0 0 6.5 16H8" fill="none" stroke="currentColor" strokeWidth="2" /></svg>;
}

function VisibilityIcon({ visible }: { visible: boolean }) {
  return visible
    ? <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false"><path d="M2.5 12s3.3-5.5 9.5-5.5S21.5 12 21.5 12 18.2 17.5 12 17.5 2.5 12 2.5 12Z" fill="none" stroke="currentColor" strokeWidth="2" /><circle cx="12" cy="12" r="2.6" fill="none" stroke="currentColor" strokeWidth="2" /></svg>
    : <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false"><path d="M3 3l18 18M9.8 6.8A10.7 10.7 0 0 1 12 6.5c6.2 0 9.5 5.5 9.5 5.5a16.8 16.8 0 0 1-3 3.6M6.4 9A16.5 16.5 0 0 0 2.5 12S5.8 17.5 12 17.5c1.3 0 2.5-.2 3.5-.7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><path d="M10.2 10.2a2.6 2.6 0 0 0 3.6 3.6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>;
}

function createPassword(length = 14) {
  const values = new Uint32Array(length);
  crypto.getRandomValues(values);
  return Array.from(values, (value) => alphabet[value % alphabet.length]).join("");
}

export function AdminPasswordField({ label, submitLabel }: { label: string; submitLabel: string }) {
  const [password, setPassword] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const [showPassword, setShowPassword] = useState(true);

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

  return <div className="admin-password-field"><span>{label}</span><div><input name="password" type={showPassword ? "text" : "password"} required minLength={MIN_PASSWORD_LENGTH} autoComplete="new-password" value={password} placeholder="Escribe o genera una contraseña" onChange={(event) => { setPassword(event.target.value); setCopyStatus(""); }} /><button className="button button-outline" type="button" onClick={generatePassword}>Generar clave</button><button className="button button-outline admin-password-copy-button" type="button" onClick={copyPassword} disabled={!password} aria-label="Copiar contraseña" title="Copiar contraseña"><CopyIcon /><span className="sr-only">Copiar contraseña</span></button><button className="button button-outline admin-password-visibility-button" type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"} aria-pressed={showPassword} title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}><VisibilityIcon visible={showPassword} /></button></div><small>{passwordRequirementText} Puedes generar una clave y copiarla para compartirla de forma segura. Chile3X nunca guarda la clave en texto visible.</small>{copyStatus && <span className="admin-password-copy-status" role="status">{copyStatus}</span>}<button className="button button-primary" type="submit">{submitLabel}</button></div>;
}

"use client";

import { useState } from "react";
import { MIN_PASSWORD_LENGTH, passwordRequirementText } from "@/lib/password-policy";

const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

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

  return <div className="admin-password-field"><span>{label}</span><div><input name="password" type="text" required minLength={MIN_PASSWORD_LENGTH} autoComplete="new-password" value={password} onChange={(event) => { setPassword(event.target.value); setCopyStatus(""); }} /><button className="button button-outline" type="button" onClick={generatePassword}>Generar clave</button><button className="button button-outline" type="button" onClick={copyPassword} disabled={!password}>{copyStatus || "Copiar"}</button></div><small>{passwordRequirementText} Puedes generar una clave y copiarla para compartirla de forma segura. Chile3X nunca guarda la clave en texto visible.</small><button className="button button-primary" type="submit">{submitLabel}</button></div>;
}

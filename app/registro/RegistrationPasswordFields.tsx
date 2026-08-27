"use client";

import { useState } from "react";
import { MIN_PASSWORD_LENGTH, passwordRequirementText } from "@/lib/password-policy";

function VisibilityIcon({ visible }: { visible: boolean }) {
  return visible ? <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false"><path d="M2.5 12s3.3-5.5 9.5-5.5S21.5 12 21.5 12 18.2 17.5 12 17.5 2.5 12 2.5 12Z" fill="none" stroke="currentColor" strokeWidth="2" /><circle cx="12" cy="12" r="2.6" fill="none" stroke="currentColor" strokeWidth="2" /></svg> : <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false"><path d="M3 3l18 18M9.8 6.8A10.7 10.7 0 0 1 12 6.5c6.2 0 9.5 5.5 9.5 5.5a16.8 16.8 0 0 1-3 3.6M6.4 9A16.5 16.5 0 0 0 2.5 12S5.8 17.5 12 17.5c1.3 0 2.5-.2 3.5-.7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><path d="M10.2 10.2a2.6 2.6 0 0 0 3.6 3.6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>;
}

export function RegistrationPasswordFields() {
  const [visible, setVisible] = useState(false);
  return <div className="registration-password-fields"><label>Contraseña<div className="registration-password-entry"><input name="password" type={visible ? "text" : "password"} required minLength={MIN_PASSWORD_LENGTH} autoComplete="new-password" placeholder="Mínimo 8 caracteres" /><button className="button button-outline account-password-visibility-button" type="button" onClick={() => setVisible((value) => !value)} aria-label={visible ? "Ocultar contraseñas" : "Mostrar contraseñas"} aria-pressed={visible} title={visible ? "Ocultar contraseñas" : "Mostrar contraseñas"}><VisibilityIcon visible={visible} /></button></div></label><label>Repite tu contraseña<input name="password_confirmation" type={visible ? "text" : "password"} required minLength={MIN_PASSWORD_LENGTH} autoComplete="new-password" placeholder="Repite la misma contraseña" /><small>{passwordRequirementText}</small></label></div>;
}

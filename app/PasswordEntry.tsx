"use client";

import { useId, useState } from "react";
import { ActionButton } from "./ActionButton";
import { ActionIcon } from "./ActionIcon";

export function PasswordEntry({ invalid = false, describedBy }: { invalid?: boolean; describedBy?: string } = {}) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  return <div className="login-password-field"><label htmlFor={id}>Contraseña</label><div className="login-password-entry">
    <input id={id} name="password" type={visible ? "text" : "password"} required autoComplete="current-password" aria-invalid={invalid || undefined} aria-describedby={describedBy} placeholder="Tu contraseña" />
    <ActionButton type="button" className="button button-outline login-password-toggle" aria-controls={id} aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"} aria-pressed={visible} onClick={() => setVisible(value => !value)}><ActionIcon name="eye" /></ActionButton>
  </div></div>;
}

"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";

type EmailStatus = "idle" | "checking" | "exists" | "unknown";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function RegistrationEmailField({ defaultValue = "" }: { defaultValue?: string }) {
  const [email, setEmail] = useState(defaultValue);
  const [status, setStatus] = useState<EmailStatus>("idle");
  const warningId = useId();
  const normalizedEmail = email.trim().toLowerCase();
  const validEmail = emailPattern.test(normalizedEmail);
  const fieldStatus = validEmail ? status : "idle";
  const recoveryHref = `/recuperar-clave?email=${encodeURIComponent(normalizedEmail)}`;

  useEffect(() => {
    if (!validEmail) return;

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setStatus("checking");
      try {
        const response = await fetch("/api/auth/comprobar-correo", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email: normalizedEmail }),
          signal: controller.signal,
        });
        const payload = await response.json() as { exists?: boolean };
        if (!response.ok) throw new Error("No se pudo comprobar el correo.");
        setStatus(payload.exists ? "exists" : "idle");
      } catch (error) {
        if ((error as Error).name !== "AbortError") setStatus("unknown");
      }
    }, 450);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [normalizedEmail, validEmail]);

  return <label>Correo electrónico
    <input
      name="email"
      type="email"
      required
      maxLength={160}
      autoComplete="email"
      value={email}
      onChange={(event) => {
        const nextEmail = event.target.value;
        setEmail(nextEmail);
        setStatus(emailPattern.test(nextEmail.trim()) ? "checking" : "idle");
      }}
      aria-describedby={fieldStatus === "exists" ? warningId : undefined}
      aria-invalid={fieldStatus === "exists" ? "true" : undefined}
      className={fieldStatus === "exists" ? "input-warning" : undefined}
    />
    {fieldStatus === "checking" && <small className="email-checking" aria-live="polite">Comprobando correo…</small>}
    {fieldStatus === "exists" && <p id={warningId} className="email-exists-warning" role="status">Ya existe una cuenta con este correo. <Link href={recoveryHref}>Recuperar contraseña</Link> o <Link href="/ingresar">ingresar</Link>.</p>}
  </label>;
}

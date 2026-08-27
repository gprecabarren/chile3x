"use client";

import Link from "next/link";
import { useState } from "react";

type ConsentErrors = {
  adult?: string;
  legal?: string;
};

const adultMessage = "Debes confirmar que eres mayor de 18 años para crear una cuenta.";
const legalMessage = "Debes aceptar los Términos y condiciones y la Política de privacidad para crear una cuenta.";

export function RegistrationConsentFields({ adultConfirmed = false, legalConfirmed = false }: { adultConfirmed?: boolean; legalConfirmed?: boolean }) {
  const [errors, setErrors] = useState<ConsentErrors>({});

  function validate(name: keyof ConsentErrors, message: string, checked: boolean, input: HTMLInputElement) {
    input.setCustomValidity(checked ? "" : message);
    setErrors((current) => ({ ...current, [name]: checked ? undefined : message }));
  }

  return <div className="registration-consents">
    <label className="checkbox-label">
      <input
        name="adult_confirmed"
        type="checkbox"
        value="yes"
        required
        defaultChecked={adultConfirmed}
        aria-describedby={errors.adult ? "adult-consent-error" : undefined}
        onInvalid={(event) => validate("adult", adultMessage, event.currentTarget.checked, event.currentTarget)}
        onChange={(event) => validate("adult", adultMessage, event.currentTarget.checked, event.currentTarget)}
      />
      <span>Confirmo que soy mayor de 18 años.</span>
    </label>
    {errors.adult && <p className="registration-consent-error" id="adult-consent-error" role="alert">{errors.adult}</p>}
    <label className="checkbox-label">
      <input
        name="legal_confirmed"
        type="checkbox"
        value="yes"
        required
        defaultChecked={legalConfirmed}
        aria-describedby={errors.legal ? "legal-consent-error" : undefined}
        onInvalid={(event) => validate("legal", legalMessage, event.currentTarget.checked, event.currentTarget)}
        onChange={(event) => validate("legal", legalMessage, event.currentTarget.checked, event.currentTarget)}
      />
      <span>Leí y acepto los <Link href="/terminos" target="_blank" rel="noreferrer">Términos y condiciones</Link> y la <Link href="/privacidad" target="_blank" rel="noreferrer">Política de privacidad</Link>.</span>
    </label>
    {errors.legal && <p className="registration-consent-error" id="legal-consent-error" role="alert">{errors.legal}</p>}
  </div>;
}

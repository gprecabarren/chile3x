export function phoneDigits(value: string | null | undefined) {
  return (value ?? "").replace(/\D/g, "").slice(0, 15);
}

export function adminWhatsappHref(phone: string | null | undefined, displayName: string) {
  const digits = phoneDigits(phone);
  if (digits.length < 8) return null;
  const message = encodeURIComponent(`Hola ${displayName}, te contacto desde la administración de Chile3X.`);
  return `https://wa.me/${digits}?text=${message}`;
}

export function adminCallHref(phone: string | null | undefined) {
  const digits = phoneDigits(phone);
  return digits.length >= 8 ? `tel:+${digits}` : null;
}

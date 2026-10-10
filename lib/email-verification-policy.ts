export const EMAIL_GRACE_DAYS = 7;
export const EMAIL_BLOCK_TRASH_DAYS = 31;
export const DAY_MS = 86_400_000;

export type EmailVerificationRecord = {
  role?: string;
  createdAt?: string;
  emailVerifiedAt?: string | null;
  emailVerificationDeadline?: string | null;
  emailVerificationExemptAt?: string | null;
};

export function utcTimestamp(value: string) {
  return Date.parse(value.includes("T") ? value : `${value.replace(" ", "T")}Z`);
}

export function emailVerificationDeadline(user: EmailVerificationRecord) {
  if (user.emailVerificationDeadline) return utcTimestamp(user.emailVerificationDeadline);
  // Never extend the deadline on login. Migration grants old accounts 7 days.
  return user.createdAt ? utcTimestamp(user.createdAt) + EMAIL_GRACE_DAYS * DAY_MS : NaN;
}

export function emailVerificationState(user: EmailVerificationRecord, now = Date.now()) {
  if (user.role === "admin" || user.emailVerifiedAt) return "verified";
  if (user.emailVerificationExemptAt) return "exempt";
  const deadline = emailVerificationDeadline(user);
  return Number.isFinite(deadline) && now < deadline ? "grace" : "blocked";
}

export function emailVerificationTrashDue(user: EmailVerificationRecord, now = Date.now()) {
  return emailVerificationState(user, now) === "blocked"
    && now >= emailVerificationDeadline(user) + EMAIL_BLOCK_TRASH_DAYS * DAY_MS;
}

export function registrationMethodLabel(value: string) {
  return ({ password: "Correo y contraseña", google: "Google", apple: "Apple", unknown: "Registro anterior sin confirmar" } as Record<string, string>)[value] ?? "Sin confirmar";
}

export function emailVerificationLabel(user: EmailVerificationRecord) {
  if (user.role === "admin" && !user.emailVerifiedAt) return "Acceso administrativo · correo sin confirmar";
  return ({ verified: "Correo verificado", exempt: "Sin verificar · excepción administrativa", grace: "Pendiente · plazo de 7 días", blocked: "Bloqueada por correo sin verificar" })[emailVerificationState(user)];
}

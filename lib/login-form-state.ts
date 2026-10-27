export const LOGIN_EMAIL_COOKIE = "chile3x_login_email";
export const LOGIN_EMAIL_LIFETIME = 5 * 60;

export function loginEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase().slice(0, 160) : "";
}

export function validLoginEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

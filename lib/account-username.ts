import { and, eq, ne } from "drizzle-orm";
import { getDb } from "@/db";
import { profiles, users } from "@/db/schema";

const USERNAME_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,46}[a-z0-9])?$/;
const RESERVED_USERNAMES = new Set([
  "admin", "administrador", "administracion", "api", "ayuda", "contacto",
  "contenido", "cuenta", "escorts", "agencias", "arriendos", "inicio",
  "login", "logout", "mi-cuenta", "noticias", "perfil", "privacidad",
  "registro", "terminos", "www", "chile3x",
]);

export class AccountUsernameError extends Error {}

export function normalizeAccountUsername(value: string) {
  return value.trim().toLowerCase().replace(/^@+/, "");
}

export function validateAccountUsername(value: string) {
  const username = normalizeAccountUsername(value);
  if (!USERNAME_PATTERN.test(username) || RESERVED_USERNAMES.has(username)) {
    throw new AccountUsernameError("El nombre de usuario debe tener entre 3 y 48 caracteres: letras minúsculas, números o guiones. No puede ser una palabra reservada.");
  }
  return username;
}

export async function isAccountUsernameAvailable(username: string, currentUserId?: string) {
  const db = await getDb();
  const userCondition = currentUserId
    ? and(eq(users.username, username), ne(users.id, currentUserId))
    : eq(users.username, username);
  const [accountMatch, announcementMatch] = await Promise.all([
    db.select({ id: users.id }).from(users).where(userCondition).limit(1),
    db.select({ id: profiles.id }).from(profiles).where(eq(profiles.handle, username)).limit(1),
  ]);
  return !accountMatch[0] && !announcementMatch[0];
}

export async function assertAccountUsernameAvailable(username: string, currentUserId?: string) {
  if (!await isAccountUsernameAvailable(username, currentUserId)) {
    throw new AccountUsernameError(`@${username} ya está en uso por una cuenta o un anuncio. Elige otro nombre de usuario.`);
  }
}

export async function generateUniqueAccountUsername(seed = "usuario") {
  const normalizedSeed = normalizeAccountUsername(seed)
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32) || "usuario";

  for (let attempt = 0; attempt < 30; attempt += 1) {
    const suffix = crypto.randomUUID().replaceAll("-", "").slice(0, 7);
    const candidate = `${normalizedSeed.slice(0, 39).replace(/-+$/g, "")}-${suffix}`;
    if (await isAccountUsernameAvailable(candidate)) return candidate;
  }

  throw new AccountUsernameError("No pudimos crear un nombre de usuario único. Intenta nuevamente.");
}

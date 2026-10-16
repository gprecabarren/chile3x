import { sql, type SQL } from "drizzle-orm";
import { getDb } from "@/db";
import { collaborationGuards } from "@/db/schema";
export { reviewReservations } from "@/db/schema";
import { adminHasCapability } from "@/lib/admin-permissions";
import type { AdminUser } from "@/lib/auth";

export const CONFLICT_MESSAGE = "Esta información cambió desde que abriste la página, o está reservada por otra persona. No guardamos ni repetimos tu acción. Conservamos lo que escribiste: consulta la versión actual antes de continuar.";
export class CollaborationConflict extends Error { constructor() { super(CONFLICT_MESSAGE); } }
export type ResourceKey = `profile:${string}` | `account:${string}` | `library:${string}` | `legal:${'terms'|'privacy'}` | "settings:site";
export type ReviewVersion = { key: ResourceKey; revision: number };

export function resourceKey(value: unknown): ResourceKey | null {
  return typeof value === "string" && /^(?:(?:profile|account|library):[\w-]{1,120}|legal:(?:terms|privacy)|settings:site)$/.test(value) ? value as ResourceKey : null;
}
export function canReview(admin: AdminUser, key: ResourceKey) {
  if (key.startsWith("profile:")) return adminHasCapability(admin,"profiles.moderate") || adminHasCapability(admin,"media.moderate");
  if (key.startsWith("account:")) return adminHasCapability(admin,"accounts.manage");
  if (key.startsWith("library:")) return adminHasCapability(admin,"media.moderate");
  return adminHasCapability(admin,"settings.manage");
}
export function revisionExpression(key: ResourceKey): SQL {
  const id = key.slice(key.indexOf(":")+1);
  if (key.startsWith("profile:")) return sql`(select revision from profiles where id=${id})`;
  if (key.startsWith("account:")) return sql`(select revision from users where id=${id} and role!='admin')`;
  if (key.startsWith("library:")) return sql`(select revision from exclusive_content_collections where id=${id})`;
  if (key.startsWith("legal:")) return sql`(select revision from legal_documents where id=${id})`;
  return sql`(select revision from settings_revision where id='site')`;
}
export async function currentRevision(key: ResourceKey) {
  const row = await (await getDb()).get<{revision:number|null}>(sql`select ${revisionExpression(key)} revision`);
  return row?.revision ?? null;
}
export function expectedVersion(form: FormData, key: ResourceKey): ReviewVersion {
  const revision = form.get("review_revision");
  if (form.get("review_key") !== key || typeof revision !== "string" || !/^\d{1,12}$/.test(revision)) throw new CollaborationConflict();
  return { key, revision: Number(revision) };
}
type Database = Awaited<ReturnType<typeof getDb>>;
type Statements = Parameters<Database["batch"]>[0];
/** The check and ALL dependent DB changes commit together. A failed check
 * aborts the entire D1 batch, even when another actor writes at the same instant.
 * The database triggers make owner/background changes invalidate old reviews. */
export async function guardedBatch(version: ReviewVersion, statements: Statements, actorId?: string) {
  const db = await getDb();
  const id = crypto.randomUUID();
  const reservation = actorId ? sql`not exists(select 1 from review_reservations where resource_key=${version.key} and actor_id!=${actorId} and expires_at>${Date.now()})` : sql`1`;
  try {
    const results = await db.batch([
      db.insert(collaborationGuards).values({ id, allowed: sql`case when ${revisionExpression(version.key)}=${version.revision} and ${reservation} then 1 else 0 end` }),
      ...statements,
      db.delete(collaborationGuards).where(sql`${collaborationGuards.id}=${id}`),
    ]);
    return results.slice(1,-1);
  } catch (error) {
    let cause:unknown=error;
    for(let depth=0;depth<6&&cause;depth++){
      if(String(cause).includes("collaboration_conflict"))throw new CollaborationConflict();
      cause=cause instanceof Error?cause.cause:null;
    }
    throw error;
  }
}
export function conflictResponse() { return Response.json({ error: CONFLICT_MESSAGE, conflict: true }, { status:409, headers:{"cache-control":"private, no-store"} }); }
export function mutationRedirect(request: Request, url: URL | string) {
  return request.headers.get("accept")?.includes("application/json") ? Response.json({ redirectTo: String(url) }, { headers:{"cache-control":"private, no-store"} }) : Response.redirect(url,303);
}

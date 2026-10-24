import { NextRequest } from 'next/server';
import { getDb } from '@/db';
import { siteSettings } from '@/db/schema';
import { assertSameOrigin, getCurrentAdmin } from '@/lib/auth';
import { adminHasCapability } from '@/lib/admin-permissions';
import { readBoundedJson, RequestBodyError } from '@/lib/bounded-json';
import { getInformationSeo, informationSeoSnapshot } from '@/lib/information-seo';
import { informationPageId, INFO_SETTING_KEYS, parseInfoSeoOverrides, infoSeoChanges, infoRobotsChanged } from '@/lib/information-seo-policy';
import { CollaborationConflict, expectedVersion, guardedBatch, conflictResponse, currentRevision } from '@/lib/collaboration';
import { recordAdminAudit } from '@/lib/admin-audit';

const headers = { 'cache-control': 'private, no-store', 'x-robots-tag': 'noindex, nofollow' };
const fail = (error: string, status: number) => Response.json({ error }, { status, headers });
export async function GET(_request: NextRequest, { params }: { params: Promise<{ pageId: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin || !adminHasCapability(admin, 'settings.manage')) return fail('No autorizado.', admin ? 403 : 401);
  const pageId = informationPageId((await params).pageId);
  if (!pageId) return fail('Página informativa no permitida.', 404);
  const [current, revision] = await Promise.all([getInformationSeo(pageId), currentRevision('settings:site')]);
  return Response.json({ ...current, revision: revision ?? 0, snapshot: await informationSeoSnapshot(current) }, { headers });
}
export async function POST(request: NextRequest, { params }: { params: Promise<{ pageId: string }> }) {
  try { assertSameOrigin(request); } catch { return fail('Solicitud no válida.', 403); }
  const admin = await getCurrentAdmin();
  if (!admin) return fail('No autorizado.', 401);
  if (!adminHasCapability(admin, 'settings.manage')) return fail('No tienes permiso para editar la configuración.', 403);
  const pageId = informationPageId((await params).pageId);
  if (!pageId) return fail('Página informativa no permitida.', 404);
  let input: Record<string, unknown>;
  try {
    const value = await readBoundedJson(request, 16_384);
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Configuración no válida.');
    input = value as Record<string, unknown>;
    if (Object.keys(input).some(key => !['overrides', 'snapshot', 'revision', 'mutationId', 'confirmRobots'].includes(key))) throw new Error('Hay un campo no permitido.');
    if (typeof input.snapshot !== 'string' || !/^[a-f0-9]{64}$/.test(input.snapshot) || !Number.isSafeInteger(input.revision) || Number(input.revision) < 0 || typeof input.mutationId !== 'string' || !/^[a-f\d-]{36}$/i.test(input.mutationId)) throw new Error('Falta la versión de la configuración. Recarga la página.');
  } catch (cause) { return fail(cause instanceof Error ? cause.message : 'Configuración no válida.', cause instanceof RequestBodyError ? cause.status : 400); }
  const current = await getInformationSeo(pageId);
  let overrides;
  try { overrides = parseInfoSeoOverrides(input.overrides, current.defaults.origin); }
  catch (cause) { return fail(cause instanceof Error ? cause.message : 'Configuración no válida.', 400); }
  if (input.snapshot !== await informationSeoSnapshot(current) || input.revision !== await currentRevision('settings:site')) return conflictResponse();
  if (infoRobotsChanged(current.overrides, overrides) && input.confirmRobots !== true) return fail('Confirma expresamente los cambios de indexación y previsualización.', 400);
  const changed = infoSeoChanges(current.overrides, overrides);
  if (!changed.length) return Response.json({ unchanged: true }, { headers });
  const form = new FormData();
  form.set('review_key', 'settings:site'); form.set('review_revision', String(input.revision)); form.set('mutation_id', String(input.mutationId));
  const db = await getDb(), key = INFO_SETTING_KEYS[pageId], updatedAt = new Date().toISOString();
  try {
    await guardedBatch(expectedVersion(form, 'settings:site'), [db.insert(siteSettings).values({ key, value: JSON.stringify(overrides), updatedBy: admin.id, updatedAt }).onConflictDoUpdate({ target: siteSettings.key, set: { value: JSON.stringify(overrides), updatedBy: admin.id, updatedAt } })], admin.id);
  } catch (cause) {
    if (cause instanceof CollaborationConflict) return conflictResponse();
    throw cause;
  }
  await recordAdminAudit(admin, { category: 'settings', action: 'settings.update', entityType: 'settings', entityId: current.page.path, entityLabel: current.page.label, summary: `Editó ${changed.length} campos de metadatos de ${current.page.label}.`, before: { ...current.overrides }, after: { ...overrides }, metadata: { changedKeys: changed } });
  return Response.json({ redirectTo: `/admin/contenido/seo/paginas?pagina=${pageId}&saved=1` }, { headers });
}

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { navigationIsActive } from '../lib/navigation-active.ts';
const source = path => readFile(new URL('../'+path,import.meta.url),'utf8');

test('navigation selects the visited section, not a fixed first item', async()=>{
  for(const href of ['/escorts','/agencias','/arriendos','/noticias','/contacto']){
    assert.equal(navigationIsActive(href,href),true);
    assert.equal(navigationIsActive(href,'/#cobertura'),false);
  }
  assert.equal(navigationIsActive('/escorts/concepcion','/escorts'),true);
  assert.equal(navigationIsActive('/noticias/titulo','/noticias'),true);
  assert.equal(navigationIsActive('/escorts-extra','/escorts'),false);
  assert.equal(navigationIsActive('/','/#cobertura','#cobertura'),true);
  const css=await source('app/globals.css');assert.doesNotMatch(css,/public-navigation-directory a:first-child/);
});

test('private message/review notices are authenticated, aggregate-only and not indexed',async()=>{
  const [route,provider,account,header,chat]=await Promise.all(['app/api/mi-cuenta/avisos/route.ts','app/MessageNotifications.tsx','app/mi-cuenta/_components.tsx','app/directorio/_components.tsx','app/mi-cuenta/mensajes/ChatThread.tsx'].map(source));
  assert.match(route,/if \(!user\).*401/);assert.match(route,/private, no-store/);assert.match(route,/noindex, nofollow/);
  assert.match(route,/countPendingReceivedReviews\(user.id\)/);assert.doesNotMatch(route,/body|email|username/);
  assert.match(provider,/45_000/);assert.match(provider,/visibilityState/);assert.match(provider,/controller.abort/);
  assert.match(account,/PendingReviewsNotice/);assert.match(header,/currentUser && <MessageNotifications/);
  assert.match(chat,/internal-chat-sender/);assert.match(chat,/currentUserLabel/);assert.match(chat,/chile3x:messages-read/);
  assert.match(chat,/detail: \{ conversationId \}/);
  const badge=await source('app/mi-cuenta/mensajes/ConversationUnreadBadge.tsx');
  assert.match(badge,/detail\?\.conversationId === conversationId/);assert.match(badge,/removeEventListener/);
});

test('only the listing owner approves/rejects; admin only removes; author can withdraw pending',async()=>{
  const [owner,admin,withdraw,publicApi,service,account,adminPage]=await Promise.all(['app/api/mi-cuenta/comentarios/[reviewId]/route.ts','app/api/admin/resenas/[reviewId]/route.ts','app/api/mi-cuenta/resenas/[reviewId]/route.ts','app/api/perfiles/[profileId]/resenas/route.ts','lib/profile-interactions.ts','app/mi-cuenta/comentarios/page.tsx','app/admin/resenas/page.tsx'].map(source));
  for(const route of [owner,admin,withdraw]) assert.match(route,/assertSameOrigin/);
  assert.match(owner,/eq\(profiles.ownerId, user.id\)/);assert.match(owner,/eq\(reviews.status, row.status\)/);
  assert.match(admin,/form.get\("action"\) !== "delete"/);assert.doesNotMatch(admin,/status: "approved"|nextStatus/);
  assert.match(withdraw,/eq\(reviews.authorId, user.id\)/);assert.match(withdraw,/eq\(reviews.status, "pending"\)/);
  assert.match(publicApi,/verifyTurnstile/);assert.match(service,/eq\(reviews.status, "approved"\)/);
  assert.match(service,/eq\(reviews.authorId, authorId\)/);assert.match(account,/inArray\(reviews.status, \["pending", "approved"\]\)/);
  assert.doesNotMatch(adminPage,/value="approve"|value="reject"/);assert.match(adminPage,/\/admin\/cuentas\/\$\{row.authorId\}/);
});

test('photo uploads/deletes/moderation never change the listing status',async()=>{
  for(const path of ['lib/profile-media-upload.ts','app/api/perfiles/[profileId]/media/route.ts','app/api/perfiles/[profileId]/media/[mediaId]/route.ts','app/api/admin/media/[mediaId]/route.ts']){
    const code=await source(path);assert.doesNotMatch(code,/update\(profiles\)|delete\(profiles\)/);
  }
  const uploader=await source('lib/profile-media-upload.ts');assert.match(uploader,/moderationStatus === "approved" && uploadKind === "profile_photo"/);
  const manager=await source('app/mi-cuenta/ProfileMediaManager.tsx');assert.match(manager,/No necesitas guardar nuevamente los datos/);
});

test('raw WhatsApp taps are admin-only and increment without duplicating daily event rows',async()=>{
  const [api,stats,profile,ownerStats]=await Promise.all(['app/api/perfiles/[profileId]/contacto/route.ts','lib/profile-contact-statistics.ts','app/perfil/[slug]/page.tsx','app/mi-cuenta/[profileId]/estadisticas/page.tsx'].map(source));
  assert.match(api,/clickCount: sql`\$\{profileContactEvents.clickCount\} \+ 1`/);
  assert.match(api,/onConflictDoUpdate/);assert.match(stats,/if \(!await getCurrentAdmin\(\)\) return null/);
  assert.match(profile,/admin && adminWhatsappStatistics &&/);assert.doesNotMatch(ownerStats,/clickCount|adminWhatsappStatistics/);
});

test('public photos open in one accessible dialog without losing original SEO links',async()=>{
  const [viewer,page,css]=await Promise.all(['app/perfil/ProfilePhotoViewer.tsx','app/perfil/[slug]/page.tsx','app/globals.css'].map(source));
  assert.match(viewer,/dialog.showModal\(\)/);assert.match(viewer,/onCancel/);assert.match(viewer,/Cerrar fotografía/);
  assert.match(viewer,/window.scrollTo/);assert.match(viewer,/triggerRef.current\?\.focus\(\{ preventScroll: true \}\)/);
  assert.match(viewer,/objectFit: "scale-down"/);assert.match(viewer,/event.preventDefault\(\)/);
  assert.match(page,/ProfilePhotoLink/);assert.match(page,/key=\{profile.id\}/);
  assert.doesNotMatch(page,/href=\{media.url\} target="_blank"/);
  assert.match(css,/\.profile-media-grid a\[aria-haspopup="dialog"\] \{ position: absolute; inset: 0; display: block/);
});

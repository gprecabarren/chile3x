import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { xCodeChallenge, parseXIdentity, xAuthorizationUrl, exchangeXCode, X_SCOPES } from '../lib/x-oauth.ts';

const source = path => readFile(new URL('../' + path, import.meta.url), 'utf8');
test('X uses RFC7636 S256, exact callback and minimal read-only scopes', async () => {
  const challenge = await xCodeChallenge('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk');
  assert.equal(challenge, 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
  const url = xAuthorizationUrl({clientId:'test',clientSecret:'not-used',redirectUri:'https://chile3x.cl/api/auth/x/callback'}, 'state', challenge);
  assert.equal(url.origin, 'https://x.com'); assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
  assert.equal(url.searchParams.get('scope'), X_SCOPES); assert.doesNotMatch(X_SCOPES, /write|dm|offline/);
});
test('X only trusts confirmed_email, never an unconfirmed email or paid verification badge', () => {
  const data = {id:'123',username:'qa_identity',name:' Test ',email:'wrong@example.invalid',verified:true};
  assert.equal(parseXIdentity({data}).email, null);
  assert.equal(parseXIdentity({data:{...data,confirmed_email:' TEST@example.invalid '}}).email, 'test@example.invalid');
  assert.equal(parseXIdentity({data:{...data,confirmed_email:'invalid'}}).email, null);
  assert.equal(parseXIdentity({data:{...data,id:'bad'}}), null);
  assert.equal(parseXIdentity(null), null);
});
test('X identity exchange revokes token even on profile failure and never returns the token', async () => {
  const original = globalThis.fetch, calls = [];
  try {
    globalThis.fetch = async (url,options) => { calls.push([url,options]);
      if(url.endsWith('/token')) return Response.json({access_token:'test-only-token',token_type:'bearer'});
      if(url.includes('/users/me')) return Response.json({data:{id:'123',username:'qa'}});
      return new Response(null,{status:200});
    };
    const result = await exchangeXCode('code','verifier',{clientId:'test',clientSecret:'test',redirectUri:'https://chile3x.cl/api/auth/x/callback'});
    assert.equal(result.subject,'123'); assert.ok(!('access_token' in result)); assert.ok(calls.at(-1)[0].endsWith('/revoke'));
    globalThis.fetch = async url => url.endsWith('/token') ? Response.json({access_token:'test-only-token',token_type:'bearer'}) : url.includes('/users/me') ? new Response(null,{status:403}) : (calls.push([url]),new Response(null,{status:200}));
    await assert.rejects(exchangeXCode('code','verifier',{clientId:'test',clientSecret:'test',redirectUri:'https://chile3x.cl/api/auth/x/callback'}),/identity unavailable/);
    assert.ok(calls.at(-1)[0].endsWith('/revoke'));
  } finally { globalThis.fetch = original; }
});
test('social unlink requires same-origin, password confirmation and rotates sessions without unverifying email', async () => {
  const code = await source('app/api/mi-cuenta/accesos/route.ts');
  assert.match(code,/assertSameOrigin\(request\)/); assert.match(code,/verifyPassword\(password, account.passwordHash\)/);
  assert.match(code,/db.batch\(/); assert.match(code,/db.delete\(authSessions\)/);
  assert.match(code,/createUserSession\(user.id, request, "password"\)/);
  assert.doesNotMatch(code,/db.update\(users\)/);
  const callback = await source('app/api/auth/x/callback/route.ts');
  assert.match(callback,/isReservedAdminEmail/); assert.match(callback,/consumeXAuthAttempt/);
  assert.match(await source('lib/x-auth.ts'),/delete\(xAuthAttempts\)[\s\S]*?\.returning\(\)/);
});
test('public galleries retain server children, adaptive 1/2/3 choices and photos before separate videos', async () => {
  const gallery = await source('app/perfil/ProfileGalleryLayout.tsx'), profile = await source('app/perfil/[slug]/page.tsx');
  assert.match(gallery,/Math.min\(3/); assert.match(gallery,/aria-pressed/); assert.match(gallery,/\{children\}/);
  assert.match(gallery,/<GalleryViewIcon columns=\{value\}/); assert.match(await source('app/globals.css'),/aspect-ratio: 2 \/ 3/);
  assert.ok(profile.indexOf('kind="photos"') < profile.indexOf('kind="videos"'));
  assert.match(profile, /profile-video-gallery[\s\S]*?<p className="eyebrow">GALERÍA<\/p><h2>Videos<\/h2>/);
  assert.doesNotMatch(profile, /Videos cortos/);
  assert.doesNotMatch(profile,/Material publicado después de revisión/);
  assert.doesNotMatch(await source('app/perfil/ProfileReviews.tsx'),/Las reseñas se publican solo/);
});
test('chat scroll follows committed messages, preserves older scroll and anonymizes inactive visitors', async () => {
  const chat=await source('app/mi-cuenta/mensajes/ChatThread.tsx');
  assert.match(chat,/list.scrollTop = list.scrollHeight/); assert.match(chat,/olderScroll/); assert.match(chat,/sentMessage.current = true/);
  assert.match(await source('lib/internal-messages.ts'),/case when/);
  assert.match(await source('app/mi-cuenta/mensajes/page.tsx'),/conversation.otherUserActive && profileHref/);
});
test('home/about titles include escorts and single branding, preserve About style and correct account home', async () => {
  const home=await source('app/page.tsx'), about=await source('app/quienes-somos/page.tsx');
  assert.match(home,/absolute: "Directorio de escorts en Chile por ciudad \| Chile3X"/);
  assert.equal((home.match(/title: "Directorio de escorts en Chile por ciudad \| Chile3X"/g) ?? []).length, 2);
  assert.match(home, /<h1>Directorio de escorts <em>en Chile por ciudad\.<\/em><\/h1>/);
  assert.match(about,/absolute: "Quiénes somos: directorio de escorts en Chile \| Chile3X"/);
  assert.match(about,/className="about-hero"/); assert.match(about,/Sitio operativo en fase beta/);
  assert.match(await source('app/mi-cuenta/_components.tsx'),/account-brand-home" href="\/mi-cuenta"/);
  for(const path of ['app/ingresar/page.tsx','app/registro/page.tsx']) {
    const code=await source(path); assert.ok(code.indexOf('<GoogleSignInButton') < code.indexOf('<XSignInButton')); assert.ok(code.indexOf('<XSignInButton') < code.indexOf('<AppleSignInButton'));
  }
});

test('X has a consistent vector icon and an accessible disabled state without enabling OAuth', async () => {
  const button = await source('app/XSignInButton.tsx');
  assert.match(button, /<svg aria-hidden="true" viewBox="0 0 24 24"/);
  assert.match(button, /disabled=\{!enabled\} aria-disabled=\{!enabled\}/);
  assert.doesNotMatch(button, /𝕏/);
  assert.match(await source('lib/x-auth.ts'), /x_sign_in_status !== "enabled"/);
});

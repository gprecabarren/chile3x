// Read-only preparation. Never applies SQL, prints credentials or creates administrators.
// Generated credentials/backups belong in ignored tmp/, not Git or the website.
import { spawnSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { randomBytes, pbkdf2Sync } from 'node:crypto';
import { resolve } from 'node:path';

const mode = process.argv[2];
if (!['--local', '--remote'].includes(mode)) throw new Error('Specify --local or --remote explicitly. This command only prepares a reviewed SQL file.');
const env = { ...process.env };
delete env.CLOUDFLARE_API_TOKEN; delete env.CLOUDFLARE_ACCOUNT_ID;
const directory = resolve(`tmp/test-accounts-${mode.slice(2)}-${Date.now()}`);
await mkdir(directory, { recursive: true });
const seedFiles = await Promise.all(['0004_demo_directory_profiles.sql', '0009_demo_directory_expansion.sql'].map(file => readFile(resolve('drizzle', file), 'utf8')));
const allowed = new Set(seedFiles.flatMap(text => [...text.matchAll(/'usr_demo_[a-z_]+'/g)].map(match => match[0].slice(1,-1))));
const sqlQuote = value => value == null ? 'NULL' : `'${String(value).replaceAll("'", "''")}'`;
const ids = [...allowed].map(sqlQuote).join(',');
const query = `SELECT p.*,u.email AS account_email,u.display_name AS account_name,u.username AS account_username,u.password_hash,u.email_verified_at,u.role,u.is_active FROM profiles p JOIN users u ON u.id=p.owner_id WHERE p.owner_id IN (${ids}); SELECT id,handle FROM profiles; SELECT id,email,username FROM users; SELECT * FROM profile_details WHERE profile_id IN (SELECT id FROM profiles WHERE owner_id IN (${ids}));`;
const args = ['node_modules/wrangler/bin/wrangler.js','d1','execute','chile3x-db',mode,'--config','wrangler.json','--command',query,'--json'];
if (mode === '--local') args.push('--persist-to','.wrangler/visual-state');
const result = spawnSync(process.execPath,args,{env,encoding:'utf8',maxBuffer:10_000_000});
const parsed = JSON.parse(result.stdout);
if (result.status || !Array.isArray(parsed) || parsed.some(item => !item.success)) throw new Error('The scoped read failed; no mutation was prepared.');
const [profiles, allProfiles, allUsers, details] = parsed.map(item => item.results);
if (profiles.length !== 27 || new Set(profiles.map(item => item.owner_id)).size !== 27) throw new Error('Expected exactly 27 seed profiles with separate owners; inspect before proceeding.');
for (const profile of profiles) {
  if (!allowed.has(profile.owner_id) || !profile.id.startsWith('prf_demo_') || profile.is_demo !== 1 || profile.role !== 'advertiser' || profile.is_active !== 1 || !profile.account_email.endsWith('.invalid') || profile.trashed_at || profile.owner_hidden_at) throw new Error('A seed record changed ownership, role or visibility. Inspect manually.');
}
await writeFile(resolve(directory,'backup.json'),JSON.stringify({ profiles, details },null,2),{mode:0o600});
const statements = [];
const rollback = [];
const credentials = [];
for (const profile of profiles) {
  const handle = profile.handle.replace(/-demo$/, '');
  const email = `${handle}@cuentas.chile3x.invalid`;
  const username = !profile.account_username || /^usuario-[0-9a-f]+$/.test(profile.account_username) ? `${handle}-cuenta` : profile.account_username;
  if (!/^[a-z0-9][a-z0-9-]{1,46}[a-z0-9]$/.test(username) || allProfiles.some(item => item.handle === username) || allUsers.some(item => item.id !== profile.owner_id && item.username === username)) throw new Error('A test account username collides; inspect before applying.');
  if (!handle || allProfiles.some(item => item.id !== profile.id && item.handle === handle) || allUsers.some(item => item.id !== profile.owner_id && item.email === email)) throw new Error('A new handle or email collides; no mutation may be applied.');
  const password = `Cx!${randomBytes(20).toString('base64url')}`;
  const salt = randomBytes(16);
  const hash = ['pbkdf2-sha256',100000,salt.toString('base64url'),pbkdf2Sync(password,salt,100000,32,'sha256').toString('base64url')].join('$');
  const profileGuard = `id=${sqlQuote(profile.id)} AND owner_id=${sqlQuote(profile.owner_id)} AND is_demo=1 AND handle=${sqlQuote(profile.handle)}`;
  statements.push(`UPDATE users SET email=${sqlQuote(email)}, display_name=${sqlQuote(profile.display_name)}, username=${sqlQuote(username)}, password_hash=${sqlQuote(hash)}, email_verified_at=CURRENT_TIMESTAMP WHERE id=${sqlQuote(profile.owner_id)} AND email=${sqlQuote(profile.account_email)} AND role='advertiser' AND EXISTS(SELECT 1 FROM profiles WHERE ${profileGuard});`);
  // Preserve immutable slugs for redirects, test marker, type, media and relationships.
  statements.push(`UPDATE profiles SET handle=${sqlQuote(handle)}, short_description=${sqlQuote(`Publicación de prueba en ${profile.city}.`)}, description=${sqlQuote('Ficha utilizada para probar cuentas, mensajes privados y comentarios. No representa un servicio disponible.')}, verification_status='unreviewed', verified_at=NULL, health_review_status='not_requested', contact_whatsapp=NULL, contact_telegram=NULL, updated_at=CURRENT_TIMESTAMP WHERE ${profileGuard};`);
  statements.push(`INSERT INTO admin_audit_logs(id,actor_email,category,action,entity_type,entity_id,entity_label,summary,metadata) VALUES(${sqlQuote(`audit_test_account_${randomBytes(12).toString('hex')}`)},'chile3x.internal@cuentas.chile3x.invalid','accounts','test_account_enabled','account',${sqlQuote(profile.owner_id)},${sqlQuote(profile.display_name)},'Cuenta ficticia habilitada para QA por petición del propietario; conserva is_demo y noindex.',${sqlQuote(JSON.stringify({source:'owner_request_2026_10_08',profileId:profile.id,email,normalAdvertiserPermissions:true,emailDeliverable:false}))});`);
  rollback.push(`UPDATE users SET email=${sqlQuote(profile.account_email)},display_name=${sqlQuote(profile.account_name)},username=${sqlQuote(profile.account_username)},password_hash=${sqlQuote(profile.password_hash)},email_verified_at=${sqlQuote(profile.email_verified_at)} WHERE id=${sqlQuote(profile.owner_id)};`);
  rollback.push(`UPDATE profiles SET handle=${sqlQuote(profile.handle)},short_description=${sqlQuote(profile.short_description)},description=${sqlQuote(profile.description)},verification_status=${sqlQuote(profile.verification_status)},verified_at=${sqlQuote(profile.verified_at)},health_review_status=${sqlQuote(profile.health_review_status)},contact_whatsapp=${sqlQuote(profile.contact_whatsapp)},contact_telegram=${sqlQuote(profile.contact_telegram)},updated_at=${sqlQuote(profile.updated_at)} WHERE id=${sqlQuote(profile.id)} AND owner_id=${sqlQuote(profile.owner_id)} AND is_demo=1;`);
  credentials.push(`| ${profile.display_name} | ${email} | ${password} | [Abrir perfil](https://chile3x.cl/perfil/@${handle}) |`);
}
await writeFile(resolve(directory,'apply.sql'),statements.join('\n'),{mode:0o600});
await writeFile(resolve(directory,'rollback.sql'),rollback.join('\n'),{mode:0o600});
await writeFile(resolve(directory,'accesos-privados.md'),`# Accesos privados para pruebas\n\nNo publiques ni compartas este archivo fuera del equipo de QA. Cada cuenta conserva permisos normales de anunciante, sin acceso administrativo.\n\nInicia sesión en https://chile3x.cl/ingresar con uno de estos correos y su contraseña. Usa otra cuenta para comentar o iniciar un chat: no se permiten mensajes ni reseñas del propio anuncio. Las reseñas siguen pendientes de moderación.\n\nLos correos .invalid no reciben mensajes: no funciona recuperación por correo. Conserva este archivo; un administrador puede gestionar las cuentas. No hay bypass de captcha, autorización o bloqueo.\n\n| Cuenta | Correo | Contraseña | Perfil |\n| --- | --- | --- | --- |\n${credentials.join('\n')}\n`,{mode:0o600});
console.log(JSON.stringify({prepared:profiles.length,mode,directory,applied:false}));

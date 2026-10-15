import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { readMailSettingsForm, validGoogleRelay, validMailbox } from '../lib/mail-settings-policy.ts';

const source = path => readFile(new URL('../'+path,import.meta.url),'utf8');
test('mail configuration validates all values before saving, with restricted relay destinations',()=>{
  const form = new FormData();
  form.set('contact_email','chile3x.site@gmail.com');
  Object.entries({mail_delivery_mode:'auto',mail_sender_name:'Chile3X',mail_sender_address:'noreply@chile3x.cl',mail_reply_to:'',mail_google_relay_url:'',mail_alerts_enabled:'disabled',mail_alert_recipient:'chile3x.site@gmail.com',mail_alert_new_profile:'enabled',mail_alert_updated_profile:'enabled',mail_alert_media:'enabled',mail_inbound_mode:'disabled',mail_inbound_address:'',mail_inbound_destination:'chile3x.site@gmail.com',mail_webmail_url:'https://mail.google.com/',mail_inbound_provider:'Gmail'}).forEach(([key,value])=>form.set(key,value));
  assert.equal(readMailSettingsForm(form).mail_alert_recipient,'chile3x.site@gmail.com');
  assert.equal(validGoogleRelay('https://script.google.com/macros/s/abc-123/exec'),true);
  for(const url of ['http://script.google.com/macros/s/abc/exec','https://evil.test/exec','https://script.google.com.evil.test/macros/s/a/exec','https://script.google.com/macros/s/a/exec?secret=x'])assert.equal(validGoogleRelay(url),false);
  assert.equal(validMailbox('a@b.cl\nBcc:x@y.cl'),false);
  form.set('mail_reply_to','bad\nreply');assert.throws(()=>readMailSettingsForm(form));
  form.set('mail_reply_to','');form.set('mail_inbound_mode','forward');assert.throws(()=>readMailSettingsForm(form),/dirección de entrada/);
  form.set('mail_inbound_address','hello@example.test');form.set('mail_inbound_destination','hello@example.test');assert.throws(()=>readMailSettingsForm(form),/bucles/);
});
test('account sidebar remains an ordinary account and includes accessible keyboard/drawer controls',async()=>{
 const [shell,workspace,css]=await Promise.all(['app/mi-cuenta/_components.tsx','app/mi-cuenta/AccountWorkspace.tsx','app/mi-cuenta/account-workspace.css'].map(source));
 assert.match(shell,/<AccountWorkspace/);assert.doesNotMatch(shell,/AdminWorkspace|\/api\/auth\/logout/);assert.match(shell,/\/api\/auth\/session\/logout/);
 for(const expression of ['aria-modal','inert={mobileOpen','"Escape"','"Tab"','returnFocusTarget?.focus'])assert.ok(workspace.includes(expression));
 assert.match(css,/min-height:44px/);assert.match(css,/max-width:1099px/);assert.match(css,/prefers-reduced-motion/);
});
test('content sales directory fixes seller scope server-side, has canonical SEO, sitemap, and no menu entry',async()=>{
 const [page,directory,sitemap,filters,shell]=await Promise.all(['app/venta-contenido/page.tsx','lib/directory.ts','app/sitemap.ts','app/directorio/DirectoryFilters.tsx','app/directorio/_components.tsx'].map(source));
 assert.match(page,/readDirectoryFilters\(query, \{ contentDirectory: true \}\)/);assert.match(directory,/filters.category === "contenido" \|\| filters.contentDirectory/);assert.match(directory,/filters.tier && !filters.contentDirectory/);
 assert.match(page,/CollectionPage/);assert.match(page,/BreadcrumbList/);assert.match(page,/directoryPageMetadata/);assert.match(sitemap,/siteUrl\}\/venta-contenido/);
 assert.doesNotMatch(shell,/href="\/venta-contenido"/);assert.match(filters,/contentDirectory && \(tag === "venta-contenido"/);assert.match(filters,/filtros=abiertos.*scroll: false/);
});
test('moderation email outbox deduplicates batches and cascade-removes only jobs for deleted listings',async()=>{
 const db=new DatabaseSync(':memory:');
 try { db.exec('PRAGMA foreign_keys=ON; CREATE TABLE profiles(id TEXT PRIMARY KEY);');db.exec(await source('drizzle/0052_moderation_email_jobs.sql'));
 db.prepare('INSERT INTO profiles VALUES(?)').run('p1');
 const insert=db.prepare('INSERT OR IGNORE INTO moderation_email_jobs(id,profile_id,kind) VALUES(?,?,?)');
 insert.run('p1:media_uploaded:1','p1','media_uploaded');insert.run('p1:media_uploaded:1','p1','media_uploaded');assert.equal(db.prepare('SELECT count(*) n FROM moderation_email_jobs').get().n,1);
 db.prepare('DELETE FROM profiles WHERE id=?').run('p1');assert.equal(db.prepare('SELECT count(*) n FROM moderation_email_jobs').get().n,0);
 } finally {db.close();}
});

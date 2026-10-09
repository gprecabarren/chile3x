import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { normalizePortalWhatsappPhone, portalWhatsappHref, validateWhatsappContacts, publicWhatsappContacts, validateWhatsappEvent } from '../lib/portal-whatsapp.ts';
const source = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const marketing = { id: 'marketing', label: 'Marketing digital', description: 'Ayuda para publicar.', phone: '9 5056 1538', message: 'Hola, quiero publicar.', enabled: true };

test('portal WhatsApp normalizes Chilean numbers without accepting arbitrary links or text', () => {
  for (const phone of ['9 5056 1538', '+56 9 5056 1538', '56950561538']) assert.equal(normalizePortalWhatsappPhone(phone), '56950561538');
  for (const phone of ['https://wa.me/56950561538', 'javascript:12345678', 'abc56950561538', '123', '000000000', '+'.repeat(23)]) assert.equal(normalizePortalWhatsappPhone(phone), null);
  assert.equal(normalizePortalWhatsappPhone(''), '');
  assert.equal(portalWhatsappHref('9 5056 1538', 'Hola & ayuda'), 'https://wa.me/56950561538?text=Hola%20%26%20ayuda');
});

test('multiple contacts retain identity and order while hidden, invalid and missing numbers cannot create public links', () => {
  assert.equal(validateWhatsappContacts(JSON.stringify([marketing]))[0].phone, '56950561538');
  for (const input of [[marketing, marketing], [{...marketing,id:'support'}], [{...marketing,phone:''}], [{...marketing,enabled:'yes'}], [{...marketing,label:'x'.repeat(61)}], Array.from({length:13},(_,i)=>({...marketing,id:`extra_${i}`}))]) assert.equal(validateWhatsappContacts(JSON.stringify(input)),null);
  assert.deepEqual(validateWhatsappContacts('[]'), []);
  const settings = { contact_whatsapp:'56933365005', contact_whatsapp_label:'Soporte técnico', contact_whatsapp_description:'Ayuda del sitio', contact_whatsapp_message:'Soporte', whatsapp_extra_contacts:JSON.stringify([marketing,{...marketing,id:'extra',enabled:false}]) };
  const contacts = publicWhatsappContacts(settings);
  assert.deepEqual(contacts.map(c=>c.id), ['support','marketing']);
  assert.match(contacts[0].href,/wa\.me\/56933365005/);
  assert.match(contacts[1].href,/wa\.me\/56950561538/);
  assert.deepEqual(publicWhatsappContacts({...settings,contact_whatsapp:'',whatsapp_extra_contacts:'invalid'}),[]);
});

test('tracking accepts only bounded portal events and cannot mix advertiser contacts or fake direct areas', () => {
  assert.ok(validateWhatsappEvent({action:'panel_open',contactId:'panel',placement:'floating'}));
  assert.ok(validateWhatsappEvent({action:'contact_click',contactId:'support',placement:'header'}));
  assert.ok(validateWhatsappEvent({action:'contact_click',contactId:'marketing',placement:'floating'}));
  for (const payload of [null,[],{action:'panel_open',contactId:'panel',placement:'header'},{action:'contact_click',contactId:'marketing',placement:'footer'},{action:'other',contactId:'support',placement:'floating'},{action:'contact_click',contactId:'https://evil.test',placement:'floating'}]) assert.equal(validateWhatsappEvent(payload),null);
});

test('portal counters aggregate atomically and remain separate from advertiser events', async () => {
  const db = new DatabaseSync(':memory:');
  try {
    db.exec(await source('drizzle/0040_portal_whatsapp.sql'));
    const statement = db.prepare("INSERT INTO portal_whatsapp_events (id,recorded_on,contact_id,contact_label,action,placement) VALUES (?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET hits=hits+1");
    statement.run('day:support:floating:click','2026-10-09','support','Soporte','contact_click','floating');
    statement.run('day:support:floating:click','2026-10-09','support','Soporte','contact_click','floating');
    assert.equal(db.prepare('SELECT hits FROM portal_whatsapp_events').get().hits,2);
    assert.equal(db.prepare('SELECT count(*) AS n FROM portal_whatsapp_events').get().n,1);
    assert.throws(()=>statement.run('bad','2026-10-09','support','Soporte','fake','floating'));
    const columns = db.prepare('PRAGMA table_info(portal_whatsapp_events)').all().map(row=>row.name);
    for (const privateField of ['ip','phone','viewer_key','user_id','referrer_path']) assert.ok(!columns.includes(privateField));
  } finally { db.close(); }
});

test('portal settings remain authorized and audited, with separate consented and non-identifying Google measurement', async () => {
  const [route, menu, link, editor, css] = await Promise.all(['app/api/admin/settings/route.ts','app/FloatingWhatsappMenu.tsx','app/PortalWhatsappLink.tsx','app/admin/configuracion/WhatsappSettingsEditor.tsx','app/globals.css'].map(source));
  assert.match(route,/assertSameOrigin\(request\)/);
  assert.match(route,/adminHasCapability\(admin, "settings.manage"\)/);
  assert.match(route,/validateWhatsappContacts\(input\)/);
  assert.match(route,/recordAdminAudit\(admin/);
  assert.match(menu,/aria-expanded=\{open\}/);
  assert.match(menu,/event.key !== "Escape"/);
  assert.match(menu,/removeEventListener\("pointerdown"/);
  assert.match(link,/keepalive: true/);
  assert.match(link,/trackAnalyticsEvent\(action/);
  assert.match(link,/contact_area: area, contact_placement: placement/);
  assert.doesNotMatch(link,/contact_label:|phone:|message:|dataLayer|document.cookie|localStorage/);
  const analytics = await source('app/AnalyticsEvent.tsx');
  assert.match(analytics,/!hasAnalyticsConsent\(\)/);
  assert.match(editor,/key=\{contact.id\}/);
  assert.match(editor,/\+ Agregar WhatsApp/);
  assert.match(css,/\.portal-whatsapp-panel[^}]*max-height: calc\(100dvh/);
});

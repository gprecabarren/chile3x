// Read-only LOCAL page checks; temporary QA role changes are restored in finally.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
const base='http://localhost:3000',f=JSON.parse(readFileSync('outputs/qa-media-admin.json','utf8'));assert.ok(f.prefix.startsWith('qa_media_'));
const db=new DatabaseSync('.wrangler/visual-state/v3/d1/miniflare-D1DatabaseObject/57517e47ee4bded0b6657bc2537948a96d7c7d36cc7da324b304803924096a61.sqlite');
const read=cookie=>fetch(base+'/admin',{headers:{cookie,authorization:'qa-local-cache-bypass'},redirect:'manual'});
const previous=db.prepare('SELECT access_level FROM admin_github_access WHERE user_id=?').get(f.admin).access_level;
try{
 const full=await read(f.adminCookie);assert.equal(full.status,200);const html=await full.text();assert.match(html,/admin-workspace/);assert.match(html,/href="\/admin" class="admin-home-link"/);assert.match(html,/admin-sidebar-navigation/);
 assert.ok([302,303,307].includes((await read(f.ownerCookie)).status));
 db.prepare("UPDATE admin_github_access SET access_level='support' WHERE user_id=?").run(f.admin);
 const limited=await read(f.adminCookie);assert.equal(limited.status,200);const text=await limited.text();const nav=text.match(/<nav aria-label="Administración">([\s\S]*?)<\/nav>/)?.[1];assert.ok(nav);
 for(const path of ['/admin/reportes','/admin/testing','/admin/telegram','/admin/ayuda'])assert.ok(nav.includes(path));
 for(const path of ['/admin/medios','/admin/cuentas','/admin/configuracion','/admin/administradores','/foro'])assert.ok(!nav.includes(path));
 console.log('PASS: local admin shell and separate ADMIN link, normal account denied, support sees only its permitted links; no permission/schema changes.');
}finally{db.prepare('UPDATE admin_github_access SET access_level=? WHERE user_id=?').run(previous,f.admin);db.close();}

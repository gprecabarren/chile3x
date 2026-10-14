// Explicit QA-only timestamp variation. Never publishes, changes ads or uploads media.
import assert from 'node:assert/strict';
import { readFile,writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { resolve,sep } from 'node:path';
import { createHash,randomUUID } from 'node:crypto';
const directory=resolve(process.argv[2]??'');assert.ok(directory.startsWith(resolve('tmp')+sep+'qa-directory-'));
const plan=JSON.parse(await readFile(resolve(directory,'manifest.json'),'utf8'));assert.equal(plan.directory,directory);
assert.match(plan.runId,/^qa_stories_[a-f0-9]{32}$/);
const env={...process.env};delete env.CLOUDFLARE_API_TOKEN;delete env.CLOUDFLARE_ACCOUNT_ID;
const exec=promisify(execFile),cli=resolve('node_modules/wrangler/bin/wrangler.js');
const quote=value=>`'${String(value).replaceAll("'","''")}'`,digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
async function query(sql){const {stdout}=await exec(process.execPath,[cli,'d1','execute','chile3x-db','--remote','--command',sql,'--json'],{env,maxBuffer:12_000_000,timeout:60_000});const result=JSON.parse(stdout);assert.ok(result.every(x=>x.success));return result.map(x=>x.results);}
async function snapshot(){const [profiles,media,documents,stories]=await query(`SELECT * FROM profiles ORDER BY id;SELECT id,profile_id,r2_key,moderation_status,is_profile_photo FROM profile_media ORDER BY id;SELECT id,profile_id,r2_key,created_at,updated_at FROM profile_verification_files ORDER BY id;SELECT * FROM profile_statuses WHERE instr(id,${quote(plan.runId)})>0 ORDER BY created_at,id;`);return {profiles,media,documents,stories};}
const before=await snapshot(),protectedId='prf_d795bbb6-e196-4ee7-997d-6b5a02a75673';
assert.equal(before.profiles.find(x=>x.id===protectedId)?.handle,'lalita');
const ids=before.profiles.filter(x=>plan.targets.includes(x.id)&&x.id!==protectedId&&x.handle!=='lalita'&&x.status==='approved'&&x.is_demo===1&&!x.trashed_at&&!x.owner_hidden_at).map(x=>x.id);
assert.equal(ids.length,32);assert.equal(before.stories.length,320);assert.ok(before.stories.every(x=>ids.includes(x.profile_id)&&x.body.startsWith('QA ·')));
for(const id of ids)for(const type of ['image','text'])assert.equal(before.stories.filter(x=>x.profile_id===id&&x.story_type===type).length,5);
const last=Math.min(Math.max(...before.stories.map(x=>Date.parse(x.created_at))),Date.now());
const start=last-(before.stories.length-1)*60_000;assert.ok(start+86400_000>Date.now()+3600_000,'Do not revive expired or nearly expired QA data.');
const changes=before.stories.map((row,index)=>({...row,created_at:new Date(start+index*60_000).toISOString(),expires_at:new Date(start+index*60_000+86400_000).toISOString()}));
const statements=changes.map((next,index)=>{const row=before.stories[index];return `UPDATE profile_statuses SET created_at=${quote(next.created_at)},expires_at=${quote(next.expires_at)} WHERE id=${quote(row.id)} AND profile_id=${quote(row.profile_id)} AND created_at=${quote(row.created_at)} AND expires_at=${quote(row.expires_at)} AND EXISTS(SELECT 1 FROM profiles p JOIN users u ON u.id=p.owner_id WHERE p.id=profile_statuses.profile_id AND p.status='approved' AND p.is_demo=1 AND p.trashed_at IS NULL AND p.owner_hidden_at IS NULL AND u.is_active=1 AND p.id<>${quote(protectedId)} AND lower(p.handle)<>'lalita');`;});
statements.push(`INSERT INTO admin_audit_logs(id,actor_email,actor_name,category,action,entity_type,entity_id,summary,metadata) VALUES(${quote('audit_qa_'+randomUUID())},'chile3x.internal@cuentas.chile3x.invalid','QA asistido · petición del propietario','quality','story.qa_retime','settings',${quote(plan.runId)},'Varió únicamente los minutos ficticios de 320 historias QA; mantuvo sus 24 horas de vigencia y todos los anuncios.',${quote(JSON.stringify({runId:plan.runId,profiles:ids.length,stories:changes.length,first:start,last,realAuditTime:true}))});`);
const generatedSql=resolve(directory,'retime-stories.sql');
await writeFile(generatedSql,statements.join('\n'));
const applied=await exec(process.execPath,[cli,'d1','execute','chile3x-db','--remote','--file',generatedSql,'--yes','--json'],{env,maxBuffer:12_000_000,timeout:60_000});
const parsed=JSON.parse(applied.stdout.slice(applied.stdout.search(/^\s*\[/m)));assert.ok(parsed.every(x=>x.success));
const after=await snapshot();for(const key of ['profiles','media','documents'])assert.equal(digest(after[key]),digest(before[key]),key+' changed unexpectedly');
const byId=new Map(after.stories.map(x=>[x.id,x]));for(const next of changes)assert.equal(digest(byId.get(next.id)),digest(next));
console.log(JSON.stringify({retimedQaStories:changes.length,qaProfiles:ids.length,distinctMinutes:changes.length,lifetimeHours:24,firstCreatedAt:changes[0].created_at,lastCreatedAt:changes.at(-1).created_at,allAdsAndExistingFilesUnchanged:true,pendingNeverPublished:true,lalitaUnchanged:true}));

// Explicit production QA operation requested on 2026-10-14. No account/auth writes.
// prepare is read-only; apply-config and publish-stories require its exact snapshot.
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, join, sep } from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { imageHeaderType } from '../lib/image-upload-policy.ts';

const exec = promisify(execFile);
const mode = process.argv[2];
const protectedId = 'prf_d795bbb6-e196-4ee7-997d-6b5a02a75673';
const cli = resolve('node_modules/wrangler/bin/wrangler.js');
const env = { ...process.env }; delete env.CLOUDFLARE_API_TOKEN; delete env.CLOUDFLARE_ACCOUNT_ID;
const quote = value => value == null ? 'NULL' : `'${String(value).replaceAll("'", "''")}'`;
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
async function run(args) {
  const result = await exec(process.execPath, [cli, ...args], { env, maxBuffer:20_000_000, timeout:60_000 });
  return result.stdout;
}
async function upload(args) {
  for (let attempt=0;attempt<3;attempt++) {
    try { return await run(args); }
    catch (error) {
      if (attempt===2 || !/500|502|503|504|timed out|ETIMEDOUT|ECONNRESET/.test(String(error))) throw error;
      console.log(JSON.stringify({temporaryStorageFailure:true,retry:attempt+1}));
      await new Promise(resolve=>setTimeout(resolve,500*(attempt+1)));
    }
  }
}
async function query(sql) {
  const result = JSON.parse(await run(['d1','execute','chile3x-db','--remote','--config','wrangler.json','--command',sql,'--json']));
  assert.ok(result.every(row => row.success)); return result.map(row => row.results);
}
async function sqlFile(directory, name, sql) {
  const path = join(directory,name); await writeFile(path, sql);
  const output = await run(['d1','execute','chile3x-db','--remote','--config','wrangler.json','--file',path,'--yes','--json']);
  await writeFile(join(directory,name+'.result.txt'),output);
  const start=output.search(/^\s*\[/m); assert.ok(start>=0,'SQL result unavailable: inspect saved output before retrying');
  const result = JSON.parse(output.slice(start));
  assert.ok(result.every(row => row.success)); return result;
}
async function snapshot() {
  const [profiles,details,tags,services,media,documents,stories] = await query('SELECT p.*,u.is_active AS owner_active FROM profiles p JOIN users u ON u.id=p.owner_id ORDER BY p.id; SELECT * FROM profile_details ORDER BY profile_id; SELECT * FROM profile_tags ORDER BY id; SELECT * FROM profile_services ORDER BY id; SELECT * FROM profile_media ORDER BY id; SELECT * FROM profile_verification_files ORDER BY id; SELECT * FROM profile_statuses ORDER BY id;');
  assert.equal(profiles.find(row=>row.id===protectedId)?.handle,'lalita');
  assert.equal(profiles.filter(row=>row.handle?.toLowerCase()==='lalita').length,1);
  return {profiles,details,tags,services,media,documents,stories};
}
function scope(row) { return row.id!==protectedId && row.handle?.toLowerCase()!=='lalita' && !row.trashed_at; }
function publicRow(row) { return scope(row) && row.status==='approved' && !row.owner_hidden_at && row.owner_active===1; }
function guarded(row,prefix='') { assert.ok(scope(row)); return `${prefix}id=${quote(row.id)} AND ${prefix}owner_id=${quote(row.owner_id)} AND ${prefix}handle=${quote(row.handle)} AND ${prefix}id!=${quote(protectedId)} AND lower(${prefix}handle)!='lalita' AND ${prefix}trashed_at IS NULL`; }
function audit(action,row,summary,before,after,metadata) {
  return `INSERT INTO admin_audit_logs(id,actor_email,actor_name,category,action,entity_type,entity_id,entity_label,summary,before_data,after_data,metadata) SELECT ${quote('audit_qa_'+randomUUID())},'chile3x.internal@cuentas.chile3x.invalid','QA asistido · petición del propietario','quality',${quote(action)},'profile',${quote(row.id)},${quote(row.display_name)},${quote(summary)},${quote(JSON.stringify(before))},${quote(JSON.stringify(after))},${quote(JSON.stringify({executedBy:'Codex QA',userRequest:'2026-10-14',...metadata}))} WHERE EXISTS(SELECT 1 FROM profiles WHERE ${guarded(row)});`;
}
function metadataFor(row,index,source) {
  const values = name => JSON.parse(source.match(new RegExp(`export const ${name} = (\\[[\\s\\S]*?\\]) as const`))[1]);
  const username = `qa_chile3x_${index}_${randomUUID().replaceAll('-','').slice(0,12)}`;
  const availability = ['mon=09:00-18:00|wed=10:00-19:00|fri=12:00-22:00','tue=00:00-24:00|thu=00:00-24:00|sat=00:00-24:00','mon=18:00-24:00|fri=19:00-24:00|sun=10:00-16:00'][index%3];
  const common = {availability,instagram_url:`https://www.instagram.com/${username}`};
  if (row.type==='rental') return {...common,room_type:index%2?'compartida':'individual',furnished:index%2?'no':'si',private_bathroom:index%3?'si':'no',exterior_window:index%2?'si':'no',room_size:String(18+index%20),common_expenses:index%2?'si':'no',deposit:String(100000+index*5000),minimum_rental:index%2?'semanas':'meses',immediate_available:index%2?'si':'no',wifi:index%2?'si':'no',utilities_included:index%3?'si':'no',kitchen:index%2?'si':'no',laundry:index%3?'si':'no'};
  const contact = {...common,website:`https://example.invalid/qa/${row.handle}`,facebook_url:`https://www.facebook.com/${username}`,twitter_url:`https://x.com/${username}`,arsmate_url:`https://arsmate.com/${username}`,onlyfans_url:`https://onlyfans.com/${username}`,contact_methods:'Contacto ficticio para QA; no operativo'};
  if (row.type==='agency') return {...contact,agency_years:String(1+index%12),promotions:`Promoción ficticia ${index+1}: texto de prueba, sin oferta real.`};
  return {...contact,gender:values('escortGenders')[index%4],age:String(23+index%32),nationality:values('nationalities')[index%9],skin_color:values('skinColors')[index%4],languages:['Español','Español, Inglés','Español, Portugués, Francés'][index%3],height_cm:String(155+index%30),weight_kg:String(50+index%35),measurements:['90-60-90','95-65-95','100-70-100'][index%3],hair_color:values('hairColors')[index%5],body_type:values('bodyTypes')[index%5],bust_size:values('bustSizes')[index%4],price_30_min:String(20000+index*1000),price_60_min:String(40000+index*1500),price_moment:String(15000+index*500),price_night:String(120000+index*2000),travel_city:['Concepción','Providencia','Viña del Mar'][index%3],travel_start:'2026-10-20',travel_end:'2026-10-23',travel_note:'Viaje ficticio para QA. No hay atención ni desplazamiento real.'};
}

let directory;
if (mode==='prepare') {
  directory=resolve(`tmp/qa-directory-2026-10-14-${randomUUID().slice(0,8)}`); await mkdir(directory,{recursive:true});
  // Never include unreviewed submissions: those may belong to real visitors.
  const before=await snapshot(); const targets=before.profiles.filter(row=>scope(row)&&row.status==='approved'&&row.is_demo===1); assert.ok(targets.length>0 && targets.length<100);
  const assets=[];
  for (const [index,id] of [10,15,29,160,244].entries()) {
    const info=await (await fetch(`https://picsum.photos/id/${id}/info`,{signal:AbortSignal.timeout(30000)})).json();
    const response=await fetch(`https://picsum.photos/id/${id}/${index%2?1280:1080}/${index%2?720:1620}.jpg`,{signal:AbortSignal.timeout(30000)});
    assert.ok(response.ok); const bytes=Buffer.from(await response.arrayBuffer()); assert.equal(imageHeaderType(bytes),'image/jpeg'); assert.ok(bytes.length<=2_000_000);
    const file=join(directory,`landscape-${index+1}.jpg`); await writeFile(file,bytes);
    assets.push({file,bytes:bytes.length,contentType:'image/jpeg',author:info.author,source:info.url,picsumId:id});
  }
  const plan={runId:'qa_stories_'+randomUUID().replaceAll('-',''),directory,before,targets:targets.map(row=>row.id),assets,rounds:[],configured:false};
  await writeFile(join(directory,'manifest.json'),JSON.stringify(plan,null,2));
  console.log(JSON.stringify({directory,profiles:targets.length,published:targets.filter(publicRow).length,pending:targets.filter(row=>row.status!=='approved').length,assets:assets.map(a=>({file:a.file,bytes:a.bytes,author:a.author})),protectedHandle:'lalita',mutated:false}));
} else {
  assert.ok(['apply-config','publish-stories','restore-pending','verify'].includes(mode),'Specify a documented mode');
  directory=resolve(process.argv[3]??''); assert.ok(directory.startsWith(resolve('tmp')+sep+'qa-directory-'));
  const manifest=join(directory,'manifest.json'); const plan=JSON.parse(await readFile(manifest,'utf8')); assert.equal(plan.directory,directory);
  const current=await snapshot();
  const protectedPart=s=>Object.fromEntries(Object.entries(s).map(([key,rows])=>[key,rows.filter(row=>row.id===protectedId||row.profile_id===protectedId)]));
  assert.equal(digest(protectedPart(current)),digest(protectedPart(plan.before)),'Lalita changed; stop without further writes');
  assert.equal(digest(current.media),digest(plan.before.media),'Existing photos/videos changed; stop');
  assert.equal(digest(current.documents),digest(plan.before.documents),'Existing private files changed; stop');
  const targets=plan.before.profiles.filter(row=>plan.targets.includes(row.id)); assert.ok(targets.every(scope));
  if (mode==='restore-pending') {
    const pending=targets.filter(row=>row.status==='pending');
    assert.equal(pending.length,12);
    const restore=[]; const fields=['short_description','description','comuna','tier','contact_whatsapp','contact_telegram','verification_status','verified_at','is_demo','updated_at'];
    await writeFile(join(directory,'before-restore-pending.json'),JSON.stringify(current,null,2));
    for (const row of pending) {
      const live=current.profiles.find(p=>p.id===row.id);
      assert.equal(live.status,'pending');assert.ok(live.description.startsWith('PERFIL DE PRUEBA'),'A pending owner may have edited: stop and preserve their new work');
      restore.push(`UPDATE profiles SET ${fields.map(key=>`${key}=${quote(row[key])}`).join(',')} WHERE ${guarded(row)} AND status='pending';`);
      for (const [table,key] of [['profile_details','details'],['profile_tags','tags'],['profile_services','services']]) {
        restore.push(`DELETE FROM ${table} WHERE profile_id=${quote(row.id)} AND EXISTS(SELECT 1 FROM profiles WHERE ${guarded(row)} AND status='pending');`);
        for (const saved of plan.before[key].filter(record=>record.profile_id===row.id)) restore.push(`INSERT INTO ${table}(${Object.keys(saved).join(',')}) SELECT ${Object.values(saved).map(quote).join(',')} WHERE EXISTS(SELECT 1 FROM profiles WHERE ${guarded(row)} AND status='pending');`);
      }
      restore.push(audit('qa.profile_restore',row,'Restauró el anuncio pendiente original tras aclarar que no era ficticio. No lo publicó ni cambió archivos.',{testFieldsApplied:true},{restoredOriginalFields:true,status:'pending'},{runId:plan.runId,correctionOf:'qa.profile_configure'}));
    }
    await sqlFile(directory,'restore-pending.sql',restore.join('\n'));
    const restored=await snapshot();
    for (const row of pending) {
      assert.equal(digest(restored.profiles.find(p=>p.id===row.id)),digest(row));
      for(const key of ['details','tags','services','media','documents','stories']) assert.equal(digest(restored[key].filter(p=>p.profile_id===row.id)),digest(plan.before[key].filter(p=>p.profile_id===row.id)));
    }
    plan.restoredPending=pending.map(row=>row.id);await writeFile(manifest,JSON.stringify(plan,null,2));
    console.log(JSON.stringify({restoredOriginalPending:pending.length,allFieldsAndRelationsMatchBackup:true,nonePublished:true,noStoriesAdded:true,mediaAndDocumentsUnchanged:true,lalitaUnchanged:true}));
  }
  if (mode==='apply-config'&&!plan.configured) {
    const [auditCount]=await query(`SELECT count(*) AS n FROM admin_audit_logs WHERE action='qa.profile_configure' AND json_extract(metadata,'$.runId')=${quote(plan.runId)};`);
    if (auditCount[0].n===targets.length) {
      assert.ok(targets.every(row=>current.profiles.find(p=>p.id===row.id)?.description.startsWith('PERFIL DE PRUEBA')));
      plan.configured=true; await writeFile(manifest,JSON.stringify(plan,null,2)); console.log(JSON.stringify({recoveredConfirmedConfiguration:targets.length,duplicateWrites:false}));
    }
  }
  if (mode==='apply-config'&&!plan.configured) {
    assert.equal(plan.configured,false); const source=await readFile('lib/profile.ts','utf8'); const sql=[];
    const rollback=[];
    for (const row of targets) {
      rollback.push(`UPDATE profiles SET ${Object.entries(row).filter(([key])=>!['id','owner_active'].includes(key)).map(([key,value])=>`${key}=${quote(value)}`).join(',')} WHERE ${guarded(row)};`);
      for (const [table,key] of [['profile_details','details'],['profile_tags','tags'],['profile_services','services']]) {
        rollback.push(`DELETE FROM ${table} WHERE profile_id=${quote(row.id)} AND EXISTS(SELECT 1 FROM profiles WHERE ${guarded(row)});`);
        for (const saved of plan.before[key].filter(record=>record.profile_id===row.id)) rollback.push(`INSERT INTO ${table}(${Object.keys(saved).join(',')}) VALUES(${Object.values(saved).map(quote).join(',')});`);
      }
    }
    await writeFile(join(directory,'rollback-config.sql'),rollback.join('\n'));
    for (const [index,row] of targets.entries()) {
      const metadata=metadataFor(row,index,source); const phone=String(12025550100+index); const description=`PERFIL DE PRUEBA — QA Chile3X. ${row.display_name} es una ficha ficticia para comprobar diseño, filtros, campos, horarios e historias en móvil y PC. No representa una persona, agencia, arriendo ni servicio disponible. Precios, datos, viajes, contactos y enlaces son ejemplos no operativos. No contactar ni contratar.`;
      const details={contact_phone:phone,contact_email:`qa-${index}@example.invalid`,reference_location:`Zona referencial de ${row.city}; ejemplo ${index+1}, no dirección real.`,schedule:['Lunes, miércoles y viernes · horario ficticio','Martes, jueves y sábado · 24 horas, solo QA','Horarios de tarde y domingo · datos ficticios'][index%3],price_amount:row.type==='rental'?350000+index*5000:40000+index*1000,currency:'CLP',metadata:JSON.stringify(metadata)};
      sql.push(`UPDATE profiles SET short_description='Perfil ficticio de prueba QA; no ofrece servicios.',description=${quote(description)},comuna=${quote(['Centro (QA)','Zona norte (QA)','Zona sur (QA)'][index%3])},tier=${quote(row.type==='escort'?['vip','premium','bronze'][index%3]:'bronze')},contact_whatsapp=${quote(phone)},contact_telegram=${quote(`qa_chile3x_${plan.runId.slice(-12)}_${index}`)},verification_status='unreviewed',verified_at=NULL,is_demo=1,updated_at=CURRENT_TIMESTAMP WHERE ${guarded(row)};`);
      const columns=Object.keys(details); sql.push(`INSERT INTO profile_details(profile_id,${columns.join(',')}) SELECT ${quote(row.id)},${columns.map(key=>quote(details[key])).join(',')} WHERE EXISTS(SELECT 1 FROM profiles WHERE ${guarded(row)}) ON CONFLICT(profile_id) DO UPDATE SET ${columns.map(key=>`${key}=excluded.${key}`).join(',')},updated_at=CURRENT_TIMESTAMP;`);
      sql.push(`DELETE FROM profile_tags WHERE profile_id=${quote(row.id)} AND EXISTS(SELECT 1 FROM profiles WHERE ${guarded(row)});`);
      sql.push(`DELETE FROM profile_services WHERE profile_id=${quote(row.id)} AND EXISTS(SELECT 1 FROM profiles WHERE ${guarded(row)});`);
      if (row.type==='escort') {
        const gender=metadata.gender; const tag=gender==='Trans'?'trans':gender==='Masculino'?'hombres':Number(metadata.age)>=35&&index%2===0?'milf':'masajes';
        sql.push(`INSERT INTO profile_tags(id,profile_id,tag) SELECT ${quote('tag_qa_'+randomUUID())},${quote(row.id)},${quote(tag)} WHERE EXISTS(SELECT 1 FROM profiles WHERE ${guarded(row)});`);
        for (const [kind,services] of [['included',['Departamento propio','Hoteles','Domicilio','Acompañamiento','Videollamada'].filter((_,i)=>i%3!==index%3)],['additional',['Traslado','Viajes','Noche completa','Atención fuera de horario'].filter((_,i)=>i%2===index%2)]]) for (const service of services) sql.push(`INSERT INTO profile_services(id,profile_id,kind,service) SELECT ${quote('srv_qa_'+randomUUID())},${quote(row.id)},${quote(kind)},${quote(service)} WHERE EXISTS(SELECT 1 FROM profiles WHERE ${guarded(row)});`);
      }
      sql.push(audit('qa.profile_configure',row,'Preparó campos ficticios para QA, retiró verificado y mantuvo estado y archivos.',{profile:row,details:plan.before.details.find(d=>d.profile_id===row.id)},{metadata,verificationStatus:'unreviewed',testProfile:true},{runId:plan.runId}));
    }
    await sqlFile(directory,'configure.sql',sql.join('\n')); plan.configured=true; await writeFile(manifest,JSON.stringify(plan,null,2)); console.log(JSON.stringify({configured:targets.length,protectedHandle:'lalita',statesAndMediaPreserved:true}));
  }
  if (mode==='publish-stories') {
    assert.ok(plan.configured); const published=targets.filter(publicRow);
    for (let round=0;round<5;round++) {
      if (plan.rounds.includes(round)) continue;
      const records=[];
      for (const [index,row] of published.entries()) for (const type of ['image','text']) {
        const id=`story_${plan.runId}_${round}_${index}_${type}`; const asset=plan.assets[(round+index)%plan.assets.length];
        records.push({row,id,type,asset,key:type==='image'?`stories/${row.id}/${id}.jpg`:null});
      }
      let cursor=0; await Promise.all(Array.from({length:4},async()=>{while(cursor<records.length){const record=records[cursor++];if(record.key) await upload(['r2','object','put',`chile3x-media/${record.key}`,'--remote','--file',record.asset.file,'--content-type','image/jpeg','--cache-control','private, no-store']);}}));
      const sql=[]; const stamp=Date.now();
      for (const [position,record] of records.entries()) {
        const {row,id,type,asset,key}=record; const created=new Date(stamp-(records.length-position)).toISOString(); const expires=new Date(new Date(created).getTime()+86400000).toISOString();
        const body=type==='image'?`QA · Foto ${round+1}/5 · Fotografía de ${asset.author}. Perfil ficticio; sin oferta real.`:`QA · Texto ${round+1}/5 · ${row.display_name}. ${['Probando emojis 🌿 y saltos de línea.\nNo es un servicio real.','Texto breve para revisar contraste.','Comprobando pausa, siguiente y cierre.','Prueba de orden y tiempo de vigencia.','Último estado de la ronda. Perfil ficticio.'][round]}`;
        assert.ok(body.length<=180);
        sql.push(`INSERT OR IGNORE INTO profile_statuses(id,profile_id,body,story_type,r2_key,content_type,byte_size,created_at,expires_at) SELECT ${quote(id)},${quote(row.id)},${quote(body)},${quote(type)},${quote(key)},${quote(type==='image'?'image/jpeg':null)},${type==='image'?asset.bytes:0},${quote(created)},${quote(expires)} WHERE (SELECT count(*) FROM profile_statuses WHERE profile_id=${quote(row.id)} AND story_type=${quote(type)} AND expires_at>${quote(created)})<5 AND EXISTS(SELECT 1 FROM profiles p JOIN users u ON u.id=p.owner_id WHERE ${guarded(row,'p.')} AND p.status='approved' AND p.owner_hidden_at IS NULL AND u.is_active=1);`);
        sql.push(audit('story.create',row,`Publicó historia ${type==='image'?'de imagen':'de texto'} de QA, ronda ${round+1}.`,null,{storyId:id,storyType:type,createdAt:created,expiresAt:expires},{runId:plan.runId,source:type==='image'?asset.source:null}));
      }
      await sqlFile(directory,`stories-round-${round+1}.sql`,sql.join('\n')); plan.rounds.push(round); await writeFile(manifest,JSON.stringify(plan,null,2)); console.log(JSON.stringify({round:round+1,profiles:published.length,storiesInRound:records.length,alternating:true}));
    }
  }
  if (mode==='verify') {
    const after=await snapshot();
    assert.equal(digest(protectedPart(after)),digest(protectedPart(plan.before)));
    assert.equal(digest(after.media),digest(plan.before.media)); assert.equal(digest(after.documents),digest(plan.before.documents));
    for (const before of targets) {
      const row=after.profiles.find(p=>p.id===before.id); assert.equal(row.status,before.status); assert.equal(row.owner_hidden_at,before.owner_hidden_at); assert.equal(row.display_name,before.display_name); assert.equal(row.handle,before.handle);
      if(plan.restoredPending?.includes(before.id)){assert.equal(digest(row),digest(before));continue;}
      assert.equal(row.verification_status,'unreviewed'); assert.equal(row.verified_at,null); assert.ok(row.description.includes('PERFIL DE PRUEBA')); assert.equal(row.is_demo,1);
      if (!publicRow(before)) continue;
      const stories=after.stories.filter(s=>s.profile_id===before.id&&s.id.includes(plan.runId)).sort((a,b)=>a.created_at.localeCompare(b.created_at));
      assert.equal(stories.length,10); assert.equal(stories.filter(s=>s.story_type==='image').length,5); assert.equal(stories.filter(s=>s.story_type==='text').length,5);
      for (const [index,story] of stories.entries()) {assert.equal(story.story_type,index%2?'text':'image');assert.equal(new Date(story.expires_at)-new Date(story.created_at),86400000);}
    }
    const count=after.stories.filter(s=>s.id.includes(plan.runId)).length;
    console.log(JSON.stringify({verified:true,configured:targets.length-(plan.restoredPending?.length??0),restoredPending:plan.restoredPending?.length??0,storyProfiles:targets.filter(publicRow).length,stories:count,images:count/2,texts:count/2,lalitaUnchanged:true,allExistingMediaUnchanged:true,backup:join(directory,'manifest.json')}));
  }
}

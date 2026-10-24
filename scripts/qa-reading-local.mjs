// Disposable local news only, using the existing local QA administrator.
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,writeFileSync,existsSync,unlinkSync} from 'node:fs';
import {resolve} from 'node:path';
const root=resolve('.wrangler/visual-state');
const path=resolve(root,'v3/d1/miniflare-D1DatabaseObject/57517e47ee4bded0b6657bc2537948a96d7c7d36cc7da324b304803924096a61.sqlite');
assert.ok(path.startsWith(root+'\\')||path.startsWith(root+'/'));
const manifest='outputs/qa-reading-fixture.json';
const db=new DatabaseSync(path);
try {
 if(process.argv[2]==='seed') {
  assert.ok(!existsSync(manifest));
  const account=JSON.parse(readFileSync('outputs/qa-account-stories.json','utf8'));
  assert.match(account.prefix,/^qa_stories_[a-f0-9]+$/);
  const author=account.users.find(id=>id.endsWith('_admin'));assert.ok(author);
  const id=account.prefix+'_reading_article',slug='qa-reading-'+account.prefix.slice(11);
  const privacy=process.argv[3]==='privacy';
  const content=privacy?'<p>La privacidad digital consiste en decidir qué información compartes y con quién. Esta página es un documento local de prueba para revisar la lectura en pantallas grandes.</p>'+['Comparte solo lo necesario','Protege tus accesos','Revisa los permisos','Usa canales oficiales','Cuida tus dispositivos'].map(title=>`<h2>${title}</h2><p>No compartas contraseñas ni códigos de acceso. Comprueba el destino de los enlaces y utiliza las opciones de seguridad disponibles en tus dispositivos.</p><p>Mantén tus aplicaciones actualizadas. Revisa periódicamente los permisos y las sesiones activas para conocer cómo se utiliza tu información.</p>`).join(''):readFileSync('docs/content/como-funciona-chile3x.html','utf8');
  db.prepare('INSERT INTO news_posts(id,author_id,title,slug,excerpt,content_html,status,published_at,updated_at,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)').run(id,author,privacy?'Privacidad digital: guía práctica para proteger tus datos':'Cómo funciona Chile3X: crear cuenta y publicar un anuncio',slug,'Guía visual local desechable para comprobar lectura, índice y pasos en todos los tamaños.',content,'published','2026-10-24 00:00:00','2026-10-24 00:00:00','2026-10-24 00:00:00');
  writeFileSync(manifest,JSON.stringify({id,author,slug}));
  console.log('PASS disposable local reading article: /noticias/'+slug);
 } else if(process.argv[2]==='cleanup') {
  if(existsSync(manifest)) {
   const fixture=JSON.parse(readFileSync(manifest,'utf8'));assert.match(fixture.id,/^qa_stories_[a-f0-9]+_reading_article$/);
   db.prepare('DELETE FROM news_posts WHERE id=? AND author_id=?').run(fixture.id,fixture.author);
   unlinkSync(manifest);console.log('PASS disposable local article removed.');
  }
 } else throw Error('Use seed or cleanup.');
} finally {db.close();}

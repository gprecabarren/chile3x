// Deliberately inline and independent of React, CSS and versioned JS chunks.
// No automatic reload, storage access, form reads or request replay.
export const LOAD_RECOVERY_SCRIPT=String.raw`(()=>{
 if(window.__chile3xLoadRecoveryReady)return;window.__chile3xLoadRecoveryReady=true;
 let blankSince=0,assetFailed=false,timer=0;
 function recover(){
  if(!document.body||document.getElementById('portal-load-recovery'))return;
  const box=document.createElement('section');box.id='portal-load-recovery';box.setAttribute('role','alert');box.setAttribute('aria-labelledby','portal-load-recovery-title');
  box.style.cssText='position:fixed;inset:0;z-index:2147483000;overflow:auto;box-sizing:border-box;padding:clamp(24px,7vw,80px);background:#090c13;color:#f2f4f8;font:400 16px/1.6 system-ui,sans-serif';
  box.innerHTML='<div style="max-width:680px;margin:8vh auto"><p style="color:#ff9ba5;letter-spacing:.12em">CHILE3X</p><h2 id="portal-load-recovery-title" style="font-size:clamp(28px,5vw,42px);line-height:1.2">No se pudo completar la carga</h2><p>La conexión o una actualización del sitio interrumpió la página. No repitas un guardado ni una subida sin comprobar antes su estado.</p><button type="button" style="padding:12px 18px;border:1px solid #73829a;border-radius:10px;background:#263245;color:#fff;font:inherit">Volver a cargar la página</button><p><a href="/mi-cuenta" style="color:#a8c9ff;margin-right:20px">Mi cuenta</a><a href="/admin" style="color:#a8c9ff;margin-right:20px">Administración</a><a href="/" style="color:#a8c9ff">Inicio</a></p></div>';
  box.querySelector('button').addEventListener('click',()=>location.reload());document.body.appendChild(box);clearInterval(timer);timer=0;
 }
 function check(){
  if(document.visibilityState==='hidden'||!document.body||document.getElementById('portal-load-recovery'))return;
  const main=document.querySelector('main'),stuck=assetFailed&&document.querySelector('.session-check-screen section[role="status"]');
  const hasContent=main?!!main.textContent.trim():!!document.body.innerText.trim();
  if(hasContent&&!stuck){blankSince=0;return;}
  if(!blankSince)blankSince=Date.now();if(Date.now()-blankSince>=10_000)recover();
 }
 function start(){if(!timer)timer=setInterval(check,1500);}
 window.addEventListener('error',event=>{const node=event.target;if(node&&node.tagName==='SCRIPT'&&node.src&&node.src.startsWith(location.origin+'/assets/'))assetFailed=true;},true);
 window.addEventListener('unhandledrejection',event=>{if(String(event.reason).includes(location.origin+'/assets/'))assetFailed=true;});
 window.addEventListener('pagehide',()=>{clearInterval(timer);timer=0;});window.addEventListener('pageshow',start);start();
})();`;

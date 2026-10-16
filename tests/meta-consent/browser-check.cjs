const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'@playwright/test');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const OUT=path.resolve(__dirname,'../../../browser-evidence');fs.mkdirSync(OUT,{recursive:true});
const BASE='http://127.0.0.1:45992';
const SDK=`(()=>{const q=window.fbq;let granted=false;window.__metaCalls=[];const run=(...a)=>{window.__metaCalls.push(a);if(a[0]==='consent')granted=a[1]==='grant';if(a[0]==='track'&&granted){document.cookie='_fbp=synthetic; Path=/';const i=new Image();i.src='https://www.facebook.com/tr?id=955909697258843&ev='+encodeURIComponent(a[1])+'&dl='+encodeURIComponent(location.href)+'&rl='+encodeURIComponent(document.referrer);}};q.callMethod=run;for(const a of q.queue.splice(0))run(...a);window.addEventListener('popstate',()=>{if(granted)run('track','AUTOMATIC_PRIVACY_CANARY')});})();`;
const results=[];
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--disable-dev-shm-usage'],executablePath:process.env.CHROMIUM_PATH});
 async function session(js=true,workers='block'){
  const context=await browser.newContext({javaScriptEnabled:js,serviceWorkers:workers});const seen=[];
  await context.route('**/*',async route=>{const u=new URL(route.request().url());
   if(u.hostname==='127.0.0.1'&&['45991','45992'].includes(u.port))return route.continue();
   seen.push({host:u.hostname,path:u.pathname,url:u.href});
   if(u.hostname==='connect.facebook.net'&&u.pathname==='/en_US/fbevents.js')return route.fulfill({status:200,contentType:'application/javascript',body:SDK});
   if(u.hostname==='www.facebook.com')return route.fulfill({status:200,contentType:'image/gif',body:Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7','base64')});
   return route.abort('blockedbyclient');
  });
  return {context,page:await context.newPage(),seen,meta:()=>seen.filter(x=>/facebook/.test(x.host))};
 }
 async function test(name,run){console.log('BEGIN',name);const s=await session(true,name.includes('service worker cache')?'allow':'block');try{await run(s);results.push({name,status:'PASS',meta_requests:s.meta().length});}catch(e){results.push({name,status:'FAIL',error:String(e)});throw e;}finally{await s.context.close();}}
 async function accept(page){await page.getByLabel('Ho almeno 18 anni',{exact:false}).check();await page.getByRole('button',{name:'Accetta tutti',exact:true}).click();await page.waitForLoadState('load');await page.waitForTimeout(500);await page.waitForFunction(()=>window.__metaCalls?.some(a=>a[0]==='track'&&a[1]==='PageView'));}
 await test('No choice: no script, beacon or advertising cookie; CSP blocks Meta',async({page,meta,context})=>{
  const response=await page.goto(BASE+'/menu');await page.getByRole('dialog').waitFor();await page.waitForTimeout(200);
  assert.equal(meta().length,0);assert.equal(await page.locator('#lt-meta-pixel').count(),0);assert(!response.headers()['content-security-policy'].includes('facebook'));
  assert(!(await context.cookies()).some(c=>['_fbp','_fbc'].includes(c.name)));
  await page.screenshot({path:path.join(OUT,'banner-desktop.png'),fullPage:false}).catch(e=>console.warn('OPTIONAL_SCREENSHOT_UNAVAILABLE',String(e)));
 });
 await test('Adult declaration missing: accept does not activate tracking',async({page,meta})=>{
  await page.goto(BASE+'/menu');await page.getByRole('button',{name:'Accetta tutti',exact:true}).click();await page.getByRole('dialog').getByRole('alert').waitFor();assert.equal(meta().length,0);
 });
 await test('Refusal persists on reload, menu and order page; cart still works',async({page,meta,context})=>{
  await page.goto(BASE+'/menu');await page.getByRole('button',{name:'Accetta solo essenziali',exact:true}).click();await page.waitForLoadState('load');await page.waitForTimeout(500);
  assert.equal(await page.getByRole('dialog').count(),0);await page.reload();await page.waitForLoadState('load');await page.waitForTimeout(500);assert.equal(await page.getByRole('dialog').count(),0);
  await page.getByRole('button',{name:'Apri La Regina',exact:true}).click();
  const add=page.getByRole('button',{name:/aggiungi/i});await add.first().click();await page.waitForTimeout(150);
  await page.goto(BASE+'/ordine');await page.waitForLoadState('load');await page.waitForTimeout(500);assert.equal(await page.getByRole('dialog').count(),0);assert.equal(meta().length,0);
  assert((await context.cookies()).some(c=>c.name==='lt_cookie_preferences'));
  assert(await page.getByText('La Regina',{exact:false}).count()>0);
 });
 await test('Accept: correct ID, auto collection disabled, single PageView and persistence',async({page,meta,context})=>{
  await page.goto(BASE+'/menu');await accept(page);await page.waitForTimeout(150);
  const calls=await page.evaluate(()=>window.__metaCalls);assert(calls.some(a=>a[0]==='init'&&a[1]==='955909697258843'));assert(calls.some(a=>a[0]==='set'&&a[1]==='autoConfig'&&a[2]===false));assert.equal(calls.filter(a=>a[0]==='track'&&a[1]==='PageView').length,1);
  assert(meta().some(x=>x.host==='connect.facebook.net'));if(!meta().some(x=>x.host==='www.facebook.com')) { const rr=await context.request.get(BASE+'/menu',{headers:{referer:BASE+'/menu'}});console.error('DIAGNOSTIC',JSON.stringify({calls,seen:meta(),csp:rr.headers()['content-security-policy'],location:await page.evaluate(()=>({href:location.href,ref:document.referrer,cookies:document.cookie}))})); } assert(meta().some(x=>x.host==='www.facebook.com'));
  assert.equal(await page.getByRole('dialog').count(),0);await page.reload();await page.waitForLoadState('load');await page.waitForTimeout(500);assert.equal(await page.getByRole('dialog').count(),0);
  await context.storageState({path:path.join(OUT,'synthetic-consented-storage.json')});
 });
 await test('Personalize without marketing remembers refusal',async({page,meta})=>{
  await page.goto(BASE+'/menu');await page.getByRole('button',{name:'Personalizza',exact:true}).click();await page.getByRole('button',{name:'Salva preferenze',exact:true}).click();await page.waitForLoadState('load');await page.waitForTimeout(500);assert.equal(meta().length,0);assert.equal(await page.getByRole('dialog').count(),0);
 });
 await test('Revocation reloads with restrictive CSP and removes accessible Meta cookies',async({page,context,meta})=>{
  await page.goto(BASE+'/menu');await accept(page);await page.getByRole('button',{name:'Preferenze cookie',exact:true}).click();
  await page.getByRole('button',{name:'Accetta solo essenziali',exact:true}).click();await page.waitForLoadState('load');await page.waitForTimeout(500);const n=meta().length;
  const r=await page.reload();await page.waitForLoadState('load');await page.waitForTimeout(500);assert.equal(meta().length,n);assert(!r.headers()['content-security-policy'].includes('facebook'));assert.equal(await page.locator('#lt-meta-pixel').count(),0);assert(!(await context.cookies()).some(c=>['_fbp','_fbc'].includes(c.name)));
 });
 await test('Revocation updates another already open tab',async({context,page,meta})=>{
  await page.goto(BASE+'/menu');await accept(page);const second=await context.newPage();await second.goto(BASE+'/menu');await second.waitForFunction(()=>window.__metaCalls?.length>0);
  await page.getByRole('button',{name:'Preferenze cookie',exact:true}).click();await page.getByRole('button',{name:'Accetta solo essenziali',exact:true}).click();await page.waitForLoadState('load');await page.waitForTimeout(500);
  await second.waitForFunction(()=>!document.getElementById('lt-meta-pixel'));await second.waitForLoadState('load');await second.waitForTimeout(500);const n=meta().length;await second.reload();await second.waitForLoadState('load');await second.waitForTimeout(500);assert.equal(meta().length,n);
 });
 await test('Consented sensitive URLs, query strings and fragments remain excluded',async({page,meta})=>{
  await page.goto(BASE+'/menu');await accept(page);
  for(const route of ['/accedi','/registrati','/ordine','/stato-ordine/00000000-0000-4000-8000-000000000001','/menu?email=PRIVATE_CANARY','/menu#token=PRIVATE_CANARY']){
   const n=meta().length;await page.goto(BASE+route);await page.waitForLoadState('load');await page.waitForTimeout(500);assert.equal(await page.locator('#lt-meta-pixel').count(),0);assert.equal(meta().length,n);
  }
  assert(!meta().some(x=>x.url.includes('PRIVATE_CANARY')||x.url.includes('stato-ordine')));
 });
 await test('Client navigation to account crosses full document boundary',async({page,meta})=>{
  await page.goto(BASE+'/menu');await accept(page);const n=meta().length;await page.getByRole('link',{name:'Account e i miei ordini',exact:true}).click();await page.waitForLoadState('load');await page.waitForTimeout(500);assert.equal(await page.locator('#lt-meta-pixel').count(),0);assert.equal(meta().length,n);
 });
 await test('Sensitive referrer is not sent to Meta on public page',async({page,meta})=>{
  await page.goto(BASE+'/menu');await accept(page);const n=meta().length;await page.goto(BASE+'/menu',{referer:BASE+'/stato-ordine/PRIVATE_CANARY'});await page.waitForLoadState('load');await page.waitForTimeout(500);assert.equal(meta().length,n);assert.equal(await page.locator('#lt-meta-pixel').count(),0);
 });
 await test('Closing initial banner means refusal, not acceptance',async({page,meta})=>{
  await page.goto(BASE+'/menu');await page.getByRole('button',{name:'Chiudi senza accettare',exact:true}).click();await page.waitForLoadState('load');await page.waitForTimeout(500);assert.equal(meta().length,0);assert.equal(await page.getByRole('dialog').count(),0);
 });
 await test('Consent-dependent HTML is not persisted in service worker cache',async({page})=>{
  await page.goto(BASE+'/menu');await page.getByRole('button',{name:'Accetta solo essenziali',exact:true}).click();await page.waitForLoadState('load');await page.waitForTimeout(500);
  await page.evaluate(async()=>{await Promise.race([navigator.serviceWorker.ready,new Promise((_,reject)=>setTimeout(()=>reject(new Error("Service worker readiness timeout")),8000))])});await page.reload();await page.waitForLoadState('load');await page.waitForTimeout(500);
  const cached=await page.evaluate(async()=>{const out=[];for(const name of await caches.keys()){if(!name.startsWith('teglieria-pwa-'))continue;const cache=await caches.open(name);for(const request of await cache.keys())out.push(new URL(request.url).pathname)}return out});
  for(const value of ['/','/menu','/servizi','/privacy','/cookie-policy'])assert(!cached.includes(value));
 });
 await test('Programmatic private navigation revokes SDK before changing URL',async({page,meta})=>{
  await page.goto(BASE+'/menu');await accept(page);const n=meta().length;await page.evaluate(()=>history.pushState({},'', '/accedi?next=/account/orders'));await page.waitForLoadState('load');await page.waitForTimeout(500);assert.equal(await page.locator('#lt-meta-pixel').count(),0);assert.equal(meta().length,n);
 });
 await test('Public SPA navigation records exactly one additional PageView',async({page})=>{
  await page.goto(BASE+'/menu');await accept(page);await page.evaluate(()=>history.pushState({},'', '/servizi'));await page.waitForFunction(()=>window.__metaCalls.filter(a=>a[0]==='track'&&a[1]==='PageView').length===2);
 });
 await test('Preference editor discards unsaved changes',async({page})=>{
  await page.goto(BASE+'/menu');await accept(page);await page.getByRole('button',{name:'Preferenze cookie',exact:true}).click();await page.getByLabel('Pubblicità — Pixel Meta',{exact:false}).uncheck();await page.getByRole('button',{name:'Chiudi senza modificare',exact:true}).click();await page.getByRole('button',{name:'Preferenze cookie',exact:true}).click();assert(await page.getByLabel('Pubblicità — Pixel Meta',{exact:false}).isChecked());
 });
 await test('Mobile banner exposes all choices without horizontal overflow',async({page,meta})=>{
  await page.setViewportSize({width:390,height:844});await page.goto(BASE+'/menu');await page.getByRole('dialog').waitFor();
  assert(await page.getByRole('button',{name:'Accetta tutti',exact:true}).isVisible());assert(await page.getByRole('button',{name:'Accetta solo essenziali',exact:true}).isVisible());assert(await page.getByRole('button',{name:'Personalizza',exact:true}).isVisible());assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.equal(meta().length,0);await page.screenshot({path:path.join(OUT,'banner-mobile.png'),fullPage:false}).catch(e=>console.warn('OPTIONAL_SCREENSHOT_UNAVAILABLE',String(e)));
 });
 const nojs=await session(false);try{const r=await nojs.page.goto(BASE+'/menu');assert(!r.headers()['content-security-policy'].includes('facebook'));assert.equal(nojs.meta().length,0);assert.equal(await nojs.page.locator('noscript img[src*="facebook"]').count(),0);results.push({name:'JavaScript disabled: no noscript tracking',status:'PASS'});}finally{await nojs.context.close();}
 await browser.close();fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
})().catch(e=>{fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify(results,null,2));console.error(e);process.exit(1)});

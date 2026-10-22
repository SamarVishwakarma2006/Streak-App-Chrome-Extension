import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
await mkdir('test-results',{recursive:true});
const root=await mkdtemp(path.resolve('test-results/reading-'));
const extension=path.join(root,'extension');
await cp('.output/chrome-mv3',extension,{recursive:true});
// Pregrant ONLY the declared optional origin in this isolated test package.
// No thresholds, code paths, or production artifacts are changed.
const manifest=JSON.parse(await readFile(path.join(extension,'manifest.json'),'utf8'));
assert.deepEqual(manifest.optional_host_permissions,['https://www.geeksforgeeks.org/*']);
manifest.host_permissions=['https://www.geeksforgeeks.org/*'];
await writeFile(path.join(extension,'manifest.json'),JSON.stringify(manifest));
const context=await chromium.launchPersistentContext(path.join(root,'profile'),{channel:'chromium',headless:true,args:[`--disable-extensions-except=${extension}`,`--load-extension=${extension}`]});
const errors=[];context.on('page',page=>page.on('pageerror',e=>errors.push(e.message)));
const live = process.argv.includes('--live');
const url=live ? 'https://www.geeksforgeeks.org/python/python-variables/' : 'https://www.geeksforgeeks.org/python/fixture-reading/';
const words=Array.from({length:100},(_,i)=>`word${i}`).join(' ');
const fixture=`<!DOCTYPE html><html><head><link rel="canonical" href="${url}"><title>Reading fixture</title></head><body style="font:18px/1.7 system-ui;margin:40px;max-width:650px"><h1>Reading fixture</h1><div class="article--viewer_content"><div class="text"><p>${words}</p></div></div></body></html>`;
if (!live) await context.route('https://www.geeksforgeeks.org/**',route=>route.fulfill({status:200,contentType:'text/html',body:route.request().url().includes('fixture-skip') ? fixture.replace(url,route.request().url()).replace(words,Array.from({length:1000},(_,i)=>'section'+i).join(' ')) : fixture}));
try {
 const worker=context.serviceWorkers()[0]??await context.waitForEvent('serviceworker');
 const base=`chrome-extension://${new URL(worker.url()).hostname}`;
 const dashboard=await context.newPage();await dashboard.goto(`${base}/dashboard.html`);
 await dashboard.getByRole('button',{name:'New goal',exact:true}).click();
 await dashboard.getByLabel('Goal name').fill('Read articles');await dashboard.getByLabel('Daily target').fill('1');await dashboard.getByRole('combobox',{name:/^Unit/}).selectOption('lessons');
 await dashboard.getByRole('button',{name:'Save goal',exact:true}).click();await dashboard.getByRole('dialog').waitFor({state:'hidden'});
 await dashboard.getByRole('navigation').getByRole('link',{name:'Connections',exact:true}).click();
 await dashboard.getByLabel('Goal for new articles').selectOption({label:'Read articles'});
 await dashboard.getByRole('button',{name:'Connect GeeksforGeeks',exact:true}).click();
 await dashboard.getByRole('status').getByText('Connected. Open a supported article',{exact:false}).waitFor();
 await dashboard.screenshot({path:'test-results/connection.png',fullPage:true});
 const page=await context.newPage();await page.goto(url);await page.bringToFront();
 await page.locator('#streak-reading-panel').getByRole('status').waitFor();
 await page.locator('.text').click();
 if (live) {
   let evidence=[];
   for(let attempt=0;attempt<40;attempt++) {
     evidence=await dashboard.evaluate(async()=>Object.values((await chrome.storage.local.get('gfgReading')).gfgReading?.articles??{}).map(a=>({url:a.url,title:a.title,words:a.weights.reduce((x,y)=>x+y,0),chunks:a.weights.length,seconds:a.seconds,completed:a.completed})));
     if(evidence.some(a=>a.seconds>=3)) break;
     await page.waitForTimeout(750);
   }
   console.log(JSON.stringify({live:evidence,panel:await page.locator('#streak-reading-panel').getByRole('status').textContent()}));
   assert.ok(evidence.some(a=>a.seconds>=3),'Live article must accrue stable foreground time');
   await page.screenshot({path:'test-results/gfg-live.png',fullPage:false});
   await page.goto('https://www.geeksforgeeks.org/python/python-programming-language-tutorial/');
   await page.locator('#streak-reading-panel').getByRole('status').filter({hasText:'Unsupported'}).waitFor();
   console.log('PASS: real Python Variables page identifies article content and accrues foreground time; tutorial hub is rejected. No live completion claimed.');
   await context.close(); process.exit(0);
 }
 await page.waitForTimeout(3000);
 await dashboard.bringToFront();
 await dashboard.waitForTimeout(1800); // Flush the last in-flight foreground sample.
 const paused = await dashboard.evaluate(async()=>Object.values((await chrome.storage.local.get('gfgReading')).gfgReading.articles)[0].seconds);
 await dashboard.waitForTimeout(2500);
 const stillPaused = await dashboard.evaluate(async()=>Object.values((await chrome.storage.local.get('gfgReading')).gfgReading.articles)[0].seconds);
 assert.equal(stillPaused,paused,'Hidden tab must not gain time');
 await page.bringToFront();await page.locator('.text').click();
 // End-to-end completion uses the real 60-second rule, never accelerated thresholds.
 console.log('Reading fixture: waiting for genuine foreground dwell (about 65 seconds).');
 await page.locator('#streak-reading-panel').getByRole('status').filter({hasText:'Article qualified'}).waitFor({timeout:85000});
 const state=await dashboard.evaluate(async()=> (await chrome.storage.local.get('gfgReading')).gfgReading);
 assert.equal(state.ledger.lifetimeXP,25);assert.equal(Object.values(state.articles).filter(a=>a.completed).length,1);
 await page.screenshot({path:'test-results/reading.png',fullPage:true});
 await page.reload();await page.locator('#streak-reading-panel').getByRole('status').filter({hasText:'Article qualified'}).waitFor();
 assert.equal((await dashboard.evaluate(async()=> (await chrome.storage.local.get('gfgReading')).gfgReading)).ledger.lifetimeXP,25);
 await dashboard.bringToFront();await dashboard.getByRole('button',{name:'Disconnect',exact:true}).click();
 await dashboard.getByRole('status').getByText('Disconnected.',{exact:false}).waitFor();
 await page.locator('#streak-reading-panel').getByRole('status').filter({hasText:'Disconnected'}).waitFor();
 // The long fixture checks a fast jump without waiting through its 300-second requirement.
 await readingConnectAgain();
 const skipped=await context.newPage();
 await skipped.goto('https://www.geeksforgeeks.org/python/fixture-skip/');await skipped.bringToFront();
 await skipped.locator('#streak-reading-panel').getByRole('status').waitFor();
 await skipped.mouse.wheel(0,10000);await skipped.waitForTimeout(3500);
 const skippedArticle=await dashboard.evaluate(async()=>Object.values((await chrome.storage.local.get('gfgReading')).gfgReading.articles).find(a=>a.url.includes('fixture-skip')));
 assert.equal(skippedArticle.completed,false);assert.ok(skippedArticle.dwell.filter(n=>n>0).length<skippedArticle.weights.length*.8);
 await skipped.evaluate(()=>{const block=document.createElement('div');block.id='blocker';block.style.cssText='position:fixed;inset:0;background:white;z-index:2147483647';document.body.append(block);});
 await skipped.waitForTimeout(1800);
 const coveredSeconds=await dashboard.evaluate(async()=>Object.values((await chrome.storage.local.get('gfgReading')).gfgReading.articles).find(a=>a.url.includes('fixture-skip')).seconds);
 await skipped.waitForTimeout(2500);
 assert.equal(await dashboard.evaluate(async()=>Object.values((await chrome.storage.local.get('gfgReading')).gfgReading.articles).find(a=>a.url.includes('fixture-skip')).seconds),coveredSeconds);
 await skipped.evaluate(()=>{document.getElementById('blocker').remove();scrollTo(0,0);});
 await dashboard.bringToFront();
 await dashboard.getByRole('navigation').getByRole('link',{name:'Today',exact:true}).click();
 await dashboard.getByRole('button',{name:'Continue Read articles',exact:true}).click();
 await skipped.waitForFunction(()=>scrollY>0);
 assert.equal((await dashboard.evaluate(async()=> (await chrome.storage.local.get('gfgReading')).gfgReading)).ledger.lifetimeXP,25,'Restoring position must not award skipped coverage');
 async function readingConnectAgain() {
   await dashboard.bringToFront();
   await dashboard.getByRole('button',{name:'Connect GeeksforGeeks',exact:true}).click();
   await dashboard.getByRole('status').getByText('Connected. Open a supported article',{exact:false}).waitFor();
 }
 const forged=await dashboard.evaluate(()=>chrome.runtime.sendMessage({type:'gfg',action:'sample',payload:{}}));assert.equal(forged.ok,false);
 assert.deepEqual(errors,[]);
 console.log('PASS: connection UI, dynamic injection, real foreground reading qualification, local streak/25 XP, repeated article deduplication, hidden-tab pause, bottom-skip rejection, overlay pause, Continue restoration without credit, disconnect, and extension-page evidence rejection.');
}finally{await context.close();}

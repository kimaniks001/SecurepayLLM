import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';

const base='http://127.0.0.1:4173/#/preview/living-workspace/work';
const out='artifacts/phase1';
mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true});
try{
 for(const [name,width,height] of [['desktop',1440,900],['mobile',390,844]]){
  const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
  const problems=[];
  page.on('pageerror',err=>problems.push(err.message));
  await page.goto(base,{waitUntil:'domcontentloaded',timeout:30_000});
  await page.getByRole('navigation',{name:'Workspace experience'}).getByRole('button',{name:'My Work'}).waitFor();
  await page.getByRole('region',{name:'KS001 conversation'}).waitFor();
  await page.screenshot({path:`${out}/${name}-work.png`,fullPage:true});
  await page.getByRole('button',{name:'Add or use a tool'}).click();
  const picker=page.getByRole('dialog',{name:'Choose a tool'});
  await picker.waitFor();
  for(const label of ['Photos','Documents','Places','Quick Assist','Stores','People & Invitations','Money'])
   assert.ok(await picker.getByRole('button',{name:new RegExp(label)}).count(),`Missing launch tool: ${label}`);
  for(const label of ['More tools','Vision tools','Milestones'])
   assert.equal(await picker.getByRole('button',{name:label,exact:true}).count(),0,`Dead entry visible: ${label}`);
  await page.screenshot({path:`${out}/${name}-add.png`,fullPage:true});
  await picker.getByRole('button',{name:/Quick Assist/}).click();
  await page.getByRole('region',{name:'Quick Assist'}).waitFor();
  await page.screenshot({path:`${out}/${name}-quick-assist.png`,fullPage:true});
  await page.getByRole('button',{name:'Close tools',exact:true}).click();
  await page.getByRole('navigation',{name:'Workspace experience'}).getByRole('button',{name:'Vision'}).click();
  await page.getByRole('navigation',{name:'Workspace experience'}).getByRole('button',{name:'Vision'}).waitFor();
  await page.screenshot({path:`${out}/${name}-vision.png`,fullPage:true});
  assert.equal(problems.length,0,`Browser exceptions: ${problems.join('; ')}`);
  await page.close();
 }
 console.log('Phase 1 public preview browser smoke PASS (navigation, tools, demo separation; not live transaction E2E)');
}finally{
 await browser.close();
}

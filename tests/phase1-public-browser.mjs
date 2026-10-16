import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';

const base='http://127.0.0.1:4173/#/preview/living-workspace/work';
const out='artifacts/phase1';
mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true});
try{
 for(const [name,width,height] of [['desktop',1440,900],['mobile',390,844],['small-mobile',320,700]]){
  const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
  const problems=[];
  page.on('pageerror',err=>problems.push(err.message));
  await page.goto(base,{waitUntil:'domcontentloaded',timeout:30_000});
  await page.getByRole('navigation',{name:'Workspace experience'}).getByRole('button',{name:'My Work'}).waitFor();
  await page.getByRole('region',{name:'KS001 conversation'}).waitFor();
  await page.getByRole('heading',{name:'What would you like to get done?'}).waitFor();
  assert.equal(await page.getByRole('heading',{name:'What would you love to create?'}).count(),0);
  // Local static previews deliberately have no production API relay. Live typing can
  // only be certified on the Vercel host against an approved gateway.
  if(await page.locator('#live-work-ks001-input').count()){
    await page.locator('#live-work-ks001-input').fill('I need a delivery Agreement');
    assert.equal(await page.getByRole('heading',{name:'What would you like to get done?'}).count(),0,
      'Welcome must yield when typing starts');
    assert.equal(await page.locator('#live-work-ks001-input').inputValue(),'I need a delivery Agreement');
    await page.locator('#live-work-ks001-input').fill('');
  }else {
    console.log('Live KS001 typing is UNVERIFIED on this local static preview; no relay is configured.');
    assert.ok(await page.getByText('KS001 is temporarily unavailable.',{exact:false}).count());
  }
  await page.screenshot({path:`${out}/${name}-work.png`,fullPage:true});
  await page.getByRole('button',{name:'Expand tool shelf'}).click();
  assert.ok(await page.locator('[data-tool-shelf]').count());
  if(width>=1280){
    const chat=await page.getByRole('region',{name:'KS001 conversation'}).boundingBox();
    const shelf=await page.locator('[data-tool-shelf]').boundingBox();
    assert.ok(chat && shelf && shelf.x+shelf.width <= chat.x+1,'Expanded shelf must not overlay KS001');
  }
  const picker=page.getByRole('dialog',{name:'Choose a tool'});
  await picker.waitFor();
  for(const label of ['Photos','Documents','Places','Quick Assist','Stores','People & Invitations','Money'])
   assert.ok(await picker.getByRole('button',{name:new RegExp(label)}).count(),`Missing launch tool: ${label}`);
  for(const label of ['More tools','Vision tools','Milestones'])
   assert.equal(await picker.getByRole('button',{name:label,exact:true}).count(),0,`Dead entry visible: ${label}`);
  await page.screenshot({path:`${out}/${name}-add.png`,fullPage:true});
  if(width>=1280){
    await page.getByRole('button',{name:'Pin tool shelf'}).click();
    await page.getByRole('button',{name:'Unpin tool shelf'}).waitFor();
    await page.screenshot({path:`${out}/${name}-pinned-shelf.png`,fullPage:true});
  }
  await picker.getByRole('button',{name:/Quick Assist/}).click();
  await page.getByRole('region',{name:'Quick Assist'}).waitFor();
  await page.screenshot({path:`${out}/${name}-quick-assist.png`,fullPage:true});
  await page.getByRole('button',{name:'Close tools',exact:true}).click();
  if(width>=1280){
    await picker.waitFor();
    await page.getByRole('button',{name:'Collapse tool shelf'}).click();
    await page.locator('[data-tool-shelf]').waitFor({state:'detached'});
    await page.screenshot({path:`${out}/${name}-collapsed-rail.png`,fullPage:true});
  }
  await page.getByRole('navigation',{name:'Workspace experience'}).getByRole('button',{name:'Vision'}).click();
  await page.getByRole('navigation',{name:'Workspace experience'}).getByRole('button',{name:'Vision'}).waitFor();
  await page.getByRole('heading',{name:'What would you love to create?'}).waitFor();
  assert.equal(await page.getByRole('heading',{name:'What would you like to get done?'}).count(),0);
  await page.screenshot({path:`${out}/${name}-vision.png`,fullPage:true});
  const dims=await page.evaluate(()=>({width:document.documentElement.scrollWidth,viewport:document.documentElement.clientWidth}));
  assert.ok(dims.width<=dims.viewport+1,'No horizontal overflow');
  assert.equal(problems.length,0,`Browser exceptions: ${problems.join('; ')}`);
  await page.close();
 }
 console.log('Phase 1 public preview browser smoke PASS (navigation, real shelf and contexts; not live transaction E2E)');
}finally{
 await browser.close();
}

import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
mkdirSync('artifacts/phase6-master',{recursive:true});
const browser=await chromium.launch({headless:true});
try {
  for(const [label,width,height] of [
    ['desktop',1440,900],['mobile',390,844],['small-mobile',320,700],
  ]){
    const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
    const errors=[];
    const writes=[];
    page.on('pageerror',error=>errors.push(error.message));
    page.on('request',request=>{
      if(request.url().includes('/api/')&&request.method()!=='GET')
        writes.push(request.url());
    });
    await page.goto('http://127.0.0.1:4173/#/preview/living-workspace/community',
      {waitUntil:'domcontentloaded'});
    await page.locator('[data-workspace-frozen-layout]').waitFor();
    await page.locator('[data-sp-area="community"]').waitFor();
    await page.screenshot({path:'artifacts/phase6-master/'+label+'-community.png',fullPage:true});
    const size=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,
      viewport:document.documentElement.clientWidth}));
    assert.ok(size.scroll<=size.viewport+1,label+' Community horizontal overflow');
    const nav=page.getByRole('navigation',{name:'Workspace experience'});
    for(const [route,name] of [['work','My Work'],['vision','Vision'],['circle','Circle'],['community','Community']]){
      await nav.getByRole('button',{name,exact:true}).click();
      await page.locator('[data-sp-area="'+route+'"]').waitFor();
      assert.equal(await page.locator('[data-workspace-frozen-layout]').count(),1);
    }
    assert.deepEqual(errors,[],label+' page errors');
    assert.deepEqual(writes,[],label+' preview wrote to API');
    console.log('Phase6 navigational and layout smoke PASS '+label);
    await page.close();
  }
}finally{await browser.close();}

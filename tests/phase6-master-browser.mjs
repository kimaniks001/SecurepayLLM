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
    await page.locator('[data-phase6-guest-review]').waitFor();
    assert.match(await page.locator('[data-phase6-guest-review]').innerText(),/no sign-in needed/);
    const tabs=page.getByRole('tablist',{name:'Community sections'});
    await tabs.getByRole('tab',{name:'LIVE'}).click();
    await page.getByText('A workshop sharing practical skills').waitFor();
    await page.getByRole('button',{name:'Read & respond'}).first().click();
    await page.getByRole('dialog',{name:'Sample Community detail'}).waitFor();
    await page.getByRole('button',{name:'Close',exact:true}).click();
    await tabs.getByRole('tab',{name:'Circles'}).click();
    await page.getByText('Neighbourhood Garden Circle').waitFor();
    await tabs.getByRole('tab',{name:'Opportunities'}).click();
    await page.getByText('Help plan a school furniture repair').waitFor();
    await tabs.getByRole('tab',{name:'Projects'}).click();
    await page.getByText('Community rainwater storage idea').waitFor();
    await tabs.getByRole('tab',{name:'Events'}).click();
    await page.getByText('How to document work fairly').waitFor();
    await tabs.getByRole('tab',{name:'Learning'}).click();
    await page.getByText('Apprenticeship in workshop skills').waitFor();
    await tabs.getByRole('tab',{name:'Discover'}).click();
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

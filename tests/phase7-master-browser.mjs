import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
mkdirSync('artifacts/phase7-master',{recursive:true});
const browser=await chromium.launch({headless:true});
try {
  for(const [label,width,height] of [['desktop',1440,900],['mobile',390,844],['small-mobile',320,700]]){
    const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
    const errors=[],writes=[];
    page.on('pageerror',error=>errors.push(error.message));
    page.on('request',r=>{if(r.url().includes('/api/')&&r.method()!=='GET')writes.push(r.url());});
    await page.goto('http://127.0.0.1:4173/#/preview/living-workspace/work',{waitUntil:'domcontentloaded'});
    await page.locator('[data-workspace-frozen-layout]').waitFor();
    await page.locator('[data-preview-truth]').waitFor();
    if(width>=1280) {
      await page.getByRole('navigation',{name:'Workspace tool rail'}).getByRole('button',{name:'Money',exact:true}).click();
    } else {
      await page.getByRole('navigation',{name:'Mobile workspace panels'}).getByRole('button',{name:'Tools'}).click();
      await page.getByRole('navigation',{name:'Choose a tool'}).getByRole('button',{name:'Money',exact:true}).click();
    }
    const shelf=page.locator('[data-tool-shelf]');
    await shelf.waitFor();
    await page.locator('[data-testid="compact-money-tool"]').waitFor();
    await page.locator('[data-phase7-demo-details]').evaluate(node=>{node.open=true;});
    const demonstration=page.locator('[data-phase7-money-preview]');
    await demonstration.waitFor();
    const selector=demonstration.locator('[data-phase7-scenario]');
    for(const scenario of ['Purchase','Delivery','Milestones','Chama','Community Saver','Dispute','Uncertain payment']){
      await selector.selectOption({label:scenario});
      assert.match(await demonstration.innerText(),/Interactive sample only/);
      for(let i=0;i<4;i++) {
        const button=demonstration.getByRole('button',{name:'Next consideration'});
        if(await button.isEnabled()) await button.click();
      }
    }
    await selector.selectOption({label:'Delivery'});
    await demonstration.getByText('A photo, GPS tag or uploaded note cannot independently release funds.').waitFor();
    await page.screenshot({path:'artifacts/phase7-master/'+label+'-money.png',fullPage:true});
    const size=await page.evaluate(()=>({actual:document.documentElement.scrollWidth,
      viewport:document.documentElement.clientWidth}));
    assert.ok(size.actual<=size.viewport+1,label+' horizontal overflow');
    assert.deepEqual(errors,[],label+' browser errors');
    assert.deepEqual(writes,[],label+' unexpected API writes');
    console.log('Phase 7 seven no-payment Money journeys PASS '+label+' '+width+'px');
    await page.close();
  }
} finally { await browser.close(); }

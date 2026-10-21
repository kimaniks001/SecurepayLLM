import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';

const url='http://127.0.0.1:4173/#/preview/living-workspace/gate5b/vision';
mkdirSync('artifacts/gate5b',{recursive:true});
const browser=await chromium.launch({headless:true});
try {
  for(const [label,width,height] of [['desktop',1440,900],['mobile',390,844],['small-mobile',320,700]]) {
    const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
    const errors=[],outside=[],writes=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.route('**/*',async route=>{
      const request=route.request();
      const parsed=new URL(request.url());
      if(parsed.origin!=='http://127.0.0.1:4173'){
        outside.push(parsed.origin);
        await route.abort();
        return;
      }
      if(request.method()!=='GET'&&request.method()!=='HEAD'){
        writes.push(parsed.pathname);
        await route.abort();
        return;
      }
      await route.continue();
    });
    try {
      await page.goto(url,{waitUntil:'domcontentloaded',timeout:45000});
      await page.locator('[data-workspace-frozen-layout]').waitFor();
      await page.locator('[data-workspace-shell]').waitFor();
      await page.locator('[data-gate5b-concept]').waitFor();
      assert.equal(await page.locator('[data-gate5b-concept]').getAttribute('data-prototype-scope'),'LOCAL_CONCEPT_ONLY');
      const nav=page.getByRole('navigation',{name:'Gate 5B explore areas'});
      assert.equal(await nav.getByRole('button').count(),5);
      assert.equal(await page.getByRole('navigation',{name:'Workspace tool rail'}).count(),1);
      assert.equal(await page.locator('[data-tool-shelf]').count(),0);
      assert.equal(await page.locator('[data-testid="compact-money-tool"]').count(),0);

      // Every route uses the same shell. The right result stays a truthful local summary.
      for(const area of ['Circle','Community','My Work','Money','Vision']){
        await nav.getByRole('button',{name:area,exact:true}).click();
        assert.ok(page.url().includes('/gate5b/'));
        await page.locator('[data-gate5b-concept]').waitFor();
        if(width>=768){
          assert.match(await page.locator('[data-gate5b-result]').innerText(),/Money connected or moved[\s\S]*Not done/);
          assert.match(await page.locator('[data-gate5b-result]').innerText(),/Parties accepted[\s\S]*Not done/);
        }else{
          await page.getByRole('navigation',{name:'Mobile workspace panels'})
            .getByRole('button',{name:'At a glance'}).click();
          assert.match(await page.locator('[data-gate5b-result]').innerText(),/Money connected or moved[\s\S]*Not done/);
          await page.getByRole('navigation',{name:'Mobile workspace panels'})
            .getByRole('button',{name:'Explore'}).click();
        }
      }

      const concept=page.locator('[data-gate5b-concept]');
      await concept.getByRole('button',{name:/Office chair/}).click();
      assert.match(await concept.innerText(),/KES 400/);
      await concept.getByRole('button',{name:'Preview a possible next step'}).click();
      if(width<768)await page.getByRole('navigation',{name:'Mobile workspace panels'}).getByRole('button',{name:'At a glance'}).click();
      assert.match(await page.locator('[data-gate5b-result]').innerText(),/Possible handoff from Vision/);
      assert.match(await page.locator('[data-gate5b-result]').innerText(),/It would remain a proposal/);
      if(width<768)await page.getByRole('navigation',{name:'Mobile workspace panels'}).getByRole('button',{name:'Explore'}).click();

      await nav.getByRole('button',{name:'Money'}).click();
      await concept.getByRole('group',{name:'Money choices'}).getByRole('button',{name:'Borrow'}).click();
      assert.match(await concept.innerText(),/No institution has offered or approved a loan/);
      await concept.getByRole('group',{name:'Money choices'}).getByRole('button',{name:'Protect'}).click();
      assert.match(await concept.innerText(),/Cover is not active without an insurer confirmation/);

      await concept.getByRole('button',{name:/Neighbourhood/}).click();
      await nav.getByRole('button',{name:'Community'}).click();
      assert.match(await concept.innerText(),/without publishing private Circle work/);

      // Prototype is local even after multiple selections and simulated handoffs.
      const size=await page.evaluate(()=>({
        actual:document.documentElement.scrollWidth,
        viewport:document.documentElement.clientWidth
      }));
      assert.ok(size.actual<=size.viewport+2,label+' horizontal overflow '+JSON.stringify(size));
      assert.deepEqual(errors,[],label+' browser exceptions');
      // The unchanged global stylesheet requests Google Fonts, which this
      // isolated browser interception blocks. No external request is allowed
      // to proceed, and no other network origin is expected from the concept.
      assert.ok(outside.every(origin=>origin==='https://fonts.googleapis.com'),
        label+' unexpected outside resource origin: '+JSON.stringify(outside));
      assert.deepEqual(writes,[],label+' must not write to API');
      await page.screenshot({path:'artifacts/gate5b/'+label+'-concept.png',fullPage:true});
      console.log('Gate 5B LOCAL FIVE-AREA DESIGN REVIEW PASS '+label+' '+width+'px — no backend and no writes');
    }finally { await page.close(); }
  }
}finally {await browser.close();}

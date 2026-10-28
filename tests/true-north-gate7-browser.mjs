/**
 * Gate 7 — read-only, signed-out, three-viewport smoke.
 * Uses the existing interactive preview, not live membership or private Money.
 * Run against `npx vite preview --host 127.0.0.1 --port 4173` with
 * `node tests/true-north-gate7-browser.mjs` (requires isolated Playwright).
 */
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const base='http://127.0.0.1:4173/#/preview/living-workspace/community';
const browser=await chromium.launch({headless:true});
try {
  for(const [label,width,height] of [['desktop',1440,900],['mobile',390,844],['small-phone',320,700]]){
    const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
    const writes=[],errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('request',request=>{
      const path=new URL(request.url()).pathname;
      if(path.startsWith('/api/')&&!['GET','HEAD','OPTIONS'].includes(request.method()))
        writes.push(request.method()+' '+path);
    });
    await page.goto(base,{waitUntil:'domcontentloaded',timeout:40000});
    await page.locator('[data-workspace-frozen-layout][data-sp-area="community"]').waitFor();
    await page.locator('[data-real-community-hub]').waitFor();
    await page.locator('[data-phase6-guest-review]').waitFor();
    await page.locator('[data-community-check]').waitFor({state:'attached'});
    const sample=await page.locator('[data-phase6-guest-review]').innerText();
    assert.match(sample,/illustrative,\s*not live SecurePay records/);
    assert.match(sample,/publishing and Money remain protected/);
    assert.equal(await page.locator('[data-gate6-project-outcome]').count(),0,
      'Unsigned visitors must not see the authorised Agreement outcome composer');
    assert.equal(await page.locator('[data-gate5-verified-media]').count(),0,
      'Unsigned visitors must not see private Agreement evidence tools');
    const tab=page.getByRole('tab',{name:'Projects',exact:true});
    await tab.click();
    await page.getByText('Community rainwater storage idea').waitFor();
    await page.getByRole('tab',{name:'All',exact:true}).click();
    await page.getByText('People make progress together').waitFor();
    assert.deepEqual(writes,[],'Sample experience must not execute API writes');
    assert.deepEqual(errors,[],'Browser page errors');
    console.log('Gate 7 read-only Community smoke PASS '+label+' '+width+'px');
    await page.close();
  }
} finally {await browser.close();}

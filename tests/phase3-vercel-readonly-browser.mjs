import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';

// Test the pinned READY Vercel deployment, not localhost or an alias that can change.
// Safety rule: no authenticated operations, no writes, no outbound API calls.
const expected = 'https://securepay-qxteh6kjv-james-8078.vercel.app';
const url = process.env.PHASE3_VERCEL_URL || expected;
const parsed = new URL(url);
assert.equal(parsed.origin, expected, 'Only the reviewed, immutable Phase 3 preview may be tested');
assert.equal(parsed.pathname, '/', 'No alternative route/origin may be supplied');
const out = 'artifacts/phase3-vercel';
mkdirSync(out, { recursive: true });
const failures = [];
const observations = [];
const browser = await chromium.launch({ headless: true });
try {
  for (const [device,width,height] of [['desktop',1440,900],['mobile',390,844],['small-mobile',320,700]]) {
    const page = await browser.newPage({
      viewport:{width,height},reducedMotion:'reduce',serviceWorkers:'block',
      javaScriptEnabled:true,
    });
    const pageErrors = [], blocked = [];
    page.on('pageerror', err => pageErrors.push(err.message));
    await page.route('**/*', async route => {
      const request = route.request();
      const target = new URL(request.url());
      const unsafe = !['GET','HEAD'].includes(request.method()) ||
        target.origin !== parsed.origin ||
        target.pathname.startsWith('/api/') || target.pathname === '/api' ||
        target.pathname.startsWith('/_vercel/') ||
        target.pathname.endsWith('.map');
      if (unsafe) {
        blocked.push(request.method()+' '+target.origin+target.pathname);
        await route.abort('blockedbyclient');
      } else {
        await route.continue();
      }
    });
    try {
      const response = await page.goto(url+'#/preview/living-workspace/work', { waitUntil:'domcontentloaded', timeout:60000 });
      assert.equal(response?.status(),200,'Vercel document HTTP status must be 200');
      const html = await page.locator('body').innerText();
      if (/Authentication Required|Vercel Authentication|Sign in to Vercel|Deployment Protection/i.test(html))
        throw new Error('VERCEL_PROTECTION_BLOCKED: Preview requires account protection; do not bypass by changing settings.');
      await page.getByRole('navigation', { name:'Workspace experience' }).waitFor({timeout:20000});
      await page.getByRole('region',{name:'KS001 conversation'}).waitFor({timeout:20000});
      await page.getByRole('button',{name:'Add or use a tool'}).click();
      const picker = page.getByRole('dialog',{name:'Choose a tool'});
      await picker.waitFor();
      for (const name of ['Photos','Documents','Places','Date & Time','Quick Assist','Stores','People & Invitations','Money']) {
        assert.ok(await picker.getByRole('button',{name:new RegExp(name === 'Date & Time'?'Date & Time':name)}).count(), 'Missing tool '+name);
      }
      await page.screenshot({path:out+'/'+device+'-eight-tools.png',fullPage:true});
      await picker.getByRole('button',{name:/Date & Time/}).click();
      const timing = page.locator('[data-phase3-date-time]');
      await timing.waitFor();
      assert.ok(await timing.getByText('This is a proposed date, not a booking', {exact:false}).count());
      const day = timing.getByRole('button',{name:'On this day'});
      assert.equal(await day.getAttribute('aria-pressed'),'true');
      await timing.getByRole('button',{name:'Between dates'}).click();
      assert.ok(await timing.getByLabel('Start date').count());
      await timing.getByRole('button',{name:'Repeat'}).click();
      await timing.getByLabel('Repeat').selectOption('month');
      assert.ok(await timing.getByText('Day of the month').count());
      await timing.getByRole('button',{name:'After an event'}).click();
      assert.ok(await timing.getByText('The date stays open until the event is confirmed.',{exact:false}).count());
      assert.equal(await timing.getByRole('button',{name:'Ask KS001 to review this date'}).isDisabled(),true,
        'Visitor preview must not transmit timing proposals');
      await page.screenshot({path:out+'/'+device+'-date-time.png',fullPage:true});
      await page.getByRole('button',{name:'Close tools',exact:true}).click();
      await page.getByRole('button',{name:'Add or use a tool'}).click();
      await page.getByRole('dialog',{name:'Choose a tool'}).getByRole('button',{name:/Money/}).click();
      assert.ok(await page.getByRole('region',{name:'Money tool'}).count());
      const money = await page.locator('[data-testid="compact-money-tool"]').innerText();
      assert.match(money,/My Money/);
      assert.match(money,/No actual Agreement or payment|Sign in to see your Agreements/);
      await page.screenshot({path:out+'/'+device+'-money-readonly.png',fullPage:true});
      await page.getByRole('button',{name:'Close tools',exact:true}).click();

      await page.goto(url+'#/',{waitUntil:'domcontentloaded',timeout:60000});
      const homeText = await page.locator('body').innerText();
      if (/Authentication Required|Vercel Authentication|Sign in to Vercel|Deployment Protection/i.test(homeText))
        throw new Error('VERCEL_PROTECTION_BLOCKED: Home requires Vercel authentication');
      await page.screenshot({path:out+'/'+device+'-home.png',fullPage:true});
      const overflow = await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
      observations.push({device,width,overflow,pageErrors,blocked:blocked.slice(0,30),
        homeUnavailable:/SecurePay is unavailable/i.test(homeText),
        homeStartsWith:homeText.slice(0,250)});
      assert.ok(overflow<=2,'Horizontal overflow on '+device+': '+overflow+'px');
      assert.deepEqual(pageErrors,[],'JavaScript exceptions on '+device);
    } catch (error) {
      failures.push({device,error:String(error),blocked:blocked.slice(0,20),pageErrors});
      await page.screenshot({path:out+'/'+device+'-failure.png',fullPage:true}).catch(()=>{});
    } finally {
      await page.close();
    }
  }
} finally {
  await browser.close();
}
writeFileSync(out+'/result.json',JSON.stringify({deployment:expected,commit:'ea20d359ef423effc55eff76d0079abcd1b82cb2',
  scope:'read-only public UI; API and writes blocked; no identities, Agreements, bookings, payments',
  observations,failures},null,2));
console.log(JSON.stringify({observations,failures},null,2));
assert.equal(failures.length,0,'Vercel Phase 3 public/browser test must pass without masking blockers');
console.log('VERCEL PHASE 3 READ-ONLY UI PASS — DOES NOT CERTIFY AUTHENTICATED AGREEMENTS OR MONEY');

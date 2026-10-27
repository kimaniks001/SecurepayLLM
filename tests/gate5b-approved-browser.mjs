import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';

const base='http://127.0.0.1:4173/#/preview/living-workspace/';
const output='artifacts/gate5b-approved';
mkdirSync(output,{recursive:true});
const browser=await chromium.launch({headless:true});

try {
  for (const [device,width,height] of [['desktop',1440,900],['mobile',390,844],['small-phone',320,700]]) {
    const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
    const errors=[],writes=[];
    page.on('pageerror',err=>errors.push(err.message));
    page.on('request',req=>{
      if(new URL(req.url()).pathname.startsWith('/api/') && !['GET','HEAD'].includes(req.method()))
        writes.push(req.method()+' '+new URL(req.url()).pathname);
    });
    try {
      await page.goto(base+'vision',{waitUntil:'domcontentloaded',timeout:40000});
      await page.locator('[data-workspace-frozen-layout]').waitFor();
      const nav=page.getByRole('navigation',{name:'Workspace experience'});
      const mobile=page.getByRole('navigation',{name:'Mobile workspace panels'});

      for(const [area,label,title] of [
        ['vision','Vision','What are you imagining?'],
        ['circle','Circle','Decide and work together'],
        ['community','Community',null]
      ]){
        if(area!=='vision')await nav.getByRole('button',{name:label,exact:true}).click();
        await page.locator('[data-workspace-frozen-layout][data-sp-area="'+area+'"]').waitFor();
        if(title)await page.getByRole('heading',{name:title}).waitFor({state:'attached'});
        const guide=area==='vision'?page.locator('[data-true-north-vision-summary]'):
          page.locator('[data-approved-gate5b-purpose="'+area+'"]');
        await guide.waitFor({state:'attached'});
        assert.equal(await guide.count(),1,'Only one living summary/purpose section per space');
        const copy=await guide.textContent();
        if(area==='vision') {
          assert.match(copy,/Your Vision/);
          assert.match(copy,/Scenarios worth keeping/);
          assert.match(copy,/No prices, returns, jobs, loans or local people are independently verified/);
          assert.equal(await page.locator('[data-approved-gate5b-purpose="vision"]').count(),0,
            'Old restrictive Vision purpose panel must not duplicate the new living summary');
        } else {
          assert.match(copy,/Where you are/);
          assert.match(copy,/Important boundary/);
          assert.match(copy,/One useful next step/);
          assert.match(copy,/Opening My Work does not transfer, publish, approve or pay/);
        }
        if(area==='circle')assert.match(copy,/formal vote|governance|member/i);
        if(area==='community')assert.match(copy,/Circle-only|Public Community/);
        assert.equal(await page.locator('[data-workspace-shell]').count(),1,'Original three-column shell must be intact');
        if(width<768) {
          await page.screenshot({path:output+'/'+device+'-'+area+'-chat.png',fullPage:true});
          await mobile.getByRole('button',{name:'About '+label}).click();
          await guide.waitFor({state:'visible'});
        } else await guide.waitFor({state:'visible'});
        await page.screenshot({path:output+'/'+device+'-'+area+'-summary.png',fullPage:true});
        if(width<768 && area!=='community') await mobile.getByRole('button',{name:'Chat'}).click();
      }
      // True North Vision uses an inline, assumption-only Scenario Calculator.
      // The original Money tool stays in My Work; no finance authority is opened here.
      await nav.getByRole('button',{name:'Vision',exact:true}).click();
      if(width<768)await mobile.getByRole('button',{name:'Chat'}).click();
      await page.getByRole('button',{name:'Explore a financial scenario'}).click();
      const calculator=page.locator('[data-vision-scenario-calculator]');
      await calculator.waitFor({state:'visible'});
      assert.match(await calculator.textContent(),/What could be possible/);
      assert.match(await calculator.textContent(),/Funding gap today/);
      await calculator.getByRole('button',{name:'Close'}).click();
      await nav.getByRole('button',{name:'Community',exact:true}).click();
      if(width<768)await mobile.getByRole('button',{name:'About Community'}).click();
      const action=page.locator('[data-approved-gate5b-purpose="community"]').getByRole('button',{name:'Open My Work'});
      await action.click();
      await page.locator('[data-workspace-frozen-layout][data-sp-area="work"]').waitFor();
      assert.equal(await page.locator('[data-approved-gate5b-purpose]').count(),0,
        'Purpose copy never becomes a fake Agreement record in My Work');
      if(width>=1280) {
        await page.getByRole('navigation',{name:'Workspace tool rail'}).getByRole('button',{name:'Money'}).click();
      } else {
        await mobile.getByRole('button',{name:'Tools'}).click();
        await page.getByRole('navigation',{name:'Choose a tool'}).getByRole('button',{name:'Money',exact:true}).click();
      }
      const money=page.locator('[data-approved-gate5b-money-purpose]');
      await money.waitFor({state:'visible'});
      assert.match(await money.textContent(),/Money should follow the agreement/);
      // The small My Money tab may exist; legacy Borrow/Invest/Protect
      // offerings must not appear as executable funding rails for an Agreement.
      const fundingChoices=page.getByRole('navigation',{name:'Money choices'});
      if(await fundingChoices.count()){
        assert.equal(await fundingChoices.getByRole('button',{name:'My Money'}).count(),1);
        for(const forbidden of ['Borrow','Invest','Protect'])
          assert.equal(await fundingChoices.getByRole('button',{name:forbidden,exact:true}).count(),0,
            forbidden+' must not appear as Agreement funding authority');
      }
      assert.match(await money.textContent(),/My Work.*Money settles and funds an Agreement/s);
      await page.screenshot({path:output+'/'+device+'-money-tool.png',fullPage:true});
      const dimensions=await page.evaluate(()=>({
        scroll:document.documentElement.scrollWidth,
        viewport:document.documentElement.clientWidth
      }));
      assert.ok(dimensions.scroll<=dimensions.viewport+1,
        'Horizontal overflow at '+device+': '+JSON.stringify(dimensions));
      assert.deepEqual(errors,[],'Browser exceptions');
      assert.deepEqual(writes,[],'Purpose navigation must never execute authenticated writes');
      await page.keyboard.press('Escape');
      await page.locator('[data-tool-shelf]').waitFor({state:'detached'});
      assert.equal(await page.locator('[data-tool-shelf]').count(),0,'Escape closes contextual tools');
      console.log('Gate 5B approved real workspace PASS '+device+' '+width+'px');
    } finally {await page.close();}
  }
} finally {await browser.close();}

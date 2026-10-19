import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';

const host='http://127.0.0.1:4173';
const out='artifacts/phase2-master';
mkdirSync(out,{recursive:true});
const cases=[
  {id:'delivery',title:'KES 400 delivery',question:'What exactly is being delivered?',note:'Goods: a chair'},
  {id:'chama',title:'Eight-person chama',question:'What is the main purpose of this chama?',note:'Purpose: save for school fees'},
  {id:'service',title:'Professional service',question:'What result do you need the professional to deliver?',note:'Deliverable: a survey report'},
  {id:'project',title:'Project milestones',question:'What should the first phase deliver?',note:'Milestone: site preparation'},
  {id:'store',title:'Store purchase',question:'Which goods are you considering?',note:'Goods: a dining table'},
];
const browser=await chromium.launch({headless:true});
try {
  for(const [device,width,height] of [['desktop',1440,900],['mobile',390,844],['small-mobile',320,700]]) {
    for(const scenario of cases) {
      const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
      const errors=[],mutatingRequests=[];
      page.on('pageerror',error=>errors.push(error.message));
      page.on('request',request=>{
        if(request.url().includes('/api/')&&request.method()!=='GET')
          mutatingRequests.push(request.method()+' '+request.url());
      });
      await page.goto(host+'/#/preview/living-workspace/work',{waitUntil:'domcontentloaded'});
      const nav=page.getByRole('navigation',{name:'Workspace experience'});
      await nav.getByRole('button',{name:'My Work'}).waitFor();
      const chat=page.getByRole('region',{name:'KS001 conversation'});
      const menu=page.locator('[data-phase2-scenarios]');
      const input=chat.getByRole('textbox',{name:'Preview a message to KS001'});
      const mobileNav=page.getByRole('navigation',{name:'Mobile workspace panels'});
      const board=page.locator('[data-phase2-check]');
      assert.equal(await page.locator('[data-preview-truth]').count(),1);
      await menu.locator('summary').click();
      await menu.getByRole('button',{name:scenario.title,exact:true}).click();
      assert.ok(await chat.locator('[data-phase2-example-conversation]').getByText(scenario.question).isVisible(),
        'Centre example question missing for '+scenario.id);
      assert.ok(await chat.locator('[data-phase2-example-guidance]').getByText('Example guidance · not a live KS001 reply').count());
      assert.ok(await input.count(),'Free typing is always available');
      if(scenario.id==='delivery') {
        assert.ok(await chat.getByRole('button',{name:'Describe the goods'}).count());
        assert.ok(await chat.getByRole('button',{name:'Add photo'}).count());
        assert.ok(await chat.getByRole('button',{name:'More details'}).count());
      }
      if(width<768)await mobileNav.getByRole('button',{name:'Your Work'}).click();
      assert.ok(await board.isVisible());
      assert.ok(await board.getByRole('heading',{name:'SecurePay Check'}).isVisible());
      assert.ok(await board.getByText(scenario.question).isVisible(),'Right-hand board question missing');
      assert.equal(await board.getByText('Check complete. You may proceed.').count(),0);
      if(scenario.id==='delivery') {
        assert.ok(await board.getByText('KES 400 · proposed').count());
        assert.ok(await board.getByText('Not yet specified').count());
      }
      await board.getByText('Fair Trade',{exact:false}).first().click();
      assert.ok(await board.getByText('No principle has been evaluated in this demonstration',{exact:false}).count());
      await board.getByText('What can happen next?').click();
      assert.ok(await board.getByText('Requires accepted terms and real authority.',{exact:false}).count());
      if(width>=1280) {
        const conversationBox=await chat.boundingBox(), boardBox=await board.boundingBox();
        assert.ok(conversationBox&&boardBox&&conversationBox.x+conversationBox.width<=boardBox.x+2,
          'Check must remain on the right of chat');
      }
      await page.screenshot({path:out+'/'+device+'-'+scenario.id+'.png',fullPage:true});
      await board.getByRole('button',{name:'Continue in conversation'}).click();
      if(width<768)assert.ok(await chat.isVisible(),'Next step should switch mobile back to Chat');
      await page.waitForFunction(()=>document.activeElement?.id==='phase1-local-note',{timeout:4000});
      await input.fill(scenario.note);
      await chat.getByRole('button',{name:'Add to preview'}).click();
      if(width<768)await mobileNav.getByRole('button',{name:'Your Work'}).click();
      assert.ok(await board.getByText(scenario.note.split(': ')[1]).count(),
        'Entered detail should appear as proposed information in Check');
      if(scenario.id==='delivery') {
        assert.equal(await board.getByText('Not yet specified').count(),0,
          'Entered structured goods must replace the missing-goods presentation');
        assert.ok(await board.getByText('The goods you entered remain a proposal',{exact:false}).count());
        await board.getByRole('button',{name:'Edit preview note 1'}).click();
        await board.getByRole('textbox',{name:'Edit local preview note'}).fill('Goods: an office chair');
        await board.getByRole('button',{name:'Save locally'}).click();
        assert.ok(await board.getByText('an office chair').count(),'Edit must update Check');
        await page.screenshot({path:out+'/'+device+'-edited.png',fullPage:true});
        if(width<768)await mobileNav.getByRole('button',{name:'Chat'}).click();
        await menu.locator('summary').click();
        await menu.getByRole('button',{name:'Eight-person chama'}).click();
        assert.ok(await chat.locator('[data-phase2-example-guidance]').getByText('What is the main purpose of this chama?').count());
        await menu.locator('summary').click();
        await menu.getByRole('button',{name:'KES 400 delivery'}).click();
        if(width<768)await mobileNav.getByRole('button',{name:'Your Work'}).click();
        assert.ok(await board.getByText('an office chair').count(),
          'Switching examples must not discard a previously edited detail');
        await page.screenshot({path:out+'/'+device+'-returned.png',fullPage:true});
      }
      const dims=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,viewport:document.documentElement.clientWidth}));
      assert.ok(dims.scroll<=dims.viewport+1,'Horizontal overflow at '+device);
      assert.equal(errors.length,0,'Browser exceptions '+errors.join('; '));
      assert.equal(mutatingRequests.length,0,'Unexpected preview backend writes '+mutatingRequests.join('; '));
      await page.close();
    }
    console.log('Phase 2 corrected journeys PASS: '+device+' '+width+'px, no AI simulation or backend writes');
  }
} finally { await browser.close(); }

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';

const host='http://127.0.0.1:4173';
const out='artifacts/phase2-master';
mkdirSync(out,{recursive:true});
const cases=[
  {id:'delivery',title:'KES 400 delivery',question:'What exactly is being delivered?'},
  {id:'chama',title:'Eight-person chama',question:'What is the main purpose of this chama?'},
  {id:'service',title:'Professional service',question:'What result do you need the professional to deliver?'},
  {id:'project',title:'Project milestones',question:'What should the first phase deliver?'},
  {id:'store',title:'Store purchase',question:'Which goods are you considering?'},
];
const browser=await chromium.launch({headless:true});
try{
  for(const [device,width,height] of [['desktop',1440,900],['mobile',390,844],['small-mobile',320,700]]){
    for(const scenario of cases){
      const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
      const errors=[],mutatingRequests=[];
      page.on('pageerror',error=>errors.push(error.message));
      page.on('request',request=>{
        if(request.url().includes('/api/')&&request.method()!=='GET')mutatingRequests.push(request.method()+' '+request.url());
      });
      await page.goto(host+'/#/preview/living-workspace/work',{waitUntil:'domcontentloaded'});
      const nav=page.getByRole('navigation',{name:'Workspace experience'});
      await nav.getByRole('button',{name:'My Work'}).waitFor();
      const dialogue=page.getByRole('region',{name:'KS001 conversation'});
      await dialogue.waitFor();
      assert.equal(await page.locator('[data-preview-truth]').count(),1);
      await page.locator('[data-phase2-scenarios] summary').click();
      await page.getByRole('button',{name:scenario.title,exact:true}).click();
      if(scenario.id==='delivery'){
        assert.ok(await dialogue.getByRole('button',{name:'Describe the work or goods'}).count(),
          'Contextual answer hint must appear for the delivery question');
        assert.ok(await dialogue.getByRole('textbox',{name:'Preview a message to KS001'}).count(),
          'Free typing must remain available alongside contextual hints');
      }
      if(width<768)await page.getByRole('navigation',{name:'Mobile workspace panels'}).getByRole('button',{name:'Your Work'}).click();
      const board=page.locator('[data-phase2-check]');
      assert.ok(await board.isVisible(),'SecurePay Check must be accessible');
      assert.ok(await board.getByRole('heading',{name:'SecurePay Check'}).isVisible());
      assert.ok(await board.getByRole('region',{name:'What deserves attention'}).count()===0 || await board.getByText('What deserves attention').isVisible());
      assert.ok(await board.getByText(scenario.question).isVisible(),'Missing illustrative next question '+scenario.id);
      assert.equal(await board.getByText('Check complete. You may proceed.').count(),0);
      await board.getByText('Fair Trade',{exact:false}).first().click();
      assert.ok(await board.getByText('No principle has been evaluated in this demonstration',{exact:false}).count());
      await board.getByText('What can happen next?').click();
      assert.ok(await board.getByText('Requires accepted terms and real authority.',{exact:false}).count());
      if(width>=1280){
        const chat=await dialogue.boundingBox(),result=await board.boundingBox();
        assert.ok(chat&&result&&chat.x+chat.width<=result.x+2,'The Living Board may not overlap chat');
      }
      const dimensions=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,viewport:document.documentElement.clientWidth}));
      assert.ok(dimensions.scroll<=dimensions.viewport+1,'Unexpected horizontal overflow');
      await page.screenshot({path:out+'/'+device+'-'+scenario.id+'.png',fullPage:true});
      if(scenario.id==='delivery'){
        await board.getByRole('button',{name:'Edit preview note 1'}).click();
        await board.getByRole('textbox',{name:'Edit local preview note'}).fill('The parcel is a chair, and the proposed delivery charge is KES 400.');
        await board.getByRole('button',{name:'Save locally'}).click();
        assert.ok(await board.getByText('The parcel is a chair, and the proposed delivery charge is KES 400.').count(),'Correction did not reach board');
        await page.screenshot({path:out+'/'+device+'-edited.png',fullPage:true});
      }
      assert.equal(errors.length,0,'Browser exceptions '+errors.join('; '));
      assert.equal(mutatingRequests.length,0,'A local preview attempted backend mutation: '+mutatingRequests.join(', '));
      await page.close();
    }
    console.log('Phase 2 synthetic journeys PASS: '+device+' '+width+'px, all five scenarios, no backend writes');
  }
}finally{await browser.close();}

import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
const out='artifacts/phase4-master';
mkdirSync(out,{recursive:true});
const host='http://127.0.0.1:4173/#/preview/living-workspace/work';
const cases=[
  {id:'chairs',label:'Compare chairs for a school event',expect:/Store offer:.*Stacking chairs/i},
  {id:'solomon',label:'Solomon needs a rider',expect:/Quick Assist:.*My Ride inquiry/i},
  {id:'plug',label:'Find practical help from a Plug',expect:/Assistance:.*Plug/i},
  {id:'master',label:'Ask a Master to review milestones',expect:/Assistance:.*Master/i},
  {id:'stays',label:'Short Stay and My Ride',expect:/Quick Assist:.*Short Stays inquiry/i},
];
const browser=await chromium.launch({headless:true});
try {
 for(const [device,width,height] of [['desktop',1440,900],['mobile',390,844],['small-mobile',320,700]]) {
  for(const scenario of cases){
   const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
   const errors=[],writes=[];
   page.on('pageerror',error=>errors.push(error.message));
   page.on('request',request=>{if(request.url().includes('/api/')&&request.method()!=='GET')writes.push(request.method()+' '+request.url());});
   await page.goto(host,{waitUntil:'domcontentloaded'});
   await page.locator('[data-preview-truth]').waitFor();
   assert.equal(await page.locator('[data-preview-truth]').count(),1);
   await page.getByRole('button',{name:'Add a tool or source'}).click();
   const shelf=page.locator('[data-tool-shelf]');
   await shelf.waitFor();
   await shelf.locator('[data-phase4-journeys] summary').click();
   await shelf.getByRole('button',{name:scenario.label,exact:true}).click();
   if(scenario.id==='chairs'){
     const search=shelf.getByRole('textbox',{name:'Search sample Stores'});
     assert.equal(await search.inputValue(),'chairs','Chair journey should seed a useful discovery query');
     assert.ok(await shelf.getByText('Sample KES 250 per chair').count());
     assert.ok(await shelf.getByText('Sample KES 210 per chair').count());
     const consider=shelf.getByRole('button',{name:'Consider for comparison'});
     assert.equal(await consider.count(),2,'Exactly two matching sample chair offers expected');
     await consider.first().click();
     await consider.last().click();
     const comparison=shelf.locator('[data-phase4-comparison]');
     assert.ok(await comparison.isVisible());
     assert.ok(await comparison.getByText('Transport cost NOT stated',{exact:false}).count());
     assert.ok(await comparison.getByText('Local transport described as included',{exact:false}).count());
     if(width>=768)assert.equal(await page.locator('[data-phase1-preview-fact]').count(),0,'Shortlisting must not create an Agreement fact');
     await page.screenshot({path:out+'/'+device+'-chairs-compare.png',fullPage:true});
     await comparison.getByRole('button',{name:'Propose in My Work'}).first().click();
   }else if(scenario.id==='plug'||scenario.id==='master'){
     const help=shelf.locator('[data-phase4-human-help]');
     assert.ok(await help.isVisible());
     assert.match(await help.innerText(),/No person, rate, location, qualification or availability is verified/);
     await page.screenshot({path:out+'/'+device+'-'+scenario.id+'-explore.png',fullPage:true});
     await help.getByRole('button',{name:scenario.id==='plug'?'Ask for a Plug':'Ask for a Master'}).click();
   }else{
     assert.ok(await shelf.getByRole('heading',{name:scenario.id==='solomon'?'My Ride':'Short Stays'}).count() || await shelf.getByText(scenario.id==='solomon'?'My Ride':'Short Stays',{exact:true}).count());
     await page.screenshot({path:out+'/'+device+'-'+scenario.id+'-explore.png',fullPage:true});
     await shelf.getByRole('button',{name:'Propose in My Work'}).click();
   }
   assert.equal(await shelf.count(),0,'Proposal must close Tool Shelf and return to same work');
   const mobileNav=page.getByRole('navigation',{name:'Mobile workspace panels'});
   if(width<768)await mobileNav.getByRole('button',{name:'Your Work'}).click();
   const board=page.locator('[data-phase2-check]');
   await board.getByRole('heading',{name:'SecurePay Check'}).waitFor();
   const text=await board.innerText();
   assert.match(text,scenario.expect,'Phase 4 proposal missing from Check');
   assert.match(text,/Not checked/);
   assert.doesNotMatch(text,/Check complete\. You may proceed|Booking confirmed|Payment completed|Invitation accepted/);
   await page.screenshot({path:out+'/'+device+'-'+scenario.id+'-check.png',fullPage:true});
   await board.getByRole('button',{name:'Edit preview note 1'}).click();
   await board.getByRole('textbox',{name:'Edit local preview note'}).fill('Updated phase 4 '+scenario.id+' proposal · not confirmed');
   await board.getByRole('button',{name:'Save locally'}).click();
   assert.ok(await board.getByText('Updated phase 4 '+scenario.id+' proposal · not confirmed').count());
   await board.getByRole('button',{name:'Remove preview note 1'}).click();
   assert.equal(await board.getByText('Updated phase 4 '+scenario.id+' proposal · not confirmed').count(),0);
   const dimensions=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,viewport:document.documentElement.clientWidth}));
   assert.ok(dimensions.scroll<=dimensions.viewport+1,device+' overflow '+scenario.id);
   assert.deepEqual(errors,[],'Browser exceptions '+scenario.id);
   assert.deepEqual(writes,[],'Preview must not mutate backend '+scenario.id);
   await page.close();
  }
  console.log('Phase 4 journeys PASS '+device+' '+width+'px, same work, no backend writes');
 }
}finally{await browser.close();}

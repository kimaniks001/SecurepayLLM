import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';
const out='artifacts/phase4-master';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const url='http://127.0.0.1:4173/#/preview/living-workspace/work';
async function openTool(page,width,tool,label=tool){
 if(width>=1280) await page.getByRole('navigation',{name:'Workspace tool rail'}).getByRole('button',{name:tool,exact:true}).click();
 else{
   await page.getByRole('navigation',{name:'Mobile workspace panels'}).getByRole('button',{name:'Tools'}).click();
   await page.getByRole('navigation',{name:'Choose a tool'}).getByRole('button',{name:label,exact:true}).click();
 }
}
async function checkBoard(page,width,term){
 if(width<768)await page.getByRole('navigation',{name:'Mobile workspace panels'}).getByRole('button',{name:'Your Work'}).click();
 const board=page.locator('[data-phase2-check]');
 await board.getByText(term,{exact:false}).first().waitFor();
 assert.ok(await board.getByText('Not checked',{exact:false}).count(),'Proposal cannot become accepted fact');
 return board;
}
try{
 for(const [size,width,height] of [['desktop',1440,900],['mobile',390,844],['small-mobile',320,700]]){
  for(const scenario of ['chairs','solomon','plug','master','shortstay']){
   const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
   const exceptions=[],writes=[];
   page.on('pageerror',e=>exceptions.push(e.message));
   page.on('request',r=>{if(r.url().includes('/api/')&&r.method()!=='GET')writes.push(r.url());});
   await page.goto(url,{waitUntil:'domcontentloaded'});
   await page.locator('[data-preview-truth]').waitFor();
   if(['chairs','plug','master'].includes(scenario)){
     await openTool(page,width,'Stores');
     const shelf=page.locator('[data-tool-shelf]');
     await shelf.getByText('SAMPLE · NOT A REAL STORE',{exact:false}).first().waitFor();
     if(scenario==='chairs'){
       await shelf.getByRole('textbox',{name:'Search sample Stores'}).fill('Event chairs');
       const results=shelf.locator('article');
       assert.equal(await results.count(),2,'Should discover two explicitly sample chair offers');
       await results.first().getByRole('button',{name:'Consider / compare'}).click();
       await results.nth(1).getByRole('button',{name:'Consider / compare'}).click();
       await shelf.locator('[data-phase4-comparison]').waitFor();
       assert.match(await shelf.locator('[data-phase4-comparison]').innerText(),/Delivery price: Unknown/);
       assert.match(await shelf.locator('[data-phase4-comparison]').innerText(),/not proposed or accepted/);
       await page.screenshot({path:out+'/'+size+'-chairs-compare.png',fullPage:true});
       await results.first().getByRole('button',{name:'Propose in My Work'}).click();
       const board=await checkBoard(page,width,'Event chairs · sample A');
       assert.match(await board.innerText(),/not verified|not checked|not confirmed/i);
     }else{
       await shelf.getByRole('button',{name:'Together',exact:true}).click();
       await shelf.getByRole('heading',{name:'Find capable human help'}).waitFor();
       if(scenario==='plug') await shelf.getByRole('button',{name:'Explore a Plug'}).click();
       else await shelf.getByRole('button',{name:'Explore a Master'}).click();
       const board=await checkBoard(page,width,scenario==='plug'?'Plug':'Master');
       assert.match(await board.innerText(),/unconfirmed|No person assigned/i);
     }
   }else{
     await openTool(page,width,'Quick Assist');
     const shelf=page.locator('[data-tool-shelf]');
     if(scenario==='solomon'){
       await shelf.getByRole('button',{name:'My Ride',exact:false}).first().click();
       await shelf.getByRole('button',{name:'Goods',exact:true}).click();
       await shelf.locator('#quick-assist-request').fill('I have goods at my shop and need someone to deliver them nearby. Pickup and drop-off to clarify.');
     }else{
       await shelf.getByRole('button',{name:'Short Stays',exact:false}).first().click();
       await shelf.locator('#quick-assist-request').fill('Short stay near tomorrow’s meeting; transport needed too. No location permission granted.');
     }
     await shelf.getByRole('button',{name:'Continue with KS001'}).click();
     const board=await checkBoard(page,width,'Quick Assist request');
     assert.match(await board.innerText(),/No provider contacted or booking made/);
   }
   await page.screenshot({path:out+'/'+size+'-'+scenario+'-check.png',fullPage:true});
   const dim=await page.evaluate(()=>({width:document.documentElement.scrollWidth,viewport:document.documentElement.clientWidth}));
   assert.ok(dim.width<=dim.viewport+1,'No horizontal overflow '+size+' '+scenario);
   assert.equal(exceptions.length,0,'Browser error: '+exceptions.join('; '));
   assert.equal(writes.length,0,'Synthetic preview attempted backend mutation');
   await page.close();
  }
  console.log('Phase 4 five journeys PASS at '+width+'px');
 }
}finally{await browser.close();}

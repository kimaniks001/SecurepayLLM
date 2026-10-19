import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
const out='artifacts/phase3-master';
mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const host='http://127.0.0.1:4173/#/preview/living-workspace/work';
const photo=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO++h5kAAAAASUVORK5CYII=','base64');
const scenarios=[
 {id:'people',tool:'People & Invitations',label:'People'},
 {id:'photo',tool:'Photos',label:'Photos'},
 {id:'document',tool:'Documents',label:'Documents'},
 {id:'place',tool:'Places',label:'Places'},
 {id:'date',tool:'Date & Time',label:'Date & Time'}
];
try{
 for(const [size,width,height] of [['desktop',1440,900],['mobile',390,844],['small-mobile',320,700]]){
  for(const scenario of scenarios){
   const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
   const errors=[],writes=[];
   page.on('pageerror',e=>errors.push(e.message));
   page.on('request',r=>{if(r.url().includes('/api/')&&r.method()!=='GET')writes.push(r.url());});
   await page.goto(host,{waitUntil:'domcontentloaded'});
   await page.locator('[data-preview-truth]').waitFor();
   const mobileNav=page.getByRole('navigation',{name:'Mobile workspace panels'});
   if(width>=1280){
    await page.getByRole('navigation',{name:'Workspace tool rail'}).getByRole('button',{name:scenario.tool,exact:true}).click();
   }else{
    await mobileNav.getByRole('button',{name:'Tools'}).click();
    await page.getByRole('navigation',{name:'Choose a tool'}).getByRole('button',{name:scenario.label,exact:true}).click();
   }
   const shelf=page.locator('[data-tool-shelf]');
   await shelf.waitFor();
   await page.screenshot({path:out+'/'+size+'-'+scenario.id+'-tool.png',fullPage:true});
   if(scenario.id==='people'){
    await shelf.getByRole('textbox',{name:"Proposed person's name or KS Number"}).fill('KS002');
    await shelf.getByRole('combobox',{name:"Proposed person's role"}).selectOption({label:'Recipient'});
    assert.ok(await shelf.getByText('No invitation was sent',{exact:false}).count());
    await shelf.getByRole('button',{name:'Add proposed person locally'}).click();
   }else if(scenario.id==='photo'){
    await shelf.locator('input[type=file]').first().setInputFiles({name:'chairs.png',mimeType:'image/png',buffer:photo});
    await shelf.getByText('chairs.png').waitFor();
    await shelf.getByRole('textbox',{name:'Add a note (optional)'}).fill('200 chairs for delivery');
    await shelf.getByRole('button',{name:'Add photo to preview'}).click();
   }else if(scenario.id==='document'){
    await shelf.locator('input[type=file]').first().setInputFiles({name:'minutes.txt',mimeType:'text/plain',buffer:Buffer.from('Meeting minutes: 200 chairs to be delivered after an agreed date. This is unverified text.')});
    await shelf.getByText('minutes.txt').waitFor();
    await shelf.getByText('Selected text preview').waitFor();
    await shelf.getByRole('textbox',{name:'Add a note (optional)'}).fill('Meeting minutes submitted for review');
    await shelf.getByRole('button',{name:'Add document to preview'}).click();
   }else if(scenario.id==='place'){
    await shelf.getByRole('button',{name:'Destination',exact:true}).click();
    await shelf.getByRole('textbox',{name:'Place, address or Plus Code'}).fill('School delivery gate, Nairobi');
    await shelf.getByRole('textbox',{name:'Delivery entrance'}).fill('Back gate');
    await shelf.getByRole('button',{name:'Add proposed place locally'}).click();
   }else{
    await shelf.getByRole('button',{name:'Tomorrow'}).click();
    const day=await shelf.getByRole('textbox',{name:'Date'}).inputValue().catch(async()=>await shelf.getByLabel('Date',{exact:true}).inputValue());
    assert.match(day,/^\d{4}-\d{2}-\d{2}$/);
    await shelf.getByRole('button',{name:'Add a time'}).click();
    await shelf.getByLabel('Proposed local time').fill('10:00');
    await shelf.getByRole('button',{name:'Add proposed timing locally'}).click();
   }
   assert.equal(await shelf.count(),0,'Tool should close and return to same KS001 work');
   if(width<768)await mobileNav.getByRole('button',{name:'Your Work'}).click();
   const board=page.locator('[data-phase2-check]');
   await board.getByRole('heading',{name:'SecurePay Check'}).waitFor();
   const boardText=await board.innerText();
   if(scenario.id==='people')assert.match(boardText,/KS002.*Recipient.*not verified/i);
   if(scenario.id==='photo') {
     assert.match(boardText,/chairs\.png/);
     await board.getByText('View selected photo').click();
     assert.ok(await board.getByRole('img',{name:/Local photograph/}).isVisible());
   }
   if(scenario.id==='document'){
     assert.match(boardText,/minutes\.txt/);
     await board.getByText('Read selected text').click();
     assert.match(await board.innerText(),/Meeting minutes: 200 chairs/);
   }
   if(scenario.id==='place'){assert.ok(await board.getByText('Destination',{exact:true}).count());assert.match(boardText,/School delivery gate, Nairobi.*Entrance: Back gate/);}
   if(scenario.id==='date')assert.match(boardText,/delivery.*10:00.*proposed, not agreed/i);
   assert.ok(await board.getByText('Not checked',{exact:false}).count(),'No fact may be falsely verified');
   await page.screenshot({path:out+'/'+size+'-'+scenario.id+'-board.png',fullPage:true});
   await board.getByRole('button',{name:'Edit preview note 1'}).click();
   await board.getByRole('textbox',{name:'Edit local preview note'}).fill('Updated proposed '+scenario.id+' detail');
   await board.getByRole('button',{name:'Save locally'}).click();
   assert.ok(await board.getByText('Updated proposed '+scenario.id+' detail').count(),'Proposal correction failed');
   await board.getByRole('button',{name:'Remove preview note 1'}).click();
   assert.equal(await board.getByText('Updated proposed '+scenario.id+' detail').count(),0,'Removed proposal remains visible');
   const d=await page.evaluate(()=>({width:document.documentElement.scrollWidth,viewport:document.documentElement.clientWidth}));
   assert.ok(d.width<=d.viewport+1,'Horizontal overflow '+size+' '+scenario.id);
   assert.equal(errors.length,0,'Browser exceptions: '+errors.join('; '));
   assert.equal(writes.length,0,'Local preview made backend write');
   await page.close();
  }
  console.log('Phase 3 five-tool human journeys PASS at '+size+' '+width+'px');
 }
}finally{await browser.close();}

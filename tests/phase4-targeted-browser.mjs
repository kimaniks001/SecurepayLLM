import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
mkdirSync('artifacts/phase4-targeted',{recursive:true});
const browser=await chromium.launch({headless:true});
try{
 for(const [name,width,height] of [['desktop',1440,900],['mobile',390,844],['small-mobile',320,700]]){
  const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
  const exceptions=[],writes=[];
  page.on('pageerror',e=>exceptions.push(e.message));
  page.on('request',r=>{if(r.url().includes('/api/')&&r.method()!=='GET')writes.push(r.method()+' '+r.url())});
  await page.goto('http://127.0.0.1:4173/#/preview/living-workspace/work',{waitUntil:'domcontentloaded'});
  await page.locator('[data-preview-truth]').waitFor();
  await page.getByRole('button',{name:'Add a tool or source'}).click();
  const shelf=page.locator('[data-tool-shelf]');
  const choose=async label=>{await shelf.locator('[data-phase4-journeys] summary').click();await shelf.getByRole('button',{name:label,exact:true}).click();};
  await choose('Compare chairs for a school event');
  const chair=shelf.getByRole('button',{name:'Enlarge Stacking chairs'}).first();
  await chair.click();
  const dialog=page.getByRole('dialog',{name:'Photo preview: Stacking chairs'});
  await dialog.waitFor();
  assert.ok(await dialog.getByRole('button',{name:'Zoom in'}).count());
  await dialog.getByRole('button',{name:'Zoom in'}).click();
  await page.screenshot({path:'artifacts/phase4-targeted/'+name+'-photo-enlarged.png',fullPage:true});
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('[data-store-lightbox]').count(),0);
  assert.ok(await shelf.getByRole('textbox',{name:'Search sample Stores'}).count(),'Store search must stay open after closing the photograph');

  const buys=shelf.getByRole('button',{name:'Add to buying plan'});
  assert.equal(await buys.count(),2,'Two chair offers from separate sample Stores must remain available');
  await buys.first().click();
  let plan=page.getByRole('region',{name:'Editable buying plan summary'});
  assert.ok(await page.getByRole('dialog',{name:'Review proposed buying plan'}).isVisible(),'Plan must have a spacious focused view');
  assert.ok(await plan.locator('[data-single-store]').isVisible(),'Single Store should have simple purchasing and delivery arrangements');
  assert.equal(await plan.getByRole('button',{name:'Community Saver'}).count(),0,'Saver must not appear for one Store');
  assert.equal(await plan.getByRole('button',{name:'Combined delivery'}).count(),0);
  await page.screenshot({path:'artifacts/phase4-targeted/'+name+'-single-store.png',fullPage:true});
  await plan.getByRole('button',{name:'Browse'}).click();
  await shelf.getByRole('button',{name:'Add to buying plan'}).last().click();
  plan=page.getByRole('region',{name:'Editable buying plan summary'});
  assert.ok(await plan.getByRole('button',{name:'Community Saver'}).isVisible(),'Cross-store Saver option should be discoverable');
  await plan.getByRole('button',{name:'Community Saver'}).click();
  assert.ok(await plan.getByText('Consent · not yet obtained').isVisible());
  assert.ok(await plan.getByText('Ordinary cost baseline:',{exact:false}).count());
  assert.ok(await plan.getByText('Each seller: pending',{exact:false}).count());
  await page.screenshot({path:'artifacts/phase4-targeted/'+name+'-multi-store-saver.png',fullPage:true});
  await plan.getByRole('checkbox',{name:/I want to explore this Saver opportunity/}).check();
  assert.ok(await plan.getByText('formal agreement pending',{exact:false}).count());
  await plan.getByRole('button',{name:'Remove Event chairs'}).click();
  assert.ok(await plan.locator('[data-single-store]').isVisible(),'Removing second Store must hide cross-Store options');
  assert.equal(await plan.getByRole('button',{name:'Community Saver'}).count(),0);
  assert.ok(await plan.getByText('earlier cross-Store coordination choice was cleared',{exact:false}).count());
  await page.screenshot({path:'artifacts/phase4-targeted/'+name+'-reset-single.png',fullPage:true});

  // A separate sample seller view demonstrates the private nature of local relationship tags.
  await plan.getByRole('button',{name:'Browse'}).click();
  await shelf.getByRole('group',{name:'Sample Store viewpoint'}).getByRole('button',{name:'Seller'}).click();
  const relationships=shelf.locator('[data-phase4-human-relations]');
  assert.ok(await relationships.getByRole('button',{name:'My Plugs'}).count());
  await relationships.getByRole('textbox',{name:'Relationship KS Number'}).fill('KS123');
  await relationships.getByRole('textbox',{name:'Private relationship tag'}).fill('Preferred deliveries');
  await relationships.getByRole('button',{name:'Add private tag locally'}).click();
  assert.ok(await relationships.getByText('Preferred deliveries').count());
  await shelf.getByRole('group',{name:'Sample Store viewpoint'}).getByRole('button',{name:'Buyer'}).click();
  await shelf.getByRole('group',{name:'Sample Store viewpoint'}).getByRole('button',{name:'Seller'}).click();
  assert.ok(await shelf.locator('[data-phase4-human-relations]').getByText('Preferred deliveries').count(),
    'Locally tagged provider relationship should survive Store view changes');
  await relationships.getByRole('button',{name:'My Masters'}).click();
  await relationships.getByRole('combobox',{name:'What help do you need?'}).selectOption('Construction');
  assert.ok(await relationships.getByText('No provider matches',{exact:false}).count());
  await page.screenshot({path:'artifacts/phase4-targeted/'+name+'-private-relationships.png',fullPage:true});
  assert.deepEqual(exceptions,[],'Browser exceptions');
  assert.deepEqual(writes,[],'Preview writes');
  const sizes=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:document.documentElement.clientWidth}));
  assert.ok(sizes.scroll<=sizes.width+1,'Unexpected horizontal overflow '+name);
  console.log('Phase 4 targeted corrections PASS: '+name+' '+width+'px');
  await page.close();
 }
}finally{await browser.close();}

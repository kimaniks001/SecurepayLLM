import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';

mkdirSync('artifacts/phase4-fluency',{recursive:true});
const browser=await chromium.launch({headless:true});
try {
 for(const [device,width,height] of [['desktop',1440,900],['mobile',390,844],['small-mobile',320,700]]){
  const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
  const errors=[],writes=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{if(r.url().includes('/api/')&&r.method()!=='GET')writes.push(r.method()+' '+r.url());});
  await page.goto('http://127.0.0.1:4173/#/preview/living-workspace/work',{waitUntil:'domcontentloaded'});
  await page.locator('[data-preview-truth]').waitFor();

  await page.getByRole('button',{name:'Add a tool or source'}).click();
  const shelf=page.locator('[data-tool-shelf]');
  await page.getByRole('navigation',{name:'Choose a tool'}).getByRole('button',{name:'Stores',exact:true}).click();
  const search=shelf.getByRole('textbox',{name:'Search sample Stores'});
  await search.fill('Porcelain floor tiles');
  await shelf.getByRole('button',{name:'Add to buying plan'}).first().click();

  const dialog=page.getByRole('dialog',{name:'Review proposed buying plan'});
  const plan=page.getByRole('region',{name:'Editable buying plan summary'});
  await dialog.waitFor();
  assert.ok(await plan.getByText('Porcelain floor tiles').count());
  assert.ok(await plan.locator('[data-single-store]').count(),'One Store should use ordinary delivery');
  assert.equal(await plan.getByRole('button',{name:'Community Saver'}).count(),0);
  await plan.getByRole('button',{name:'Increase quantity of Porcelain floor tiles'}).click();
  assert.match(await plan.innerText(),/2 item|2\s*Store|2\s*proposed|Qty\s*2/i);
  await page.screenshot({path:'artifacts/phase4-fluency/'+device+'-focused-plan.png',fullPage:true});
  await plan.getByRole('button',{name:/Continue with KS001/}).click();

  assert.equal(await dialog.count(),0,'Focused editor must close after handoff');
  assert.equal(await shelf.count(),0,'Store shelf must close after handoff');
  const guidance=page.locator('[data-phase4-plan-guidance]');
  assert.ok(await guidance.getByText('Where should these items be delivered or used?').count(),'KS001 must show material illustrative next question');
  await page.screenshot({path:'artifacts/phase4-fluency/'+device+'-ks001.png',fullPage:true});

  if(width<768)await page.getByRole('navigation',{name:'Mobile workspace panels'}).getByRole('button',{name:'Your Work'}).click();
  const check=page.locator('[data-phase2-check]');
  const proposal=check.locator('[data-phase4-proposed-plan]');
  await proposal.waitFor();
  const output=await proposal.innerText();
  assert.match(output,/Porcelain floor tiles.*2 proposed/);
  assert.match(output,/Mavuno Building Supplies/);
  assert.match(output,/tiles/);
  assert.match(output,/Sample Store/);
  assert.match(output,/Not specified/);
  assert.match(output,/not a confirmed quotation/);
  assert.match(await check.locator('[data-phase2-next]').innerText(),/Where should these items be delivered or used/);
  await page.screenshot({path:'artifacts/phase4-fluency/'+device+'-securepay-check.png',fullPage:true});

  await proposal.getByRole('button',{name:'Edit buying plan'}).click();
  await dialog.waitFor();
  assert.ok(await plan.getByText('Porcelain floor tiles').count(),'Edit should restore original line');
  assert.match(await plan.innerText(),/Qty\s*2/i);
  await plan.getByRole('button',{name:'Browse'}).click();
  await shelf.getByRole('textbox',{name:'Search sample Stores'}).fill('Custom work desk');
  await shelf.getByRole('button',{name:'Add to buying plan'}).first().click();
  await dialog.waitFor();
  assert.ok(await plan.getByRole('button',{name:'Combined delivery'}).count(),'Cross-Store coordination must appear after second distinct Store');
  assert.ok(await plan.getByRole('button',{name:'Community Saver'}).count());
  await plan.getByRole('button',{name:/Continue with KS001/}).click();
  if(width<768)await page.getByRole('navigation',{name:'Mobile workspace panels'}).getByRole('button',{name:'Your Work'}).click();
  const stores=await page.locator('[data-phase4-proposed-plan]').innerText();
  assert.match(stores,/Mavuno Building Supplies/);
  assert.match(stores,/Kijiji Woodworks/);
  await page.screenshot({path:'artifacts/phase4-fluency/'+device+'-cross-store.png',fullPage:true});

  const sizes=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:document.documentElement.clientWidth}));
  assert.ok(sizes.scroll<=sizes.width+1,device+' horizontal page overflow');
  assert.deepEqual(errors,[],device+' browser exception');
  assert.deepEqual(writes,[],device+' unapproved backend writes');
  await page.close();
  console.log('Phase 4 Store fluency PASS '+device+' '+width+'px');
 }
}finally{await browser.close();}

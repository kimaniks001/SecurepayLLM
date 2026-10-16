import {chromium} from 'playwright';
import {mkdirSync} from 'node:fs';
import assert from 'node:assert/strict';

const phase=process.env.PHASE2_CAPTURE==='before'?'before':'after';
const port=phase==='before'?4174:4173;
const output='artifacts/phase2/'+phase;
const site='http://127.0.0.1:'+port;
mkdirSync(output,{recursive:true});
const browser=await chromium.launch({headless:true});
try {
 for(const [device,width,height] of [['desktop',1440,900],['mobile',390,844],['small-mobile',320,700]]){
  const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
  const exceptions=[];
  page.on('pageerror',error=>exceptions.push(error.message));
  await page.goto(site+'/#/preview/living-workspace/work',{waitUntil:'domcontentloaded',timeout:40_000});
  await page.getByRole('navigation',{name:'Workspace experience'}).waitFor();
  const nav=page.getByRole('navigation',{name:'Workspace experience'});
  await page.getByRole('region',{name:'KS001 conversation'}).waitFor();
  // On mobile, the real Agreement is behind the explicit "Your Work" tab,
  // not the initially visible Chat panel. Capture the real component.
  if(width<768) await page.getByRole('navigation',{name:'Mobile workspace panels'}).getByRole('button',{name:'Your Work'}).click();
  if(phase==='after'){
    await page.locator('.sp-brand-shell[data-sp-area="work"]').waitFor();
    await page.locator('.sp-brand-conversation').waitFor({state:'attached'});
    await page.locator('aside[aria-label="Living result"]').waitFor();
    await page.getByText('Your Agreement will appear here when KS001 has confirmed the conversation.').waitFor();
    assert.equal(await page.getByRole('button',{name:'Try mock sign-in'}).count(),0);
    assert.equal(await page.getByRole('button',{name:/Try real KS001/}).count(),0);
    assert.equal(await page.getByRole('heading',{name:'Chair delivery'}).count(),0,
      'real work may not be illustrated as someone else\'s Agreement');
  }
  await page.screenshot({path:`${output}/${device}-work-agreement.png`,fullPage:true});
  if(width<768) await page.getByRole('navigation',{name:'Mobile workspace panels'}).getByRole('button',{name:'Chat'}).click();
  await page.screenshot({path:`${output}/${device}-ks001.png`,fullPage:true});
  const openPicker=async()=>{await page.getByRole('button',{name:'Add or use a tool'}).click(); await page.getByRole('dialog',{name:'Choose a tool'}).waitFor();};
  for(const [choice,filename] of [['Money','money'],['Stores','stores'],['Quick Assist','quick-assist']]){
    await openPicker();
    await page.getByRole('dialog',{name:'Choose a tool'}).getByRole('button',{name:new RegExp(choice)}).click();
    await page.screenshot({path:`${output}/${device}-${filename}.png`,fullPage:true});
    await page.getByRole('button',{name:'Close tools',exact:true}).click();
  }
  for(const [mode,label] of [['vision','Vision'],['circle','Circle'],['community','Community']]){
    await nav.getByRole('button',{name:label,exact:true}).click();
    if(phase==='after') await page.locator(`.sp-brand-shell[data-sp-area="${mode}"]`).waitFor();
    if(width<768) await page.getByRole('navigation',{name:'Mobile workspace panels'}).getByRole('button',{name:'Your Work'}).click();
    await page.screenshot({path:`${output}/${device}-${mode}.png`,fullPage:true});
  }
  await page.goto(site+'/#/',{waitUntil:'domcontentloaded',timeout:40_000});
  await page.screenshot({path:`${output}/${device}-home.png`,fullPage:true});
  const size=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,viewport:document.documentElement.clientWidth}));
  console.log(JSON.stringify({phase,device,homeViewport:size,exceptions}));
  assert.equal(exceptions.length,0,`Unexpected JS error (${device}): ${exceptions.join('; ')}`);
  await page.close();
 }
 console.log('Phase 2 '+phase+' browser screenshots created. Public or demonstration routes ONLY; not real user / Money certification.');
}finally {
 await browser.close();
}

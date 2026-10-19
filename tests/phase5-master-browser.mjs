import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';

const out='artifacts/phase5-master';
mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true});
try{
  for(const [label,width,height] of [
    ['desktop',1440,900],['mobile',390,844],['small-mobile',320,700],
  ]){
    const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
    const errors=[],writes=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('request',r=>{
      if(r.url().includes('/api/')&&r.method()!=='GET') writes.push(r.method()+' '+r.url());
    });
    await page.goto('http://127.0.0.1:4173/#/preview/living-workspace/work',
      {waitUntil:'domcontentloaded'});
    await page.locator('[data-workspace-frozen-layout]').waitFor();
    await page.locator('[data-preview-truth]').waitFor();
    const nav=page.getByRole('navigation',{name:'Workspace experience'});
    for(const [mode,name] of [['vision','Vision'],['circle','Circle'],['community','Community'],['work','My Work']]){
      await nav.getByRole('button',{name,exact:true}).click();
      await page.locator('[data-sp-area="'+mode+'"]').waitFor();
      assert.ok(await page.locator('[data-workspace-frozen-layout]').count(),
        'Masterpiece structure must remain through '+mode);
      await page.screenshot({path:out+'/'+label+'-'+mode+'.png',fullPage:true});
      const size=await page.evaluate(()=>({
        actual:document.documentElement.scrollWidth,
        viewport:document.documentElement.clientWidth,
      }));
      assert.ok(size.actual<=size.viewport+1,label+' '+mode+' horizontal overflow');
    }
    assert.deepEqual(errors,[],label+' browser errors');
    assert.deepEqual(writes,[],label+' unapproved preview production writes');
    console.log('Phase 5 all four areas navigation PASS '+label+' '+width+'px');
    await page.close();
  }
}finally{await browser.close();}

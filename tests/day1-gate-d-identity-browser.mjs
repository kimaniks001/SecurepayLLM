import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
const browser=await chromium.launch({headless:true});
mkdirSync('artifacts/gate-d-identity',{recursive:true});
try{
  for(const [label,width,height] of [['desktop',1440,900],['mobile',390,844],['small-phone',320,700]]){
    const page=await browser.newPage({viewport:{width,height}});
    const exceptions=[],writes=[];
    page.on('pageerror',e=>exceptions.push(e.message));
    page.on('request',req=>{
      if(req.url().includes('/api/')&&!['GET','HEAD'].includes(req.method()))
        writes.push(req.method()+' '+req.url());
    });
    try{
      await page.goto('http://127.0.0.1:4173/#/preview/living-workspace/work',{waitUntil:'domcontentloaded',timeout:40000});
      await page.locator('[data-workspace-frozen-layout]').waitFor();
      assert.equal(await page.locator('[data-workspace-shell]').count(),1,'Must show the approved Workspace, not old homepage');
      assert.equal(await page.locator('[data-tool-rail]').count(),1,'Tool rail is retained in DOM even when collapsed for mobile');
      assert.equal(await page.getByRole('button',{name:'Get KS Number',exact:true}).count(),1);
      await page.getByRole('button',{name:'Get KS Number',exact:true}).click();
      const modal=page.getByRole('dialog');
      await modal.waitFor({state:'visible'});
      const unavailable=(await page.locator('[data-gate-d-signup-staging-hold]').count())+
        (await page.locator('[data-gate-d-identity-not-connected]').count());
      assert.ok(unavailable>0,'No isolated identity backend: show safe disabled state, never a signup request');
      assert.equal(await page.locator('[data-workspace-shell]').count(),1,'Workspace must stay mounted under signup');
      await page.screenshot({path:'artifacts/gate-d-identity/'+label+'-signup.png',fullPage:true});
      assert.deepEqual(writes,[],'A preview without staging must never write to SecurePay');
      assert.deepEqual(exceptions,[],'No JavaScript errors');
      const dims=await page.evaluate(()=>({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
      assert.ok(dims.scroll<=dims.width+1,'No horizontal overflow at '+label+': '+JSON.stringify(dims));
      console.log('Gate D identity preview PASS '+label);
    }finally{await page.close();}
  }
}finally{await browser.close();}

import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';

const base='http://127.0.0.1:4173';
const out='artifacts/unified-workspace';
mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const results=[];
try{
  for(const [device,width,height] of [['desktop',1440,900],['mobile',390,844],['small-mobile',320,700]]){
    const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce',serviceWorkers:'block'});
    const problems=[], blocked=[];
    page.on('pageerror',e=>problems.push(e.message));
    // Read-only browser verification. Do not call production API or submit a KS001 turn.
    await page.route('**/*',async route=>{
      const req=route.request(),target=new URL(req.url());
      if(target.origin!==base || !['GET','HEAD'].includes(req.method()) || target.pathname.startsWith('/api/')){
        blocked.push(req.method()+' '+target.origin+target.pathname);
        await route.abort('blockedbyclient');
      }else await route.continue();
    });
    try{
      await page.goto(base+'/#/',{waitUntil:'domcontentloaded',timeout:30000});
      await page.locator('[data-workspace-at-rest][data-workspace-identity="visitor"]').waitFor({timeout:15000});
      await page.getByRole('heading',{name:'What would you like to make happen?'}).waitFor();
      assert.equal(await page.locator('textarea[data-ks001-composer]').count(),1);
      assert.equal(await page.locator('[data-workspace-state="rest"] [role="log"]').count(),1);
      assert.equal(await page.locator('[data-workspace-sheet]').count(),1);
      assert.ok(await page.getByText('Start without a KS Number.',{exact:false}).count());
      await page.getByRole('button',{name:'Add or use a tool'}).click();
      const picker=page.getByRole('dialog',{name:'Choose a tool'});
      await picker.waitFor();
      for(const name of ['Photos','Documents','Places','Date & Time','Quick Assist','Stores','People & Invitations','Money']){
        assert.ok(await picker.getByRole('button',{name:new RegExp(name.replace('&','&'))}).count(),`Missing ${name} in rich workspace tray`);
      }
      await page.screenshot({path:`${out}/${device}-rich-eight-tools.png`,fullPage:true});
      await picker.getByRole('button',{name:/Documents/}).click();
      await page.getByRole('dialog',{name:'Documents tool'}).getByRole('button',{name:/Choose document/}).waitFor();
      await page.getByRole('button',{name:/Choose spreadsheet/}).waitFor();
      await page.getByRole('button',{name:/Paste a plan/}).waitFor();
      await page.getByRole('button',{name:'All tools'}).click();
      await page.getByRole('dialog',{name:'Choose a tool'}).getByRole('button',{name:/Quick Assist/}).click();
      await page.getByRole('dialog',{name:'Quick Assist tool'}).getByText('Short Stays',{exact:false}).waitFor();
      await page.getByRole('button',{name:'All tools'}).click();
      const dateItem=page.getByRole('dialog',{name:'Choose a tool'}).getByRole('button',{name:/Date & Time/});
      await dateItem.click();
      await page.getByRole('dialog',{name:'Date & Time'}).waitFor();
      await page.screenshot({path:`${out}/${device}-date-time.png`,fullPage:true});
      await page.getByRole('button',{name:'Close',exact:true}).click();
      await page.screenshot({path:`${out}/${device}-welcoming-workspace.png`,fullPage:true});
      const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
      assert.ok(overflow<=2,`horizontal overflow at ${width}px: ${overflow}`);
      assert.deepEqual(problems,[]);
      results.push({device,width,overflow,blocked:blocked.length,result:'PASS'});
    }finally {await page.close();}
  }
}finally{await browser.close();}
writeFileSync(out+'/results.json',JSON.stringify(results,null,2));
console.log(JSON.stringify(results,null,2));
console.log('PASS: real public at-rest browser UI only; signed-in credentials and live turn E2E NOT tested.');

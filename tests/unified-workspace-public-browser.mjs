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
      await page.getByRole('button',{name:'Add what you have'}).click();
      const menu=page.getByRole('menu',{name:'Add a source'});
      const dateItem=menu.getByRole('menuitem',{name:/Date & Time/});
      await dateItem.waitFor();
      await page.screenshot({path:`${out}/${device}-add-menu.png`,fullPage:true});
      await menu.evaluate(node=>{node.scrollTop=node.scrollHeight;});
      const menuBox=await menu.boundingBox(), itemBox=await dateItem.boundingBox();
      assert.ok(menuBox && itemBox && itemBox.y >= menuBox.y-2 && itemBox.y+itemBox.height <= menuBox.y+menuBox.height+2,
        'Date & Time must remain visible and reachable inside the Add menu');
      assert.ok(itemBox.y >= 0 && itemBox.y+itemBox.height <= height,
        'Date & Time must be on screen without scrolling the workspace itself');
      await page.screenshot({path:`${out}/${device}-add-date-visible.png`,fullPage:true});
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

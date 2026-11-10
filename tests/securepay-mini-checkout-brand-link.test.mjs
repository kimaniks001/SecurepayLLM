import assert from 'node:assert/strict';
import test from 'node:test';
import {existsSync,readdirSync,readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';

const root=dirname(dirname(fileURLToPath(import.meta.url)));
const read=path=>readFileSync(join(root,path),'utf8');
const imagePath='public/brand/securepay-mark-green.png';
const official='https://securepay.ke/';
const checkoutHtml=readdirSync(root).filter(path=>
  /^checkout(?:-[a-z0-9]+)+\.html$/.test(path));
const mini=read('src/mini/MiniExperience.tsx');
const miniCss=read('src/mini/mini.css');
const hostCss=read('checkout-demo.css');

test('checkout uses the existing canonical logo asset, not a recreated image or shield',()=>{
  assert.equal(existsSync(join(root,imagePath)),true);
  assert.ok(checkoutHtml.length>=9,'unexpectedly fewer checkout preview hosts');
  assert.match(mini,/className="spm-canonical-mark" src="\/brand\/securepay-mark-green\.png"/);
  assert.doesNotMatch(mini,/<div className="spm-mark"[^>]*>\s*<ShieldCheck/);
  assert.match(miniCss,/\.spm-canonical-mark/);
});

test('every checkout/review host shows the official imprint NEXT TO its checkout action',()=>{
  for(const path of checkoutHtml){
    const html=read(path);
    const pay=html.indexOf('class="demo-pay"');
    const imprint=html.indexOf('data-securepay-logo-imprint="official"');
    assert.ok(pay>=0,path+' has no checkout/offer review action');
    assert.ok(imprint>pay,path+' lacks a linked SecurePay imprint after checkout action');
    assert.equal(html.match(/data-securepay-logo-imprint="official"/g)?.length,1,
      path+' must have exactly one host imprint');
    const anchor=html.slice(html.lastIndexOf('<a ',imprint),html.indexOf('</a>',imprint)+4);
    assert.match(anchor,/href="https:\/\/securepay\.ke\/"/,path);
    assert.match(anchor,/target="_blank"/,path);
    assert.match(anchor,/rel="noopener noreferrer"/,path);
    assert.match(anchor,/src="\/brand\/securepay-mark-green\.png"/,path);
    assert.match(anchor,/Checkout by <strong>SecurePay<\/strong>/,path);
    assert.match(anchor,/aria-label="Checkout by SecurePay/,path);
  }
  assert.match(hostCss,/\.demo-securepay-imprint/);
});

test('Mini keeps a canonical, clickable imprint on EVERY checkout screen',()=>{
  assert.match(mini,/className="spm-brand spm-brand-link" href="https:\/\/securepay\.ke\/"/);
  assert.match(mini,/className="spm-checkout-imprint" href="https:\/\/securepay\.ke\/"/);
  const links=[...mini.matchAll(/<a[^>]*className="spm-(?:brand spm-brand-link|checkout-imprint)"[\s\S]*?<\/a>/g)];
  assert.equal(links.length,2,'Mini header and footer must both link to the official brand');
  for(const m of links){
    assert.match(m[0],/target="_blank" rel="noopener noreferrer"/);
    assert.match(m[0],/\/brand\/securepay-mark-green\.png/);
    assert.match(m[0],/aria-label="[^"]*SecurePay/);
  }
  assert.match(miniCss,/\.spm-checkout-imprint/);
});

test('imprint is not counterfeit financial certification and cannot interrupt checkout',()=>{
  for(const path of checkoutHtml){
    const html=read(path);
    const anchor=html.slice(html.indexOf('data-securepay-logo-imprint')-140,
      html.indexOf('data-securepay-logo-imprint')+480);
    assert.doesNotMatch(anchor,/guaranteed payment|escrow protected|payment verified|funds secured/i);
    assert.match(anchor,/target="_blank"/);
  }
  assert.match(mini,/Trust is the currency/);
  assert.doesNotMatch(mini,/window\.location\s*=\s*'https:\/\/securepay\.ke\/';/);
});

/**
 * Deliberate M10 release STOP: reject a purported customer release if the
 * compiled output still contains synthetic/demo identities or payment data.
 * This is not a test-run script. It runs only after release-mode Vite build.
 * Ordinary preview builds retain synthetic fixtures for developer testing.
 */
import {existsSync,readdirSync,readFileSync,statSync} from 'node:fs';
import {join} from 'node:path';

if(process.env.SECUREPAY_MINI_RELEASE_BUILD!=='1'){
  throw Error('Mini release audit requires SECUREPAY_MINI_RELEASE_BUILD=1');
}
const root='dist';
if(!existsSync(join(root,'mini.html'))){
  throw Error('The customer Mini entry did not build');
}
for(const entry of [
  'mini-host-preview.html','checkout-demo-store.html',
  'checkout-demo-shortstays.html','checkout-gate2-store.html',
  'checkout-gate2-shortstays.html','checkout-gate3-store.html',
  'checkout-gate3-shortstays.html','checkout-gate4-store.html',
  'checkout-gate4-shortstays.html',
]){
  if(existsSync(join(root,entry)))throw Error(
    'Production Mini release includes test HTML: '+entry);
}
function filesAt(folder){
  return readdirSync(folder).flatMap(name=>{
    const p=join(folder,name);
    return statSync(p).isDirectory()?filesAt(p):[p];
  });
}
const forbidden=[
  /DEMO-AGR-041/,
  /mini-demo-amina/,
  /mini-demo-njeri/,
  /40 chairs for Varsityville/,
  /synthetic-local-only/,
  /SYNTHETIC DEMO ONLY/,
  /Test Money · three routes/,
];
for(const filename of filesAt(root).filter(p=>/\.js$/.test(p))){
  const source=readFileSync(filename,'utf8');
  for(const marker of forbidden){
    if(marker.test(source))throw Error(
      'Customer Mini release still bundles owner/demo data: '+marker+
      ' in '+filename+'. Strip fixture imports before launch.');
  }
}
console.log('Mini release audit passed: no demo pages or sample Money identities');

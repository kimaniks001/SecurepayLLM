/**
 * Release-only, explicit deletion of known legacy preview JS copied wholesale
 * from public/. Keep source tests and test fixtures in Git; they do not belong
 * on a customer-facing Mini deployment. NEVER remove user data or API records.
 */
import {existsSync,unlinkSync} from 'node:fs';
import {join} from 'node:path';

if(process.env.SECUREPAY_MINI_RELEASE_BUILD!=='1'){
  throw new Error('Customer cleanup must run only for an explicit release build');
}
const names=[
  'checkout-demo-host.js',
  'checkout-demo-server-host.js',
  'checkout-gate2-host.js',
  'checkout-gate3-host.js',
  'checkout-gate4-host.js',
];
for(const name of names){
  const filename=join('dist',name);
  if(existsSync(filename))unlinkSync(filename);
}
console.log('Customer asset cleanup complete: no copied demo checkout scripts');

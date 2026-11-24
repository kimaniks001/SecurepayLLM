import test from 'node:test';
import assert from 'node:assert/strict';
import {readdirSync,readFileSync} from 'node:fs';
import {join,resolve,relative} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(fileURLToPath(new URL('../',import.meta.url)));
const read=path=>readFileSync(join(root,path),'utf8');
const ban=/Checkout by\s*(?:<[^>]+>\s*)?SecurePay|spm-checkout-imprint|data-merchant-checkout-imprint/i;
function walk(directory){
 const out=[];
 for(const entry of readdirSync(join(root,directory),{withFileTypes:true})){
  const path=directory+'/'+entry.name;
  if(entry.isDirectory())out.push(...walk(path));
  else if(/\.(?:tsx|jsx|ts|js)$/.test(path))out.push(path);
 }
 return out;
}

test('Living Workspace and shared app navigation do NOT carry Business-owned checkout branding',()=>{
 const sources=[
  'src/App.tsx',
  'src/components/NavBar.tsx',
  'src/components/SignedOutHome.tsx',
  'src/components/SignedInHome.tsx',
  'src/components/ConversationWorkspace.tsx',
  ...walk('src/features/workspace'),
  ...walk('src/features/living-workspace')
 ];
 for(const path of sources){
  const content=read(path);
  assert.doesNotMatch(content,ban,
   'Business merchant checkout imprint must not appear in Living Workspace: '+path);
 }
 assert.ok(sources.length>40,'Living Workspace source inventory must actually be checked');
});
test('Workspace keeps existing Agreement and Money work; removing a merchant footer is not removing Pay',()=>{
 const workspace=read('src/features/workspace/WorkspaceExperience.tsx');
 const living=read('src/features/living-workspace/Phase1LivingWorkspacePreview.tsx');
 assert.match(workspace,/ProgressPanel/);
 assert.match(living,/Money/);
 assert.match(living,/Store/);
 assert.match(living,/Agreement/);
});
test('merchant checkout experience is distinct from navigating to Store, Money or a Living Agreement',()=>{
 const shell=read('src/App.tsx');
 const nav=read('src/components/NavBar.tsx');
 const living=read('src/features/living-workspace/Phase1LivingWorkspacePreview.tsx');
 assert.doesNotMatch(shell,ban);
 assert.doesNotMatch(nav,ban);
 assert.doesNotMatch(living,ban);
});

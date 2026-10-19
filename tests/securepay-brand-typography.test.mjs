import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const css=source('src/index.css');
const workspace=source('src/features/living-workspace/Phase1LivingWorkspacePreview.tsx');
const assets=source('src/assets/brand/securepay/README.txt');

test('SecurePay typography uses two characterful fonts only in the draft Living Workspace',()=>{
 assert.match(css,/family=Afacad\+Flux/);
 assert.match(css,/family=Bricolage\+Grotesque/);
 assert.match(css,/\.sp-type-signature \{/);
 assert.match(workspace,/className="sp-type-signature(?: sp-brand-shell)? min-h-screen/);
 assert.match(workspace,/data-typography-study="Afacad-Flux-and-Bricolage"/);
 assert.doesNotMatch(css,/body\s*\{\s*font-family: 'Afacad Flux'/);
});
test('Existing production body font remains unchanged',()=>{
 assert.match(css,/body\s*\{\s*font-family: 'Inter'/);
 assert.match(css,/\.font-display \{\s*font-family: 'Fraunces'/);
});
test('The approved SecurePay logo is reused, never replaced with typographic imitation',()=>{
 assert.match(workspace,/import securepayWordmark from '\.\.\/\.\.\/assets\/brand\/securepay\/securepay-wordmark-horizontal\.png'/);
 assert.match(workspace,/<img src=\{securepayWordmark\} alt="SecurePay"/);
 assert.match(assets,/Canonical horizontal SECUREPAY wordmark/);
});
test('Human heading and intro have a considered type hierarchy',()=>{
 assert.match(workspace,/sp-type-display text-xl">KS001/);
 assert.match(source('src/features/living-workspace/WorkspaceWelcome.tsx'),/sp-type-display max-w-lg/);
 assert.match(css,/font-family: 'Bricolage Grotesque'/);
 assert.match(css,/font-family: 'Afacad Flux'/);
});
test('Money numbers and printed Agreements preserve information clarity',()=>{
 assert.match(css,/font-variant-numeric: tabular-nums/);
 assert.match(css,/\.sp-type-signature \[data-agreement-print\] \{\s*font-family: 'Inter'/);
 assert.match(css,/@media print/);
 assert.match(css,/prefers-reduced-motion: reduce/);
});

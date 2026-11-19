import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const mini = readFileSync(new URL('../src/mini/MiniExperience.tsx', import.meta.url),'utf8');
const host = readFileSync(new URL('../src/mini/miniInteractiveDemo.ts', import.meta.url),'utf8');

test('one native Mini mounts Buy, Sell, Pay and full Collect C1-C8 without replacing Human Help',()=>{
  for (const component of ['MiniBuyStore','MiniSellSomething','MiniPaySomeone','C1CollectExperience','MiniHumanHelp']) {
    assert.match(mini,new RegExp('\\b'+component+'\\b'));
  }
  for (const start of ["t.buy","t.sell","t.pay","t.collect"]) assert.ok(mini.includes(start));
  assert.match(mini,/screen === 'collect-full'[^\n]+data-mini-integration-collect-c8/s);
  assert.match(mini,/if \(integrationPreview\) \{ setScreen\('collect-full'\); return; \}/);
  for(const filename of [
    'C1CollectExperience.tsx','C2GovernanceExperience.tsx','C3ProviderPossibilities.tsx',
    'C3ProviderComparison.tsx','C3DClosingPreview.tsx','C4MyContributionStatus.tsx',
    'C5CollectionTypes.tsx','C5BCollectionPeriods.tsx','C6CollectionExamination.tsx',
    'C7MyMoneyLifecycle.tsx'
  ])assert.ok(existsSync(new URL('../src/features/mini-collect/'+filename,import.meta.url)),filename+' missing');
});

test('the richer shared review remains owner preview only; production Mini does not enable fixtures',()=>{
  assert.match(mini,/urlParams\?\.get\('miniIntegrationPreview'\) === '1'/);
  assert.match(mini,/isMiniExperiencePreviewHost\(window.location.hostname\)/);
  assert.match(mini,/playground=\{playground\}/);
  assert.match(mini,/data-mini-playground-banner="fictional"/);
  assert.match(host,/host==='localhost' \|\| host==='127\.0\.0\.1'/);
  assert.match(host,/vercel\\\.app/);
});

test('Mini review keeps C8 independent of payment authorization and preserves correct sell boundary',()=>{
  const c1 = readFileSync(new URL('../src/features/mini-collect/C1CollectExperience.tsx',import.meta.url),'utf8');
  assert.match(c1,/does not create a Collection, Agreement, SecureLink or payment instruction/);
  const sell=readFileSync(new URL('../src/mini/MiniSellSomething.tsx',import.meta.url),'utf8');
  assert.doesNotMatch(sell,/Connect to Money/);
});

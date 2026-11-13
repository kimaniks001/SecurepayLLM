import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  MONEY_OWNER_SAMPLE,MONEY_OWNER_SCHEDULES,moneyOwnerSteps,
} from '../src/mini/miniMoneyOwnerTest.mjs';

const mini=readFileSync('src/mini/MiniExperience.tsx','utf8');
const first=readFileSync('src/mini/MiniFirstPartyKs001.tsx','utf8');
const owner=readFileSync('src/mini/MiniOwnerMoneyTest.tsx','utf8');
const sandbox=readFileSync('src/mini/MiniFundingPreview.tsx','utf8');
const source=readFileSync('src/mini/miniInteractiveDemo.ts','utf8');

test('owner Money sample matches the canonical continuing Amina/Njeri fictional Agreement',()=>{
  assert.equal(MONEY_OWNER_SAMPLE.amountMinor,400000);
  assert.equal(MONEY_OWNER_SAMPLE.publicReference,'DEMO-AGR-041');
  assert.equal(MONEY_OWNER_SAMPLE.moneyStatus,'NOT_FUNDED');
  assert.match(source,/proposedAmountMinor:'400000'/);
  assert.match(source,/publicReference:'DEMO-AGR-041'/);
  assert.match(source,/function miniDemoMoneyFixtureState\(/);
  assert.match(source,/sourceMatches:.*agreementId/);
});

test('full, deposit/balance and milestones reconcile exact principal without payable status',()=>{
  assert.deepEqual(MONEY_OWNER_SCHEDULES.map(s=>s.id),
    ['FULL','DEPOSIT_BALANCE','THREE_MILESTONES']);
  const expected=[
    [400000],
    [120000,280000],
    [120000,160000,120000],
  ];
  MONEY_OWNER_SCHEDULES.forEach((s,i)=>{
    const steps=moneyOwnerSteps(MONEY_OWNER_SAMPLE.amountMinor,s.id);
    assert.deepEqual(steps.map(k=>k.amountMinor),expected[i]);
    assert.equal(steps.reduce((sum,k)=>sum+k.amountMinor,0),400000);
    assert.ok(steps.every(k=>k.payable===false&&k.recorded===false&&
      k.sellerApproved===false&&k.simulationOnly===true));
  });
});

test('minor-unit remainder never silently disappears, invalid inputs fail closed',()=>{
  for(const amount of [101,333,9999,10001]) {
    for(const kind of MONEY_OWNER_SCHEDULES.map(x=>x.id)) {
      const parts=moneyOwnerSteps(amount,kind);
      assert.equal(parts.reduce((sum,p)=>sum+p.amountMinor,0),amount);
    }
  }
  assert.equal(moneyOwnerSteps(-1,'FULL'),null);
  assert.equal(moneyOwnerSteps(0,'FULL'),null);
  assert.equal(moneyOwnerSteps(10,'THREE_MILESTONES'),null);
  assert.equal(moneyOwnerSteps(12345,'UNKNOWN'),null);
});

test('money testing lives only in the existing Mini synthetic preview host and account menu',()=>{
  assert.match(mini,/samplePreviewAllowed && urlParams\?\.get\('demo'\)==='1'/);
  assert.match(first,/new URLSearchParams\(window\.location\.search\)\.get\('moneyTest'\)==='1'/);
  assert.match(first,/const \[moneyOwnerOpen,setMoneyOwnerOpen\] = useState\(\(\)=>demo &&/);
  assert.match(first,/\{demo && <button type="button" className="spm-quiet-button"/);
  assert.match(first,/Test Money · three routes \(simulation\)/);
  assert.match(first,/demo && moneyOwnerOpen/);
  assert.match(first,/!moneyOwnerOpen && <>/);
});

test('sample seller cannot use buyer-side money test; no invented source or provider request',()=>{
  assert.match(first,/buyer=\{sessionState\.tokens\.accessToken==='mini-demo-amina'\}/);
  assert.match(first,/sourceMatches=\{miniDemoMoneyFixtureState\(\)\.sourceMatches\}/);
  assert.match(owner,/if\(chosen&&trialDraft&&buyer&&sourceMatches\)/);
  assert.match(owner,/!buyer&&<p role="status"/);
  assert.match(owner,/only a fictional amount/i);
});

test('existing three-rail simulator remains sole owner Money test state machine',()=>{
  assert.match(owner,/import \{ MiniFundingPreview \} from '\.\/MiniFundingPreview'/);
  assert.match(owner,/<MiniFundingPreview key=\{schedule\+'-'\+stageIndex\}/);
  assert.match(owner,/No real account/);
  assert.match(owner,/NO REAL MONEY/);
  assert.match(sandbox,/MINI_TEST_RAILS\.map/);
  assert.match(sandbox,/SIMULATE_UNKNOWN/);
  assert.match(sandbox,/SIMULATE_FAILED/);
  assert.match(sandbox,/SIMULATE_CONFIRMED/);
  assert.match(sandbox,/No real payment/);
});

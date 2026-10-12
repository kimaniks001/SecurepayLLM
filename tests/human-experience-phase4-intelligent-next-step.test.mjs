import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { build } from 'esbuild';

const bundleOf = async contents => {
  const result = await build({ stdin: { contents, resolveDir: process.cwd() }, bundle: true, write: false, format: 'cjs', platform: 'node', jsx: 'automatic' });
  const mod = { exports: {} };
  new Function('require','module','exports',result.outputFiles[0].text)(createRequire(import.meta.url),mod,mod.exports);
  return mod.exports;
};
const api=await bundleOf("export { resolveAgreementNext } from './src/features/workspace/AgreementNextStep'; export { resolveWorkspaceHumanNext } from './src/features/shell/humanNext';");
const base={actionsKnown:true,nextActions:[],completion:{completed:false,completedAt:null,completedMilestones:0,totalMilestones:1,completedObligations:0,totalObligations:1},nextDate:null,amountLabel:'KES 95,000'};
const action=(actionCode,reason='')=>({actionCode,category:'DO',reason,deadline:null,attentionClass:'ACTION_REQUIRED'});

test('Phase 4: agreed/idle never becomes Money ready without an authoritative action',()=>{
  const next=api.resolveAgreementNext(base);
  assert.equal(next.state,'IDLE'); assert.equal(next.destination,undefined);
  assert.doesNotMatch(next.headline,/fund|pay|release/i);
});

test('Phase 4: FUND_AGREEMENT is the only tested funding signal and opens Money',()=>{
  const next=api.resolveAgreementNext(¶»§q«^
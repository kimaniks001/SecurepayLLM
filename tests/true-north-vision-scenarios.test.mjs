import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';

const file=readFileSync(new URL('../src/features/living-workspace/visionNorthMath.ts',import.meta.url),'utf8');
const code=ts.transpileModule(file,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const exports={};
runInNewContext(code,{exports});
const {visionScenario,initialVisionNumbers}=exports;

test('KES 3 million home, 500k available, 30k monthly, zero growth takes 84 months',()=>{
  const result=visionScenario({...initialVisionNumbers});
  assert.equal(result.gap,2_500_000);
  assert.equal(result.months,84);
  assert.equal(result.monthlyRepayment,0);
});

test('borrowing quote formula uses declining balance and never silently guarantees returns',()=>{
  const result=visionScenario({...initialVisionNumbers,loan:600_000,annualLoanRate:12,loanYears:5});
  assert.ok(result.monthlyRepayment>13000 && result.monthlyRepayment<14000);
  assert.ok(result.totalLoanCost>600000);
  assert.equal(result.remaining,1_900_000);
});

test('zero monthly savings cannot make a no-growth, underfunded goal',()=>{
  const result=visionScenario({...initialVisionNumbers,monthly:0});
  assert.equal(result.months,null);
});

test('already covered goal is immediate, never a negative funding gap',()=>{
  const result=visionScenario({...initialVisionNumbers,goal:300000,saved:500000});
  assert.equal(result.months,0);
  assert.equal(result.gap,0);
});

test('untrusted numeric inputs are bounded and non-finite amounts cannot pass through',()=>{
  const result=visionScenario({...initialVisionNumbers,goal:Number.POSITIVE_INFINITY,
     saved:-10,monthly:Number.NaN,annualReturn:500});
  assert.equal(result.goal,0);
  assert.equal(result.saved,0);
  assert.equal(result.monthly,0);
  assert.equal(result.annualReturn,50);
  assert.ok(Number.isFinite(result.monthlyRepayment));
});

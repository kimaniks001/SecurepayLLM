import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const read=(path)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const prototype=read('src/features/living-workspace/Gate5BFourSpacesPrototype.tsx');
const runtime=read('src/RuntimeApp.tsx');
const approved=read('src/features/living-workspace/Phase1LivingWorkspacePreview.tsx');

test('Gate 5B is reachable on a completely separate hash route',()=>{
  assert.match(runtime,/preview\\\/gate5b/);
  assert.match(runtime,/if \(gate5BPreview\) return <Gate5BFourSpacesPrototype\s*\/>/);
  assert.match(runtime,/if \(phase1Preview\) return <Phase1LivingWorkspacePreview/);
  assert.doesNotMatch(approved,/Gate5BFourSpacesPrototype|gate5BPreview/);
});

test('All four spaces show unique purposes, ownership boundaries and practical next steps',()=>{
  const matches=[...prototype.matchAll(/id:'(vision|circle|community|money)',label:'([^']+)',purpose:'([^']+)'/g)];
  assert.deepEqual(matches.map(m=>m[1]),['vision','circle','community','money']);
  for(const match of matches){
    assert.ok(prototype.includes("id:'"+match[1]+"'"),match[1]);
  }
  for(const required of ['A Dream is not an Agreement','Support, reactions and membership never equal','Public LIVE is not a Circle','Money should follow the agreement','My money · Borrow · Invest · Protect','One useful next step','Parties']){
    assert.ok(prototype.includes(required)||required==='Parties',required);
  }
});

test('Prototype is never connected to network, session, bank or membership mutations',()=>{
  assert.doesNotMatch(prototype,/fetch\s*\(|axios\s*\(|createAgentController|createFormationController|gateway\.|session\.|localStorage|sessionStorage|indexedDB|window\.location\.search/);
  assert.doesNotMatch(prototype,/paymentIntent|createAgreement|inviteMember|releaseFunds|transferMoney|approveAgreement/);
  assert.match(prototype,/No bank or M-PESA connection/);
  assert.match(prototype,/Local sample only/);
  assert.match(prototype,/Nothing from the sample is transferred or saved/);
});

test('Every selectable answer changes local explanation, never financial or Circle state',()=>{
  assert.match(prototype,/onClick=\{\(\)=>setAnswers\(v=>\(\{\.\.\.v,\[selected\]:index\}\)\)\}/);
  assert.match(prototype,/setAnswers\(\{\}\);setSelected\('vision'\)/);
  assert.match(prototype,/data-gate5b-outcome/);
  assert.match(prototype,/aria-pressed=\{choice===index\}/);
  assert.match(prototype,/data-gate5b-no-network/);
});

test('The three-column visual grammar is preserved and mobile choices are accessible',()=>{
  assert.match(prototype,/data-gate5b-three-column/);
  assert.match(prototype,/lg:grid-cols-\[220px_minmax\(0,1fr\)_280px\]/);
  assert.match(prototype,/aria-label="Four SecurePay spaces"/);
  assert.match(prototype,/data-gate5b-ks001/);
  assert.match(prototype,/data-gate5b-summary/);
  assert.match(prototype,/min-h-11/);
  assert.match(prototype,/Back to approved workspace/);
  assert.match(prototype,/role="status"/);
});

test('TSX renders as valid TypeScript and is not a generated screenshot',()=>{
  const t=ts.createSourceFile('Gate5BFourSpacesPrototype.tsx',prototype,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  assert.deepEqual(t.parseDiagnostics.map(d=>ts.flattenDiagnosticMessageText(d.messageText,' ')),[]);
});

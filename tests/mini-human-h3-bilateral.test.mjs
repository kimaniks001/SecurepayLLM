import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { build } from 'esbuild';

const bundle = await build({
  entryPoints: ['src/api/securepay/human-party-submissions/index.ts'],
  platform: 'node', format: 'esm', bundle: true, write: false
});
const module = await import('data:text/javascript;base64,' +
  Buffer.from(bundle.outputFiles[0].text).toString('base64'));

test('H3 only reads exact authenticated Agreement/case/version from shared core', async () => {
  const calls = [];
  const scope = { agreementId:'agr-1', acceptedVersionId:'ver-4', reviewCaseId:'review-7' };
  const gateway = module.createHumanPartySubmissionGateway({
    request: async (path, options) => {
      calls.push({ path, options });
      return { ...scope, reviewCaseState:'AWAITING_RESPONSE',
        partyStatements:[], evidenceSubmissions:[],yourSideSubmitted:false,
        anotherPartySubmitted:false,bothPartiesSubmissionsPresent:false,
        statementsVerified:false,evidenceExamined:false,
        bindingDecisionMade:false,agreementAmended:false,moneyInstructionAuthorized:false };
    }
  });
  const result = await gateway.read(scope);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].path, '/api/v1/human-layer/help/party-submissions');
  assert.equal(calls[0].options.method, 'POST');
  assert.equal(calls[0].options.auth, 'required');
  assert.deepEqual(calls[0].options.body, scope);
  assert.equal(result.statementsVerified, false);
  assert.equal(result.moneyInstructionAuthorized, false);
  await assert.rejects(gateway.read({ ...scope,reviewCaseId:'' }));
  assert.equal(calls.length, 1);
});

test('H3 denies a mismatched case or old version from a stale server response', async () => {
  const scope = { agreementId:'agr-1', acceptedVersionId:'ver-4', reviewCaseId:'review-7' };
  const gateway = module.createHumanPartySubmissionGateway({
    request: async () => ({
      ...scope, reviewCaseId:'a-different-review',
      partyStatements:[], evidenceSubmissions:[]
    })
  });
  await assert.rejects(gateway.read(scope), /Unexpected Agreement or review case context/);
});

test('H3 native case panel is a small optional Mini layer, not another app shell', async () => {
  const [help, caseView, app, styles] = await Promise.all([
    readFile('src/mini/MiniHumanHelp.tsx','utf8'),
    readFile('src/mini/MiniHumanCaseEvidence.tsx','utf8'),
    readFile('src/mini/MiniExperience.tsx','utf8'),
    readFile('src/mini/miniHumanHelp.css','utf8')
  ]);
  assert.match(help, /<MiniHumanCaseEvidence snapshot=\{sampleHumanReview\} sample/);
  assert.match(help, /need === 'problem' \|\| need === 'explain'/);
  assert.match(caseView, /Fictional example — not real SecurePay records/);
  assert.match(caseView, /Not verified/);
  assert.match(caseView, /not examined or confirmed as proof/);
  assert.match(caseView, /No.+here changes the Agreement or authorizes Money/);
  assert.match(caseView, /snapshot\.partyStatements\.map/);
  assert.match(caseView, /gateway\.read\(scope\)/);
  assert.match(caseView, /scope\.reviewCaseId !== value\.reviewCaseId/);
  assert.match(app, /humanPreviewEnabled && screen === 'human-help'/);
  assert.match(styles, /\.spm-human-case-body/);
  assert.doesNotMatch(caseView, /<main|<header|<footer|document\.cookie|sessionStorage|localStorage/);
});

test('H3 remains hidden from unapproved customer domains until shared core is certified', async () => {
  const app = await readFile('src/mini/MiniExperience.tsx', 'utf8');
  assert.match(app, /const humanPreviewEnabled = typeof window !== 'undefined' &&/);
  assert.match(app, /isMiniExperiencePreviewHost\(window\.location\.hostname\)/);
  assert.match(app, /humanPreviewEnabled && !storeOfferSession && !checkoutSession/);
});

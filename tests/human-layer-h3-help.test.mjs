import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';

const bundle = await build({
  entryPoints: ['src/api/securepay/human-help/index.ts'],
  format: 'esm', platform: 'node', bundle: true, write: false
});
const gatewayModule = await import('data:text/javascript;base64,' +
  Buffer.from(bundle.outputFiles[0].text).toString('base64'));

test('H3 uses the canonical authenticated read-only help-triage endpoint', async () => {
  const calls = [];
  const gateway = gatewayModule.createHumanHelpGateway({
    request: async (path, opts) => {
      calls.push({ path, opts });
      return { next:'START_WITH_KS001',serviceRoute:'INCLUDED_AGREEMENT_HELP',
        humanContactEstablished:false,caseOpened:false,agreementChanged:false,moneyAuthorized:false };
    }
  });
  const answer = await gateway.triage({ need:'REVIEW_AGREEMENT', journey:'BUY' });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].path, '/api/v1/human-layer/help/triage');
  assert.equal(calls[0].opts.method, 'POST');
  assert.equal(calls[0].opts.auth, 'required');
  assert.deepEqual(calls[0].opts.body, {
    need:'REVIEW_AGREEMENT',journey:'BUY',agreementId:null,acceptedVersionId:null
  });
  assert.equal(answer.caseOpened, false);
  assert.equal(answer.moneyAuthorized, false);
  await assert.rejects(()=>gateway.triage({
    need:'REVIEW_AGREEMENT',journey:'LIVING_AGREEMENT',
    agreementId:'not-approved'
  }));
  assert.equal(calls.length, 1);
});

test('H3 explicitly routes only through Mini Help and an isolated Mini design review', async () => {
  const paths = [
    'src/RuntimeApp.tsx','src/features/agent/AgentExperience.tsx',
    'src/features/support/SupportExperience.tsx','src/api/securepay/index.ts',
    'src/features/human-layer/MiniH3Review.tsx',
    'src/features/human-layer/MiniHumanHelpPanel.tsx'
  ];
  const [runtime,agent,support,api,review,panel] =
    await Promise.all(paths.map(path=>readFile(path,'utf8')));
  assert.match(runtime,/window.location.hash === '#\/preview\/mini\/h3'/);
  assert.match(runtime,/if \(miniH3Review\) return <MiniH3Review/);
  assert.match(runtime,/humanHelpGateway=\{humanHelpGateway\}/);
  assert.match(agent,/humanHelpGateway=\{humanHelpGateway\}/);
  assert.match(support,/MiniHumanHelpPanel/);
  assert.match(api,/humanHelp: createHumanHelpGateway\(http\)/);
  assert.match(review,/data-mini-h3-review/);
  assert.match(review,/No real messages, human booking, case, deposit, Agreement change or payment/);
  assert.match(panel,/It has not contacted anyone, opened a case, changed an Agreement or authorized Money/);
});

test('Mini H3 review remains separated from the opt-in Living Workspace and H2', async () => {
  const runtime = await readFile('src/RuntimeApp.tsx','utf8');
  assert.match(runtime,/if \(miniH2Review\) return <MiniH2Review/);
  assert.match(runtime,/isCandidateWorkspaceEntry\(_hash:string,_hostname:string\):boolean \{\s*return false;/);
  assert.match(runtime,/#\/preview\/living-workspace/);
  assert.match(runtime,/if \(miniH3Review\) return <MiniH3Review/);
});

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';

// KS001 Upgrade Phase 3 (Bring what you already have) -- source-ingestion controller tests.
const bundle = await build({ stdin: { contents: `
export * from './src/features/sources/controller';
export * from './src/api/securepay/http';
export * from './src/api/securepay';
`, resolveDir: process.cwd() }, bundle: true, write: false, format: 'esm', platform: 'node' });
const api = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);

const artifactDto = (overrides = {}) => ({
  sourceArtifactId: 'src-1', conversationId: 'c1', sourceKind: 'PASTED_TEXT', originalName: '', label: '',
  mediaType: 'text/plain', byteSize: 20, documentType: 'Quotation', extractionStatus: 'READY',
  extractionGeneration: 1, summary: 'A quotation for tank repair.', uncertainties: ['Currency is not stated'],
  failureReason: '', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', ...overrides,
});

function setup(overrides = {}) {
  const calls = [];
  const gateway = {
    createPastedTextSource: async (id, body) => { calls.push(['createPastedTextSource', id, body]); return artifactDto(); },
    uploadSource: async (id, kind, file, label) => { calls.push(['uploadSource', id, kind, file.name, label]); return artifactDto({ sourceKind: kind, originalName: file.name }); },
    listSources: async id => { calls.push(['listSources', id]); return { sources: [artifactDto()] }; },
    getSource: async (id, sourceId) => { calls.push(['getSource', id, sourceId]); return artifactDto(); },
    retrySource: async (id, sourceId) => { calls.push(['retrySource', id, sourceId]); return artifactDto({ extractionGeneration: 2 }); },
    removeSource: async (id, sourceId) => { calls.push(['removeSource', id, sourceId]); return artifactDto({ extractionStatus: 'REMOVED' }); },
    ...overrides,
  };
  let applied = 0;
  const ensureConversationId = async () => { calls.push('ensureConversationId'); return 'c1'; };
  const controller = api.createSourceController(gateway, ensureConversationId, () => { applied++; });
  return { calls, controller, appliedCount: () => applied };
}

test('addPastedText creates the conversation if needed, adds the source, and triggers onSourceApplied', async () => {
  const { controller, calls, appliedCount } = setup();
  const outcome = await controller.addPastedText('ABC Plumbing Ltd, KES 42,000', 'quotation notes');

  assert.equal(outcome.ok, true);
  assert.equal(outcome.source.sourceArtifactId, 'src-1');
  assert.equal(outcome.source.documentType, 'Quotation');
  assert.deepEqual(outcome.source.uncertainties, ['Currency is not stated']);
  assert.deepEqual(calls, ['ensureConversationId', ['createPastedTextSource', 'c1', { text: 'ABC Plumbing Ltd, KES 42,000', label: 'quotation notes' }]]);
  assert.equal(appliedCount(), 1);
  assert.equal(controller.getSnapshot().sources.length, 1);
});

test('addPastedText with blank text does nothing and never calls the gateway', async () => {
  const { controller, calls } = setup();
  const outcome = await controller.addPastedText('   ');
  assert.equal(outcome.ok, false);
  assert.deepEqual(calls, []);
});

test('addUpload sends the real File and reports the resulting artifact', async () => {
  const { controller, calls, appliedCount } = setup();
  const file = new File(['PDF BYTES'], 'quotation.pdf', { type: 'application/pdf' });

  const outcome = await controller.addUpload('DOCUMENT', file, '');

  assert.equal(outcome.ok, true);
  assert.equal(outcome.source.originalName, 'quotation.pdf');
  assert.deepEqual(calls, ['ensureConversationId', ['uploadSource', 'c1', 'DOCUMENT', 'quotation.pdf', '']]);
  assert.equal(appliedCount(), 1);
});

test('an unsupported media type upload surfaces a truthful error, never a fabricated success', async () => {
  const { controller, appliedCount } = setup({
    uploadSource: async () => { throw new api.ApiError('http', 'unsupported', 415, 'AGENT_SOURCE_UNSUPPORTED_MEDIA_TYPE'); },
  });
  const file = new File(['bad'], 'virus.exe', { type: 'application/x-executable' });

  const outcome = await controller.addUpload('DOCUMENT', file);

  assert.equal(outcome.ok, false);
  assert.match(outcome.error, /doesn.t support this file type/);
  assert.equal(appliedCount(), 0);
  assert.equal(controller.getSnapshot().phase, 'error');
});

test('an oversized upload surfaces a truthful error', async () => {
  const { controller } = setup({
    uploadSource: async () => { throw new api.ApiError('http', 'too large', 413, 'AGENT_SOURCE_TOO_LARGE'); },
  });
  const file = new File(['x'], 'huge.jpg', { type: 'image/jpeg' });

  const outcome = await controller.addUpload('PHOTO', file);

  assert.equal(outcome.ok, false);
  assert.match(outcome.error, /too large/);
});

test('list populates sources for the given conversation, never fabricated', async () => {
  const { controller, calls } = setup();
  await controller.list('c1');
  assert.equal(controller.getSnapshot().phase, 'list-ready');
  assert.equal(controller.getSnapshot().sources.length, 1);
  assert.deepEqual(calls, [['listSources', 'c1']]);
});

test('list does nothing when there is no conversation yet -- never creates one merely to list', async () => {
  const { controller, calls } = setup();
  await controller.list(null);
  assert.deepEqual(calls, []);
  assert.equal(controller.getSnapshot().phase, 'idle');
});

test('retry reuses the SAME source id and reports the new generation', async () => {
  const { controller, calls, appliedCount } = setup();
  await controller.retry('c1', 'src-1');
  assert.deepEqual(calls, [['retrySource', 'c1', 'src-1']]);
  assert.equal(controller.getSnapshot().sources[0].extractionGeneration, 2);
  assert.equal(appliedCount(), 1);
});

test('remove marks the source removed but never calls onSourceApplied (nothing new was extracted)', async () => {
  const { controller, calls, appliedCount } = setup();
  await controller.remove('c1', 'src-1');
  assert.deepEqual(calls, [['removeSource', 'c1', 'src-1']]);
  assert.equal(controller.getSnapshot().sources[0].extractionStatus, 'REMOVED');
  assert.equal(appliedCount(), 0);
});

// KS001 Upgrade Phase 3 (Section 65) -- the real HTTP layer: proves an upload is sent as genuine
// multipart form data (the file's real bytes, never a local blob URL or base64-in-JSON), and that
// "success" is only ever reported from the real server response.
test('uploadSource over the real HTTP client sends genuine multipart form data with the real file bytes', async () => {
  const calls = [];
  const client = api.createSecurePayApi('https://api.example', () => null, async (url, init) => {
    calls.push({ url, method: init.method, bodyIsFormData: init.body instanceof FormData, contentTypeHeaderSet: init.headers.has('Content-Type') });
    const form = init.body;
    calls[calls.length - 1].sourceKind = form.get('sourceKind');
    calls[calls.length - 1].fileName = form.get('file').name;
    return new Response(JSON.stringify({
      sourceArtifactId: 'src-1', conversationId: 'c1', sourceKind: 'DOCUMENT', originalName: 'quotation.pdf',
      label: '', mediaType: 'application/pdf', byteSize: 9, documentType: '', extractionStatus: 'RECEIVED',
      extractionGeneration: 0, summary: '', uncertainties: [], failureReason: '',
      createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
    }));
  });
  const file = new File(['PDF BYTES'], 'quotation.pdf', { type: 'application/pdf' });

  const result = await client.agent.uploadSource('c1', 'DOCUMENT', file);

  assert.equal(result.sourceArtifactId, 'src-1');
  assert.equal(calls[0].bodyIsFormData, true);
  // The browser sets its own multipart boundary; this client must never override it with application/json.
  assert.equal(calls[0].contentTypeHeaderSet, false);
  assert.equal(calls[0].sourceKind, 'DOCUMENT');
  assert.equal(calls[0].fileName, 'quotation.pdf');
});

test('an extraction-outage failure never blocks the flow with a misleading generic error', async () => {
  const { controller } = setup({
    createPastedTextSource: async () => { throw new api.ApiError('http', 'unavailable', 503); },
  });
  const outcome = await controller.addPastedText('some plan text');
  assert.equal(outcome.ok, false);
  assert.match(outcome.error, /couldn.t read it right now/);
});

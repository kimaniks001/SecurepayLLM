import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';

// SecurePay Final Completion Phase 5A -- Projects & Agreement Organization (frontend).
// Use Vite's existing esbuild dependency to run pure TypeScript with Node's built-in test runner.
const bundle = await build({ stdin: { contents: `
export * from './src/features/projects/controller';
export * from './src/api/securepay/projects';
export * from './src/api/securepay/http';
`, resolveDir: process.cwd() }, bundle: true, write: false, format: 'esm', platform: 'node' });
const api = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);

const projectDto = (overrides = {}) => ({
  projectId: 'proj-1', ownerKsNumber: 'KS0099', name: 'Karen House', description: 'Build project',
  status: 'ACTIVE', createdAt: '2026-11-01T00:00:00Z', updatedAt: '2026-11-01T00:00:00Z', archivedAt: null, version: 1,
  ...overrides,
});

function fakeGateway(overrides = {}) {
  const calls = [];
  const gateway = {
    create: async body => { calls.push(['create', body]); return projectDto(); },
    list: async (ownerKsNumber, active, query) => { calls.push(['list', ownerKsNumber, active, query]); return { items: [projectDto()] }; },
    get: async id => { calls.push(['get', id]); return projectDto(); },
    update: async (id, body) => { calls.push(['update', id, body]); return projectDto({ name: body.name, version: body.expectedVersion + 1 }); },
    archive: async (id, body) => { calls.push(['archive', id, body]); return projectDto({ status: 'ARCHIVED', version: body.expectedVersion + 1 }); },
    restore: async (id, body) => { calls.push(['restore', id, body]); return projectDto({ status: 'ACTIVE', version: body.expectedVersion + 1 }); },
    addAgreement: async (id, agreementId) => { calls.push(['addAgreement', id, agreementId]); },
    removeAgreement: async (id, agreementId) => { calls.push(['removeAgreement', id, agreementId]); },
    agreements: async id => { calls.push(['agreements', id]); return { items: [] }; },
    summary: async id => { calls.push(['summary', id]); return { projectId: id, ownerKsNumber: 'KS0099', name: 'Karen House', description: null, status: 'ACTIVE', agreementCount: 0, agreementsByStatus: {}, needsAttentionCount: 0, waitingOnOthersCount: 0, takingShapeCount: 0, activeCount: 0, completedCount: 0, cancelledCount: 0, expiredCount: 0, nominalTotalsByCurrency: [], fundedTotalsByCurrency: [], nextUpcomingEventAt: null }; },
    calendar: async id => { calls.push(['calendar', id]); return { events: [] }; },
    ...overrides,
  };
  return { calls, gateway };
}

// ─── Privacy hard lock (frontend mirror of the backend ArchUnit doctrine) ──────────────────────

test('A. No share/invite/participant/member method exists anywhere on the Project gateway', async () => {
  const { gateway } = fakeGateway();
  const methodNames = Object.keys(gateway);
  const forbidden = /share|invit|participant|member|collaborat/i;
  const offending = methodNames.filter(name => forbidden.test(name));
  assert.deepEqual(offending, []);
});

test('B. create() posts exactly ownerKsNumber/name/description -- no invented field', async () => {
  const { gateway, calls } = fakeGateway();
  const controller = api.createProjectsController(gateway);

  const created = await controller.create('KS0099', 'Karen House', 'Build project');

  assert.deepEqual(calls[0], ['create', { ownerKsNumber: 'KS0099', name: 'Karen House', description: 'Build project' }]);
  assert.equal(created.name, 'Karen House');
});

test('C. loadForOwner lists Projects for the given owner KS number and exposes them in state', async () => {
  const { gateway } = fakeGateway();
  const controller = api.createProjectsController(gateway);

  await controller.loadForOwner('KS0099', true);

  assert.equal(controller.getSnapshot().list.status, 'ready');
  assert.equal(controller.getSnapshot().list.data[0].name, 'Karen House');
});

test('D. loadForOwner surfaces a real backend error rather than an empty silent list', async () => {
  const { gateway } = fakeGateway({ list: async () => { throw new api.ApiError('http', 'forbidden', 403, 'ACCESS_DENIED'); } });
  const controller = api.createProjectsController(gateway);

  await controller.loadForOwner('KS0300');

  assert.equal(controller.getSnapshot().list.status, 'error');
  assert.ok(controller.getSnapshot().list.error);
});

test('E. open() loads the Project, summary, Agreements, and calendar together', async () => {
  const { gateway, calls } = fakeGateway();
  const controller = api.createProjectsController(gateway);

  await controller.open('proj-1');

  assert.deepEqual(calls.map(c => c[0]).sort(), ['agreements', 'calendar', 'get', 'summary']);
  const state = controller.getSnapshot().selected;
  assert.equal(state.project.data.projectId, 'proj-1');
  assert.equal(state.summary.status, 'ready');
  assert.equal(state.agreements.status, 'ready');
  assert.equal(state.calendar.status, 'ready');
});

test('F. rename() sends the expectedVersion for optimistic concurrency and updates local state from the real response', async () => {
  const { gateway, calls } = fakeGateway();
  const controller = api.createProjectsController(gateway);
  await controller.open('proj-1');

  await controller.rename('Karen House Phase 2', 'Updated', 1);

  assert.deepEqual(calls.find(c => c[0] === 'update'), ['update', 'proj-1', { name: 'Karen House Phase 2', description: 'Updated', expectedVersion: 1 }]);
  assert.equal(controller.getSnapshot().selected.project.data.name, 'Karen House Phase 2');
});

test('G. archive() and restore() delegate to the gateway with the exact expectedVersion, never a guessed one', async () => {
  const { gateway, calls } = fakeGateway();
  const controller = api.createProjectsController(gateway);
  await controller.open('proj-1');

  await controller.archive(1);
  assert.deepEqual(calls.find(c => c[0] === 'archive'), ['archive', 'proj-1', { expectedVersion: 1 }]);
  assert.equal(controller.getSnapshot().selected.project.data.status, 'ARCHIVED');

  await controller.restore(2);
  assert.deepEqual(calls.find(c => c[0] === 'restore'), ['restore', 'proj-1', { expectedVersion: 2 }]);
  assert.equal(controller.getSnapshot().selected.project.data.status, 'ACTIVE');
});

// ─── Organizational only -- add/remove never claims Agreement authority ────────────────────────

test('H. addAgreement calls the organizational endpoint and reloads the Project detail from the backend afterward', async () => {
  const { gateway, calls } = fakeGateway();
  const controller = api.createProjectsController(gateway);
  await controller.open('proj-1');
  calls.length = 0;

  await controller.addAgreement('agreement-9');

  assert.deepEqual(calls[0], ['addAgreement', 'proj-1', 'agreement-9']);
  // Reloaded afterward -- never assumes the new Agreement summary locally.
  assert.ok(calls.some(c => c[0] === 'agreements'));
  assert.ok(calls.some(c => c[0] === 'summary'));
});

test('I. removeAgreement calls the organizational endpoint only -- never an Agreement-mutating call', async () => {
  const { gateway, calls } = fakeGateway();
  const controller = api.createProjectsController(gateway);
  await controller.open('proj-1');
  calls.length = 0;

  await controller.removeAgreement('agreement-9');

  assert.deepEqual(calls[0], ['removeAgreement', 'proj-1', 'agreement-9']);
});

test('J. a failed addAgreement surfaces an actionable error and does not silently reload as though it succeeded', async () => {
  const { gateway, calls } = fakeGateway({
    addAgreement: async () => { throw new api.ApiError('http', 'not found', 404, 'AGREEMENT_NOT_FOUND'); },
  });
  const controller = api.createProjectsController(gateway);
  await controller.open('proj-1');
  calls.length = 0;

  await controller.addAgreement('agreement-404');

  assert.ok(controller.getSnapshot().selected.actionError);
  assert.equal(calls.filter(c => c[0] === 'agreements').length, 0);
});

test('K. closeSelected clears the selected Project state entirely', async () => {
  const { gateway } = fakeGateway();
  const controller = api.createProjectsController(gateway);
  await controller.open('proj-1');

  controller.closeSelected();

  assert.equal(controller.getSnapshot().selected.projectId, null);
  assert.equal(controller.getSnapshot().selected.project.status, 'idle');
});

test('L. create() is a no-op while already creating (no double-submit)', async () => {
  let resolveCreate;
  const { gateway, calls } = fakeGateway({
    create: async body => { calls.push(['create', body]); return new Promise(resolve => { resolveCreate = () => resolve(projectDto()); }); },
  });
  const controller = api.createProjectsController(gateway);

  const first = controller.create('KS0099', 'Karen House');
  const second = controller.create('KS0099', 'Karen House');
  resolveCreate();
  await Promise.all([first, second]);

  assert.equal(calls.filter(c => c[0] === 'create').length, 1);
});

// ─── Gateway wiring: real endpoints, real HTTP verbs ───────────────────────────────────────────

test('M. the gateway issues PATCH for update and DELETE for removeAgreement against the documented Phase 5A endpoints', async () => {
  const requests = [];
  const http = { request: async (path, options = {}) => { requests.push({ path, method: options.method ?? 'GET' }); return {}; } };
  const gateway = api.createProjectGateway(http);

  await gateway.update('proj-1', { name: 'X', expectedVersion: 1 });
  await gateway.removeAgreement('proj-1', 'agreement-9');
  await gateway.addAgreement('proj-1', 'agreement-9');
  await gateway.archive('proj-1', { expectedVersion: 1 });
  await gateway.calendar('proj-1');

  assert.deepEqual(requests, [
    { path: '/api/v1/projects/proj-1', method: 'PATCH' },
    { path: '/api/v1/projects/proj-1/agreements/agreement-9', method: 'DELETE' },
    { path: '/api/v1/projects/proj-1/agreements/agreement-9', method: 'POST' },
    { path: '/api/v1/projects/proj-1/archive', method: 'POST' },
    { path: '/api/v1/projects/proj-1/calendar', method: 'GET' },
  ]);
});

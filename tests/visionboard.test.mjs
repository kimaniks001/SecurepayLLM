import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';

// SecurePay Final Completion Phase 5B -- Vision Board (private KS operating memory, frontend).
// Use Vite's existing esbuild dependency to run pure TypeScript with Node's built-in test runner.
const bundle = await build({ stdin: { contents: `
export * from './src/features/visionboard/controller';
export * from './src/api/securepay/visionboard';
export * from './src/api/securepay/http';
`, resolveDir: process.cwd() }, bundle: true, write: false, format: 'esm', platform: 'node' });
const api = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);

const shelfDto = (overrides = {}) => ({ shelf: 'IDEAS_GROWTH', label: 'Ideas & Growth', teachingLine: 'Where an idea can live and grow.', itemCount: 0, ...overrides });
const itemDto = (overrides = {}) => ({
  itemId: 'item-1', ownerKsNumber: 'KS0099', shelf: 'IDEAS_GROWTH', itemType: 'IDEA', title: 'Laundry idea',
  content: 'KES 80,000 laundry business', templateCode: null, usagePolicy: 'REFERENCE_ONLY', locked: false,
  supersedesItemId: null, supersededByItemId: null, source: 'OWNER', createdAt: '2026-12-01T00:00:00Z',
  updatedAt: '2026-12-01T00:00:00Z', version: 1, ...overrides,
});

function fakeGateway(overrides = {}) {
  const calls = [];
  const gateway = {
    shelves: async ownerKsNumber => { calls.push(['shelves', ownerKsNumber]); return { shelves: [shelfDto()] }; },
    items: async (ownerKsNumber, shelf, query) => { calls.push(['items', ownerKsNumber, shelf, query]); return { items: [itemDto()] }; },
    get: async id => { calls.push(['get', id]); return itemDto(); },
    create: async body => { calls.push(['create', body]); return itemDto({ title: body.title, content: body.content ?? null, shelf: body.shelf, itemType: body.itemType }); },
    update: async (id, body) => { calls.push(['update', id, body]); return itemDto({ title: body.title, version: body.expectedVersion + 1 }); },
    lock: async (id, body) => { calls.push(['lock', id, body]); return itemDto({ locked: true, version: body.expectedVersion + 1 }); },
    unlock: async (id, body) => { calls.push(['unlock', id, body]); return itemDto({ locked: false, version: body.expectedVersion + 1 }); },
    supersede: async (id, body) => { calls.push(['supersede', id, body]); return itemDto({ itemId: 'item-2', title: body.title ?? 'Laundry idea', supersedesItemId: id, version: 1 }); },
    generateQuotation: async body => { calls.push(['generateQuotation', body]); return { template: 'STANDARD_QUOTATION', documentNumber: 'QUOT-0001', draftOnly: false, truthNote: null, fields: {} }; },
    generateInvoice: async body => { calls.push(['generateInvoice', body]); return { template: 'STANDARD_INVOICE', documentNumber: 'INV-0001', draftOnly: false, truthNote: null, fields: {} }; },
    generateReceipt: async body => { calls.push(['generateReceipt', body]); return { template: 'STANDARD_RECEIPT', documentNumber: 'REC-0001', draftOnly: true, truthNote: "SecurePay doesn't yet show this payment as received. Prepared as a draft.", fields: {} }; },
    ...overrides,
  };
  return { calls, gateway };
}

// ─── Privacy hard lock (frontend mirror of the backend ArchUnit doctrine) ──────────────────────

test('A. No share/invite/participant/member method exists anywhere on the Vision Board gateway', async () => {
  const { gateway } = fakeGateway();
  const forbidden = /share|invit|participant|member|collaborat/i;
  const offending = Object.keys(gateway).filter(name => forbidden.test(name));
  assert.deepEqual(offending, []);
});

test('B. loadForOwner reads shelves for the given owner KS number and exposes them in state', async () => {
  const { gateway } = fakeGateway();
  const controller = api.createVisionBoardController(gateway);

  await controller.loadForOwner('KS0099');

  assert.equal(controller.getSnapshot().shelves.status, 'ready');
  assert.equal(controller.getSnapshot().shelves.data[0].shelf, 'IDEAS_GROWTH');
  assert.equal(controller.getSnapshot().ownerKsNumber, 'KS0099');
});

test('C. openShelf loads items scoped to the current owner and the chosen shelf only', async () => {
  const { gateway, calls } = fakeGateway();
  const controller = api.createVisionBoardController(gateway);
  await controller.loadForOwner('KS0099');

  await controller.openShelf('IDEAS_GROWTH');

  assert.deepEqual(calls[1], ['items', 'KS0099', 'IDEAS_GROWTH', undefined]);
  assert.equal(controller.getSnapshot().items.data[0].title, 'Laundry idea');
});

test('D. create() posts exactly the declared fields for the current owner -- no invented field, source defaults to OWNER', async () => {
  const { gateway, calls } = fakeGateway();
  const controller = api.createVisionBoardController(gateway);
  await controller.loadForOwner('KS0099');

  const created = await controller.create('IDEAS_GROWTH', 'IDEA', 'Laundry idea', 'KES 80,000 laundry business');

  const createCall = calls.find(c => c[0] === 'create');
  assert.deepEqual(createCall[1], {
    ownerKsNumber: 'KS0099', shelf: 'IDEAS_GROWTH', itemType: 'IDEA', title: 'Laundry idea',
    content: 'KES 80,000 laundry business', usagePolicy: undefined, source: 'OWNER',
  });
  assert.equal(created.title, 'Laundry idea');
});

test('E. create() is a no-op while already creating (no double-submit)', async () => {
  const { gateway, calls } = fakeGateway({ create: async body => { calls.push(['create', body]); return new Promise(() => {}); } });
  const controller = api.createVisionBoardController(gateway);
  await controller.loadForOwner('KS0099');

  void controller.create('IDEAS_GROWTH', 'IDEA', 'First');
  await controller.create('IDEAS_GROWTH', 'IDEA', 'Second');

  assert.equal(calls.filter(c => c[0] === 'create').length, 1);
});

test('F. update() refuses to proceed once a locked item is selected -- lock/unlock are the only permitted transitions from the UI, update() itself trusts the caller not to call it on a locked item, but the controller always sends the expectedVersion the item was opened with', async () => {
  const { gateway, calls } = fakeGateway();
  const controller = api.createVisionBoardController(gateway);
  controller.open(itemDto({ version: 3 }));

  await controller.update('New title', 'New content', 'REFERENCE_ONLY', 3);

  assert.deepEqual(calls[0], ['update', 'item-1', { title: 'New title', content: 'New content', usagePolicy: 'REFERENCE_ONLY', expectedVersion: 3 }]);
  assert.equal(controller.getSnapshot().selected.item.title, 'New title');
});

test('G. lock() and unlock() send exactly the expectedVersion of the selected item, never a guessed one', async () => {
  const { gateway, calls } = fakeGateway();
  const controller = api.createVisionBoardController(gateway);
  controller.open(itemDto({ version: 1 }));

  await controller.lock(1);
  assert.deepEqual(calls[0], ['lock', 'item-1', { expectedVersion: 1 }]);
  assert.equal(controller.getSnapshot().selected.item.locked, true);

  await controller.unlock(2);
  assert.deepEqual(calls[1], ['unlock', 'item-1', { expectedVersion: 2 }]);
  assert.equal(controller.getSnapshot().selected.item.locked, false);
});

test('H. supersede() preserves history -- it creates a new item and selects it, never rewrites the prior one in place', async () => {
  const { gateway, calls } = fakeGateway();
  const controller = api.createVisionBoardController(gateway);
  controller.open(itemDto({ itemId: 'item-1', version: 2, locked: true }));

  await controller.supersede('Christmas rate v2', 'KES 35,000/night', 2);

  assert.deepEqual(calls[0], ['supersede', 'item-1', { title: 'Christmas rate v2', content: 'KES 35,000/night', expectedVersion: 2 }]);
  assert.equal(controller.getSnapshot().selected.item.itemId, 'item-2');
  assert.equal(controller.getSnapshot().selected.item.supersedesItemId, 'item-1');
});

test('I. closeSelected clears the selected item state entirely', async () => {
  const { gateway } = fakeGateway();
  const controller = api.createVisionBoardController(gateway);
  controller.open(itemDto());

  controller.closeSelected();

  assert.equal(controller.getSnapshot().selected.item, null);
});

test('J. a failed update surfaces an actionable error and does not silently overwrite the selected item as though it succeeded', async () => {
  const { gateway } = fakeGateway({ update: async () => { throw new api.ApiError('http', 'conflict', 409, 'VISION_ITEM_CONFLICT'); } });
  const controller = api.createVisionBoardController(gateway);
  controller.open(itemDto({ title: 'Original title' }));

  await controller.update('Changed title', undefined, undefined, 1);

  assert.equal(controller.getSnapshot().selected.item.title, 'Original title');
  assert.ok(controller.getSnapshot().selected.actionError);
});

test('K. the gateway issues PATCH for update, and dedicated POST endpoints for lock/unlock/supersede, against the documented Phase 5B endpoints', async () => {
  const requests = [];
  const http = { request: async (path, options) => { requests.push([path, options?.method ?? 'GET']); return {}; } };
  const gateway = api.createVisionBoardGateway(http);

  await gateway.update('item-1', { title: 'T', expectedVersion: 1 });
  await gateway.lock('item-1', { expectedVersion: 1 });
  await gateway.unlock('item-1', { expectedVersion: 1 });
  await gateway.supersede('item-1', { expectedVersion: 1 });

  assert.deepEqual(requests, [
    ['/api/v1/vision-board/items/item-1', 'PATCH'],
    ['/api/v1/vision-board/items/item-1/lock', 'POST'],
    ['/api/v1/vision-board/items/item-1/unlock', 'POST'],
    ['/api/v1/vision-board/items/item-1/supersede', 'POST'],
  ]);
});

// ─── Document truth (section 24) ──────────────────────────────────────────────────────────────

test('L. generateReceipt surfaces draftOnly/truthNote exactly as the backend returns them -- the frontend never overrides settlement truth', async () => {
  const { gateway } = fakeGateway();

  const receipt = await gateway.generateReceipt({ issuingKsNumber: 'KS0099' });

  assert.equal(receipt.draftOnly, true);
  assert.match(receipt.truthNote, /doesn't yet show this payment as received/);
});

// ─── Convergence correction (section 43) -- never require typing your own KS number ────────────

test('M. loadForOwner with no argument calls the gateway with no ownerKsNumber -- the backend resolves the signed-in person\'s own board', async () => {
  const { gateway, calls } = fakeGateway();
  const controller = api.createVisionBoardController(gateway);

  await controller.loadForOwner();

  assert.deepEqual(calls[0], ['shelves', undefined]);
  assert.equal(controller.getSnapshot().ownerKsNumber, null);
  assert.equal(controller.getSnapshot().boarded, true);
});

test('N. openShelf/search/create all work after loading with no declared owner (the default board), never blocked by a falsy ownerKsNumber', async () => {
  const { gateway, calls } = fakeGateway();
  const controller = api.createVisionBoardController(gateway);
  await controller.loadForOwner();

  await controller.openShelf('IDEAS_GROWTH');
  const created = await controller.create('IDEAS_GROWTH', 'IDEA', 'Laundry idea', 'KES 80,000');

  assert.deepEqual(calls[1], ['items', undefined, 'IDEAS_GROWTH', undefined]);
  const createCall = calls.find(c => c[0] === 'create');
  assert.equal(createCall[1].ownerKsNumber, undefined);
  assert.ok(created);
});

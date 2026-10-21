import test from 'node:test';
import assert from 'node:assert/strict';
import { default as agentRelay } from '../api/preview-agent.js';
import { default as workspaceRelay } from '../api/preview-workspace.js';

function response() {
  return {
    statusCode: 200, headers: {}, payload: '',
    setHeader(name, value) { this.headers[name] = value; },
    end(value) { this.payload = value; },
  };
}

for (const [name, handler, path] of [
  ['KS001 conversation', agentRelay, '/api/agent/conversations'],
  ['Workspace membership', workspaceRelay, '/api/v1/community/circles/abcdefgh/coordination-prompts'],
]) {
  for (const method of ['POST', 'PATCH', 'PUT', 'DELETE']) {
    test(name + ' preview rejects ' + method + ' against production upstream', async () => {
      const req = {
        method, headers: { host: 'securepay-test.vercel.app', origin: 'https://securepay-test.vercel.app' },
        query: { path }, body: {},
      };
      const res = response();
      await handler(req, res);
      assert.equal(res.statusCode, 403);
      assert.match(res.payload, /Preview writes disabled/);
    });
  }
}

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const owner = readFileSync(new URL('../src/api/securepay/embed/index.ts',import.meta.url),'utf8');
const settings = readFileSync(new URL('../src/features/embed/EmbedOwnerSettings.tsx',import.meta.url),'utf8');
const api = readFileSync(new URL('../src/api/securepay/index.ts',import.meta.url),'utf8');
const app = readFileSync(new URL('../src/RuntimeApp.tsx',import.meta.url),'utf8');
const agent = readFileSync(new URL('../src/features/agent/AgentExperience.tsx',import.meta.url),'utf8');
const settingsExperience = readFileSync(new URL('../src/features/settings/SettingsExperience.tsx',import.meta.url),'utf8');
const guest = readFileSync(new URL('../public/embed/securepay-guest-agent.js',import.meta.url),'utf8');

test('all owner installation management methods require existing signed-in SecurePay identity',()=>{
  assert.match(owner,/auth:'required'/);
  assert.match(owner,/\/api\/v1\/embed\/installations/);
  assert.match(owner,/method:'PATCH'/);
  assert.doesNotMatch(guest,/\/api\/v1\/embed\/installations[^/]/);
  assert.doesNotMatch(guest,/Authorization/);
  assert.doesNotMatch(guest,/getAccessToken/);
  assert.match(settings,/monthlyTurnLimit/);
  assert.match(settings,/visitorDailyLimit/);
});
test('private settings page exposes owner controls without embedding them in Estate or changing masterpiece shell',()=>{
  assert.match(api,/createEmbedOwnerGateway/);
  assert.match(app,/withSessionRefresh\(api\.embedOwner/);
  assert.match(agent,/embedOwnerGateway=\{embedOwnerGateway\}/);
  assert.match(settingsExperience,/<EmbedOwnerSettings gateway=\{embedOwnerGateway\}/);
  assert.doesNotMatch(guest,/\/settings.+PATCH/);
});
test('public guest client follows site-bound endpoints and never unmetered agent endpoints',()=>{
  assert.match(guest,/securepay-embed-guest-v3/);
  assert.match(guest,/\/api\/v1\/public\/embed\/installations\//);
  assert.doesNotMatch(guest,/['"]\/api\/agent\/conversations/);
});

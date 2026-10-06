import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const community = fs.readFileSync(new URL('../src/features/community/CommunityExperience.tsx', import.meta.url), 'utf8');

test('project formation starts with a human intention rather than a heavy project form', () => {
  assert.match(community, /Declare the intention/);
  assert.match(community, /What are you trying to do\?/);
  assert.match(community, /Why does it matter\?/);
  assert.match(community, /What would you like to see happen\?/);
  assert.match(community, /What do you want from the Community\?/);
});

test('community participation is kept separate from materials equipment and funding', () => {
  assert.match(community, /Materials, equipment and funding are organised separately/);
  assert.match(community, /people, skills, labour, knowledge and presence/);
});

test('project participants can prepare practical help without making the organiser a travel agent', () => {
  assert.match(community, /should not make the organiser your travel agent/);
  assert.match(community, /Find practical services/);
  assert.match(community, /Ask for Plug coordination/);
  assert.match(community, /prepareProject\(item\.id,'STORE'\)/);
  assert.match(community, /prepareProject\(item\.id,'PLUG'\)/);
});

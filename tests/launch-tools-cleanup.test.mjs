import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const shell = read('src/features/living-workspace/Phase1LivingWorkspacePreview.tsx');
const personas = read('src/features/living-workspace/personas.ts');
const quick = read('src/features/living-workspace/QuickSupportPanel.tsx');
const store = read('src/features/living-workspace/StoresTool.tsx');

const catalogue = shell.match(/const tools = \[([\s\S]*?)\] as const;/)?.[1];
test('Launch Add tray has eight working tools and Photos first', () => {
  assert.ok(catalogue, 'missing working tools catalogue');
  const names = [...catalogue.matchAll(/name: '([^']+)'/g)].map(match => match[1]);
  assert.deepEqual(names, ['Photos','Documents','Places','Date & Time','Quick Assist','Stores','People & Invitations','Money']);
  assert.equal(names.length, 8);
  assert.match(shell, /activeTool==='Date & Time'/);
  for (const removed of ['More tools','Milestones','Vision tools','Community & Circles','Quick Support']) {
    assert.ok(!names.includes(removed), 'placeholder visible: ' + removed);
  }
});

test('Tool picker opens from Add and mobile Tools rather than reopening the last selected tool', () => {
  assert.match(shell, /function openToolPicker\(\)/);
  assert.match(shell, /onClick=\{openToolPicker\}/);
  assert.match(shell, /aria-label="Add or use a tool"/);
  assert.match(shell, /id==='tools'\?openToolPicker\(\):setScreen\(id\)/);
  assert.match(shell, /aria-label="Choose a tool"/);
});

test('Tools are arranged by work rather than in a long undifferentiated list', () => {
  assert.match(shell, /aria-label="Add something"/);
  assert.match(shell, /aria-label="Get something done"/);
  assert.match(shell, /tools\.filter\(t=>t\.group==='add'\)/);
  assert.match(shell, /tools\.filter\(t=>t\.group==='do'\)/);
  assert.match(shell, /grid grid-cols-3 gap-2/);
  assert.match(shell, /grid grid-cols-2 gap-2/);
});

test('Every launch tool opens an actual bounded tool surface, not the old descriptive placeholder', () => {
  for (const component of ['UniversalSourceTray','PeopleInvitationsTool','StoresTool','UnifiedMoneyTool','QuickSupportPanel']) {
    assert.match(shell, new RegExp(component));
  }
  assert.doesNotMatch(shell, /Preview only: no external action or private data sharing is performed here/);
  assert.match(shell, /This tool is unavailable\. Return to your tools/);
});

test('KS001 suggestions do not send holders into nonexistent tools', () => {
  assert.match(shell, /const tools = \[/);
  assert.doesNotMatch(shell, /setMessages\(/, 'No fabricated KS001 turn');
  for (const name of ['Vision tools','Community & Circles','Milestones','Quick Support']) {
    assert.ok(!personas.includes("tool:'"+name+"'"), 'retired recommendation: ' + name);
  }
  assert.match(personas, /tool:'Quick Assist'/);
});

test('Launch cleanup preserves existing provider, Agreement and money boundaries', () => {
  assert.match(shell, /activeTool==='Money'\?<UnifiedMoneyTool/);
  assert.match(shell, /activeTool==='Stores'\?<StoresTool/);
  assert.match(shell, /activeTool==='Quick Assist'\?<QuickSupportPanel/);
  assert.match(store, /id:'contract',label:'Quick Contract'/);
  assert.match(quick, /No booking or payment is made/);
  assert.match(shell, /bookings, invitations and money require their own authorisation/);
});

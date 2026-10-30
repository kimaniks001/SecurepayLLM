import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const timelineSource = source('src/features/living-workspace/communityTimeline.ts');
const hub = source('src/features/living-workspace/InlineCommunityHub.tsx');
const discovery = source('src/features/living-workspace/communityDiscovery.ts');
const gateway = source('src/api/securepay/community/index.ts');

const transpiled = ts.transpileModule(timelineSource, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText;
const { buildCommunityTimeline } = await import('data:text/javascript;base64,' + Buffer.from(transpiled).toString('base64'));

const input = () => ({
  live: [], contributions: [], help: [], projects: [], events: [], learning: [],
});

test('Gate 1: timeline combines authorised sources by recorded creation time, not type or popularity', () => {
  const rows = input();
  rows.projects.push({
    id:'p1',circleId:null,status:'ACTIVE',title:'Repair a tank',purpose:'Work with neighbours',
    locationLabel:'Ruiru',createdAt:'2026-10-25T10:00:00Z',
  });
  rows.live.push({
    id:'s1',circleId:null,status:'ACTIVE',objectType:'WORK_STORY',authorDisplayName:'A member',
    title:'A work story',body:'A lesson',locationLabel:null,createdAt:'2026-10-25T14:00:00Z',
  });
  rows.help.push({
    id:'o1',circleId:null,status:'OPEN',title:'Help needed',description:'Discuss the work',
    locationLabel:null,skillsNeeded:[],createdAt:'2026-10-26T10:00:00Z',
  });
  rows.contributions.push({
    id:'c1',circleId:null,status:'ACTIVE',contributionType:'LESSON_LEARNED',
    title:'What we learned',body:'Publicly shared learning',hasOrigin:true,
    createdAt:'2026-10-24T10:00:00Z',
  });
  assert.deepEqual(buildCommunityTimeline(rows).map(item=>item.key),
    ['opportunity:o1','post:s1','project:p1','contribution:c1']);
});

test('Gate 1: Circle-private, closed, removed and cancelled records never enter LIVE', () => {
  const rows = input();
  rows.live.push(
    {id:'private',circleId:'circle-1',status:'ACTIVE',objectType:'DISCUSSION',title:'Private'},
    {id:'closed',circleId:null,status:'CLOSED',objectType:'DISCUSSION',title:'Closed'},
  );
  rows.contributions.push(
    {id:'private-c',circleId:'circle-1',status:'ACTIVE',title:'Private contribution'},
    {id:'removed-c',circleId:null,status:'REMOVED',title:'Removed contribution'},
  );
  rows.help.push({id:'cancelled',circleId:null,status:'CANCELLED',title:'Cancelled'});
  rows.projects.push({id:'private-p',circleId:'circle-1',status:'ACTIVE',title:'Private project'});
  rows.events.push({id:'private-e',circleId:'circle-1',status:'CONFIRMED',title:'Private event'});
  rows.learning.push({id:'private-a',circleId:'circle-1',status:'PROPOSED',title:'Private training'});
  assert.deepEqual(buildCommunityTimeline(rows),[]);
});

test('Gate 1: event schedule is not publication time; unknown timestamps sort last', () => {
  const rows = input();
  rows.events.push({
    id:'e1',circleId:null,status:'CONFIRMED',title:'Learn together',description:'Community gathering',
    startsAt:'2026-12-01T09:00:00Z',createdAt:'2026-10-20T09:00:00Z',locationLabel:null,
  });
  rows.projects.push({
    id:'p2',circleId:null,status:'ACTIVE',title:'Something new',purpose:'Join the effort',
    createdAt:'2026-10-26T09:00:00Z',locationLabel:null,
  });
  rows.contributions.push({
    id:'no-time',circleId:null,status:'ACTIVE',contributionType:'REFLECTION',
    title:'Undated',body:'Not a fabricated time',createdAt:'',hasOrigin:false,
  });
  const result=buildCommunityTimeline(rows);
  assert.deepEqual(result.map(x=>x.key),['project:p2','event:e1','contribution:no-time']);
  assert.equal(result[1].createdAt,'2026-10-20T09:00:00Z');
  assert.match(result[1].detail,/Scheduled:/);
});

test('Gate 1: Workspace uses existing membership and bounded authorised gateway; no shadow feed', () => {
  assert.match(hub,/membership\.me\(\)/);
  assert.match(hub,/active&&<>/);
  assert.match(hub,/community\.feed\(25,0\)/);
  assert.match(hub,/community\.contributions\.live\(25,0\)/);
  assert.match(hub,/community\.serviceOpportunities\.list\(25,0\)/);
  assert.match(hub,/community\.projects\.list\(25,0\)/);
  assert.match(hub,/buildCommunityTimeline\(/);
  assert.match(hub,/data-community-live-timeline/);
  assert.match(hub,/page==='home'\?timelinePanel\(\)/);
  assert.match(hub,/role="group" aria-label="Filter Community activity"/);
  assert.match(hub,/Some Community updates could not be verified/);
  assert.match(discovery,/communityLiveContributions/);
  assert.match(discovery,/row\.circleId===null && row\.status==='ACTIVE'/);
  assert.match(gateway,/\/api\/v1\/community\/contributions\/live/);
});

test('Gate 1: live details follow existing authorised routes, with truthful demo and privacy language', () => {
  assert.match(hub,/item\.kind==='post'\?openLive\(item\.sourceId\):openParticipation\(\)/);
  assert.match(hub,/No activity in this view yet/);
  assert.match(hub,/Preview.*sample|sample preview/i);
  assert.match(hub,/Private Circle activity is excluded/);
  assert.doesNotMatch(timelineSource,/confidenceScore|popularityScore|trustScore|pretendFunded/);
  assert.doesNotMatch(timelineSource,/\bpaymentReady\b|\bescrow\b/);
});

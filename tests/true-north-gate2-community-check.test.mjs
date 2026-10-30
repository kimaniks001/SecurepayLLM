import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source=(path)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const helper=source('src/features/living-workspace/communityCheckDiscovery.ts');
const panel=source('src/features/living-workspace/CommunityCheckPanel.tsx');
const shell=source('src/features/living-workspace/Phase1LivingWorkspacePreview.tsx');
const discovery=source('src/features/living-workspace/communityDiscovery.ts');
const community=source('src/api/securepay/community/index.ts');
const transpiled=ts.transpileModule(helper,{
  compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext},
}).outputText;
const {matchCommunityCircles,matchCommunityOpportunities}=await import(
  'data:text/javascript;base64,'+Buffer.from(transpiled).toString('base64')
);

const circle=(id,overrides={})=>({
  id,name:id,purpose:'Local repair and construction knowledge',
  membershipMode:'REQUEST_TO_JOIN',visibility:'PUBLIC',
  status:'ACTIVE',categoryLabel:'Practical skills',locationLabel:'Ruiru',
  memberCount:3,createdAt:'2026-10-01T09:00:00Z',
  updatedAt:'2026-10-01T09:00:00Z',closedAt:null,
  creatorCanonicalKsNumber:null,creatorDisplayName:null,...overrides,
});
const choice=(overrides={})=>({
  purpose:'explore',interests:'',skills:'',area:'',availability:'unspecified',...overrides,
});

test('Gate 2: never discover a private, closed or archived Circle from personal words',()=>{
  const rows=[
    circle('public'),circle('secret',{visibility:'PRIVATE'}),
    circle('closed',{status:'CLOSED'}),circle('archived',{status:'ARCHIVED'}),
    circle('quiet',{status:'QUIET'}),
  ];
  assert.deepEqual(matchCommunityCircles(rows,choice({interests:'repair'}))
    .map(result=>result.circle.id),['public']);
  assert.match(discovery,/row.visibility==='PUBLIC' && row.status==='ACTIVE'/);
});

test('Gate 2: only matching published descriptions explain relevance',()=>{
  const rows=[
    circle('woodwork',{name:'A Carpentry Circle',purpose:'Teaching carpentry by making stools'}),
    circle('gardens',{name:'Neighbourhood Garden',purpose:'Grow vegetables and learn planting'}),
    circle('unspecified',{name:'Unknown subject',purpose:'No skill statement'}),
  ];
  const matching=matchCommunityCircles(rows,choice({skills:'carpentry'}));
  assert.deepEqual(matching.map(x=>x.circle.id),['woodwork']);
  assert.match(matching[0].reasons.join(' '),/Published description mentions/);
  assert.doesNotMatch(matching[0].reasons.join(' '),/verified|qualified|accepted|paid/i);
});

test('Gate 2: explicit preferred area is a public label filter, not inferred location',()=>{
  const rows=[
    circle('ruiru',{locationLabel:'Ruiru, Kiambu'}),
    circle('elsewhere',{locationLabel:'Nakuru'}),
    circle('no-area',{locationLabel:null}),
  ];
  assert.deepEqual(matchCommunityCircles(rows,choice({area:'Ruiru'}))
    .map(x=>x.circle.id),['ruiru']);
});

test('Gate 2: self-declared availability does not falsely imply Circle schedule fit',()=>{
  const rows=[circle('repair-group')];
  const weekday=matchCommunityCircles(rows,choice({availability:'weekdays'}));
  const weekend=matchCommunityCircles(rows,choice({availability:'weekends'}));
  assert.deepEqual(weekday,weekend);
  assert.match(panel,/Circle schedules are not verified by this discovery service/);
});

test('Gate 2: opportunities are real public OPEN records, never funded-job claims',()=>{
  const items=[
    {id:'public',circleId:null,status:'OPEN',title:'Carpentry help',description:'Repair desks',skillsNeeded:['Carpentry'],locationLabel:'Ruiru'},
    {id:'private',circleId:'circle-one',status:'OPEN',title:'Carpentry help',description:'Private',skillsNeeded:['Carpentry'],locationLabel:'Ruiru'},
    {id:'cancelled',circleId:null,status:'CANCELLED',title:'Carpentry',description:'Withdrawn',skillsNeeded:[],locationLabel:'Ruiru'},
  ];
  assert.deepEqual(matchCommunityOpportunities(items,choice({skills:'carpentry'}))
    .map(x=>x.opportunity.id),['public']);
  assert.match(panel,/Payment and funding have not been verified/);
});

test('Gate 2: explicit opt-in and privacy state are local; no profiling or accidental membership',()=>{
  assert.match(panel,/useState<CommunityDiscoveryChoice>\(initial\)/);
  assert.match(panel,/These choices stay in this view/);
  assert.match(panel,/not published, sent to a Circle, or saved/);
  assert.match(panel,/membership\.me\(\)/);
  assert.match(panel,/membership.status!=='ACTIVE'/);
  assert.match(panel,/circles\.discover\(50,0\)/);
  assert.match(panel,/circles\.myInvitations\(25,0\)/);
  assert.match(panel,/circles\.mine\(25,0\)/);
  assert.doesNotMatch(panel,/localStorage|sessionStorage|navigator\.geolocation|window\.fetch|createAgreement|acceptInvitation|\.join\(/);
  assert.doesNotMatch(helper,/confidenceScore|profileRank|KS001Conversation|agreementSource/);
});

test('Gate 2: right Check retains the approved Living Workspace and existing Circle entry',()=>{
  assert.match(shell,/<CommunityCheckPanel/);
  assert.match(shell,/mode==='community'/);
  assert.match(shell,/storeCircleEntry\(circleId\)/);
  assert.match(shell,/mode==='community'\?'Community Check'/);
  assert.match(panel,/data-community-check/);
  assert.match(panel,/What needs your attention\?/);
  assert.match(panel,/One meaningful next step/);
  assert.match(panel,/Discover relevant Circles/);
  assert.match(panel,/Demo|Demonstration only/);
  assert.match(community,/\/api\/v1\/community\/circles/);
});

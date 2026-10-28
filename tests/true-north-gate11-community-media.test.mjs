import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const component=source('src/features/community/InlineCommunityMedia.tsx');
const story=source('src/features/community/TrustProjectImpactHome.tsx');
const detail=source('src/components/CommunityObjectDetail.tsx');
const controller=source('src/features/community/controller.ts');
const experience=source('src/features/community/CommunityExperience.tsx');
const gateway=source('src/api/securepay/community/index.ts');
const timeline=source('src/features/living-workspace/InlineCommunityHub.tsx');

test('Gate 1.1: Camera, Photo, PDF are contextual to story and reply composers',()=>{
  for(const label of ['Camera','Photo','PDF','Caption (optional)','Upload attachment'])
    assert.ok(component.includes(label),label);
  assert.match(story,/<InlineCommunityMedia gateway=\{gateway\}/);
  assert.match(experience,/mediaComposer: <InlineCommunityMedia gateway=\{communityGateway\}/);
  assert.match(detail,/\{realReply\.mediaComposer\}/);
});
test('Gate 1.1: uploads stay private until publication and failed uploads cannot be posted',()=>{
  assert.match(component,/Upload received · not yet published/);
  assert.match(component,/Upload or confirm each selected attachment before publishing/);
  assert.match(component,/status:unknown\?'unknown':'error'/);
  assert.match(component,/key:item\.key|item\.key\)/);
  assert.match(story,/attachedCommunityMedia\(attachments\)/);
  assert.match(story,/attachments\.some\(x=>x\.status!=='uploaded'\)/);
  assert.match(experience,/replyAttachments\.every\(item=>item\.status==='uploaded'\)/);
});
test('Gate 1.1: uses canonical authenticated Community storage and existing reply intent',()=>{
  assert.match(gateway,/\/api\/v1\/community\/media/);
  assert.match(gateway,/multipart|FormData/);
  assert.match(gateway,/responseKind:'blob'/);
  assert.match(gateway,/auth:'required'/);
  assert.match(controller,/async submitReply\(media:/);
  assert.match(controller,/state\.replyDraft\.idempotencyKey,media/);
  assert.match(story,/idempotencyKey:publishKey\.current/);
  assert.doesNotMatch(component,/uploadSource\(|dreamsGateway|agreementEvidence|escrow/);
});
test('Gate 1.1: published attachments are viewed only through scoped authenticated bytes',()=>{
  assert.match(timeline,/CommunityAttachmentView/);
  assert.match(story,/CommunityAttachmentView/);
  assert.match(experience,/renderReplyMedia=/);
  assert.match(detail,/renderReplyMedia\?\.\(resp\.id\)/);
  assert.match(component,/gateway\.media\.content\(id\)/);
  assert.match(component,/URL\.revokeObjectURL/);
  assert.doesNotMatch(component,/window\.location\s*=|localStorage\.setItem/);
});

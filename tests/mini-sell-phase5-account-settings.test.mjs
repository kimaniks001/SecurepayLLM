import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const settings=fs.readFileSync(new URL('../src/mini/MiniSellerAccountSettings.tsx',import.meta.url),'utf8');
const store=fs.readFileSync(new URL('../src/mini/MiniSellerStore.tsx',import.meta.url),'utf8');
const shell=fs.readFileSync(new URL('../src/mini/MiniFirstPartyKs001.tsx',import.meta.url),'utf8');

test('settings are explicitly opened by seller, never automatic role or plan changes',()=>{
  assert.ok(store.includes('setSettingsOpen(v=>!v)'));
  assert.ok(store.includes('Store settings & permissions'));
  assert.ok(store.includes('{settingsOpen&&<MiniSellerAccountSettings'));
  for(const prohibited of [
    'subscriptionGateway.selectPlan(','businessGateway.inviteMember(',
    'businessGateway.removeMember(','subscriptionGateway.initiateVerificationTransfer(',
    'gateway.publishMyTextOffer('
  ])assert.equal(settings.includes(prohibited),false,prohibited);
});
test('current Business representation is fetched from server, not assumed from the selected KS Number',()=>{
  assert.ok(settings.includes('businessGateway.representation(businessKsNumber)'));
  assert.ok(settings.includes("b.identityType==='BUSINESS'&&b.canActFor&&b.relationship==='ADMINISTRATOR'"));
  assert.ok(settings.includes("representation==='unavailable'"));
  assert.ok(settings.includes('Business Agreements require their own verified authority'));
});
test('account subscription is read only and not misrepresented as Business-specific payment authority',()=>{
  assert.ok(settings.includes('subscriptionGateway.myStatus()'));
  assert.ok(settings.includes('memberState===\'unavailable\''));
  assert.ok(settings.includes('not proof of Business-specific billing'));
  assert.ok(settings.includes('No subscription or payment has been started'));
  assert.equal(settings.includes("monthlyFeeMinor:20000"),false);
  assert.equal(settings.includes("monthlyFeeMinor:10000"),false);
});
test('first-party shell never supplies subscription gateway to sample demo',()=>{
  assert.ok(shell.includes('subscriptionGateway={demo?undefined:subscriptions}'));
  assert.ok(shell.includes('createSubscriptionGateway(http)'));
  assert.ok(store.includes('setSettingsOpen(false)'));
});
test('settings use canonical Store counts instead of fabricated stock or social data',()=>{
  assert.ok(store.includes('publicOffers={opened.raw.filter(o=>o.published).length}'));
  assert.ok(store.includes('privateOffers={opened.raw.filter(o=>!o.published).length}'));
  assert.ok(store.includes("unconfirmedOffers={opened.raw.filter(o=>o.availabilityState==='NEEDS_CONFIRMATION').length}"));
  assert.ok(settings.includes('community directory permissions'));
});

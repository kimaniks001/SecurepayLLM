import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const css = fs.readFileSync(new URL('../src/index.css', import.meta.url), 'utf8');
const home = fs.readFileSync(new URL('../src/components/SignedInHome.tsx', import.meta.url), 'utf8');
const nav = fs.readFileSync(new URL('../src/components/NavBar.tsx', import.meta.url), 'utf8');
const agreement = fs.readFileSync(new URL('../src/components/AgreementDetail.tsx', import.meta.url), 'utf8');
const store = fs.readFileSync(new URL('../src/components/StoreManagementHome.tsx', import.meta.url), 'utf8');
const money = fs.readFileSync(new URL('../src/features/money/SimpleMoneyDashboard.tsx', import.meta.url), 'utf8');
const vision = fs.readFileSync(new URL('../src/features/visionboard/VisionBoardExperience.tsx', import.meta.url), 'utf8');
const community = fs.readFileSync(new URL('../src/features/community/CommunityExperience.tsx', import.meta.url), 'utf8');

test('Masterpiece design language has warmth, material depth and restrained progress motion', () => {
  for (const token of ['sp-life-canvas','sp-hero','sp-primary-action','sp-action-tile','sp-progress-fill']) {
    assert.match(css, new RegExp('\\.' + token));
  }
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /spResolve/);
  assert.match(css, /spSettle/);
});

test('Home begins with possibility and routes every quick start through the real KS001 entry', () => {
  assert.match(home, /What do you want to make/);
  assert.match(home, /sp-real-word">real/);
  for (const label of ['Plan','Compare','Prepare Agreement','Find People']) assert.ok(home.includes(label), label);
  assert.match(home, /onClick=\{\(\) => onStart\(prompt\)\}/);
  assert.match(home, /attentionItems\.length \+ invitations\.length/);
  assert.match(home, /recentActivity\.length \+ upcomingEvents\.length/);
  assert.doesNotMatch(home, /\b28 Orders\b|\b16 Leads\b|\$120,000/);
});

test('mobile navigation keeps five obvious life destinations and preserves quiet account/notification reachability', () => {
  const mobileStart = nav.indexOf('const mobileNavItems');
  const mobileEnd = nav.indexOf('];', mobileStart);
  const mobile = nav.slice(mobileStart, mobileEnd);
  for (const label of ['Home','Vision','Agreements','Store','Community']) assert.ok(mobile.includes(`label: '${label}'`), label);
  assert.doesNotMatch(mobile, /label: 'Money'/);
  assert.doesNotMatch(mobile, /label: 'Account'/);
  assert.match(nav, /aria-label="Notifications"/);
  assert.match(nav, /aria-label="Account"/);
  assert.match(nav, /onNavigate\('account'\)/);
  assert.match(nav, /onNavigate\('notifications'\)/);
});

test('Agreement mobile starts with four human questions and keeps the full record behind them', () => {
  for (const label of ['Overview','People','Money','Milestones']) assert.match(agreement, new RegExp(`label: '${label}'`));
  assert.match(agreement, /Full Agreement record/);
  assert.match(agreement, /Documents · changes · calendar · support/);
  assert.match(agreement, /Living Agreement/);
  assert.match(agreement, /AgreementStatusBadge/);
});

test('My Store beauty is derived from real Store authority rather than fabricated commerce metrics', () => {
  assert.match(store, /published\.length/);
  assert.match(store, /drafts\.length/);
  assert.match(store, /needsAvailabilityCheck\.length/);
  assert.match(store, /opportunities\.length/);
  assert.match(store, /What people can find/);
  assert.match(store, /store\.verified/);
  assert.match(store, /store\.serviceAreas/);
  assert.doesNotMatch(store, />Orders</);
  assert.doesNotMatch(store, />Leads</);
  assert.doesNotMatch(store, /Response rate/);
});

test('Money entered from an Agreement keeps that Agreement dominant and still reads backend authority', () => {
  assert.match(money, /Money for this Agreement/);
  assert.match(money, /open=\{!handoff\}/);
  assert.match(money, /You are already looking at the Agreement you came from/);
  assert.match(money, /snapshotGateway\.read\(selected\.agreementId\)/);
  assert.match(money, /snapshot\.paymentReady/);
  assert.match(money, /snapshot\.movement\.state/);
  assert.match(money, /snapshot\.releaseRequest\.authorityGranted/);
  assert.doesNotMatch(money, /fund automatically|release automatically|money moves automatically/i);
});

test('Vision, Money and Community share the living canvas without changing domain authority', () => {
  assert.match(vision, /sp-life-canvas/);
  assert.match(vision, /What are you trying to move forward/);
  assert.match(vision, /Find what it needs/);
  assert.match(vision, /Make it clear/);
  assert.match(money, /sp-life-canvas|sp-hero/);
  assert.match(community, /sp-life-canvas/);
});

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';

const [app, human, styles, nativeCss, entry] = await Promise.all([
  readFile('src/mini/MiniExperience.tsx','utf8'),
  readFile('src/mini/MiniHumanHelp.tsx','utf8'),
  readFile('src/mini/miniHumanHelp.css','utf8'),
  readFile('src/mini/mini.css','utf8'),
  readFile('mini.html','utf8')
]);

test('H3 is inside the original Mini application and original 366px frame', () => {
  assert.match(entry,/\/src\/mini\/main\.tsx/);
  assert.match(app,/className=\{'spm-root spm-clean'/);
  assert.match(app,/className="spm-frame"/);
  assert.match(app,/className="spm-head"/);
  assert.match(app,/className="spm-main"/);
  assert.match(app,/className="spm-footer"/);
  assert.match(app,/screen === 'human-help' && <MiniHumanHelp/);
  assert.match(nativeCss,/\.spm-frame\s*\{[^}]*max-width:366px/);
  assert.doesNotMatch(human,/className=".*min-h-dvh|<main|<header|<footer/);
});

test('H3 inherits Mini choice cards, action buttons, typography and identity', () => {
  for (const cssClass of ['spm-persona','spm-question','spm-lead','spm-actions','spm-option',
     'spm-option-icon','spm-option-text','spm-quote','spm-back','spm-primary','spm-secondary']) {
    assert.match(nativeCss,new RegExp('\\.'+cssClass+'\\b'));
    assert.ok(human.includes(cssClass),'H3 must reuse '+cssClass);
  }
  assert.match(app,/\/brand\/securepay-mark-green\.png/);
  assert.match(app,/Trust is the currency/);
  assert.match(app,/Checkout by/);
  assert.doesNotMatch(styles,/(^|\n)\s*(?::root|\.spm-root|\.spm-frame|\.spm-head|\.spm-footer)\s*\{/);
  assert.match(human,/import '\.\/miniHumanHelp\.css'/);
});

test('H3 uses the same journey names and selectable answer pills', () => {
  for(const label of ['Buy something','Sell something','Pay someone or something','Collect money',
    'Need a hand?','Ask KS001']) assert.ok(human.includes(label),label);
  assert.match(human,/aria-pressed=\{answer === option\}/);
  assert.match(human,/disabled=\{!answer\}/);
  assert.match(human,/onBack: \(\) => void/);
});

test('H3 is a separate opt-in Mini preview and never becomes a fake financial authority', () => {
  assert.match(app,/window\.location\.hash === '#\/preview\/mini\/h3'/);
  assert.match(app,/isMiniExperiencePreviewHost\(window\.location\.hostname\)/);
  assert.match(app,/onClick=\{openHumanHelp\}/);
  assert.match(app,/setHelpReturnScreen\(screen\)/);
  assert.match(app,/payVisited \|\| screen === 'pay-home'/);
  assert.match(human,/No real person was contacted, no case was opened/);
  assert.doesNotMatch(human,/fetch\(|localStorage|sessionStorage|authorizeMoney|approveAgreement/);
});

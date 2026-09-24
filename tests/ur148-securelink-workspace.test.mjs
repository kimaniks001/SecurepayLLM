import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';

// KS001 Upgrade Phase 5 continuation (Slice 4, UR-148) -- the post-SET moment no longer offers a doomed
// "Create SecureLink" affordance (a freshly-SET Agreement is always DRAFT, and product activation can
// never succeed until it is proposed, a counterparty joins, and both sides confirm -- see the Phase 5
// Slice 4 addendum for the full archaeology). This covers the PERSISTENT Agreement workspace SecureLink
// entry point that replaces it, and the creator-confirmation UX fix it depends on.
const bundle = await build({ stdin: { contents: `
export { AgreementSecureLinkSection } from './src/features/securelink/AgreementSecureLinkSection';
export { ownStanding } from './src/features/amendments/ReconfirmPanel';
export { createElement } from 'react';
export { renderToStaticMarkup } from 'react-dom/server';
`, resolveDir: process.cwd() }, bundle: true, write: false, format: 'cjs', platform: 'node', jsx: 'automatic' });
const mod = { exports: {} };
new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(createRequire(import.meta.url), mod, mod.exports);
const api = mod.exports;
const markup = (component, props) => api.renderToStaticMarkup(api.createElement(component, props));
const text = value => value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');

function unreachableGateway() {
  return {
    activateProduct: async () => { throw new Error('must never be called before eligibility'); },
    issuePublicLocator: async () => { throw new Error('must never be called before eligibility'); },
    activeLocator: async () => { throw new Error('must never be called before eligibility'); },
    rotatePublicLocator: async () => { throw new Error('must never be called before eligibility'); },
    revokePublicLocator: async () => { throw new Error('must never be called before eligibility'); },
  };
}

// ---------------------------------------------------------------- AgreementSecureLinkSection.tsx

test('AgreementSecureLinkSection: a DRAFT/PROPOSED/INVITATION_PENDING Agreement is told honestly to wait, and the gateway is never touched', () => {
  for (const status of ['DRAFT', 'PROPOSED', 'INVITATION_PENDING']) {
    const html = text(markup(api.AgreementSecureLinkSection, {
      agreementId: 'agr-1', agreementTitle: 'Tile the bathroom', agreementStatus: status, gateway: unreachableGateway(),
    }));
    assert.match(html, /SecureLink/);
    assert.match(html, /once someone has joined/i);
    assert.doesNotMatch(html, /Create SecureLink/); // the creation form is never shown before eligibility
  }
});

test('AgreementSecureLinkSection: PARTICIPANTS_JOINING/CONFIRMATION_PENDING are eligible -- the initial render checks for an existing SecureLink rather than assuming none exists', () => {
  for (const status of ['PARTICIPANTS_JOINING', 'CONFIRMATION_PENDING']) {
    const html = text(markup(api.AgreementSecureLinkSection, {
      agreementId: 'agr-1', agreementTitle: 'Tile the bathroom', agreementStatus: status, gateway: unreachableGateway(),
    }));
    assert.match(html, /Checking for an existing SecureLink/i);
  }
});

test('AgreementSecureLinkSection: CANCELLED/EXPIRED and any unrecognized status stay ineligible (fail closed, never guessed as eligible)', () => {
  for (const status of ['CANCELLED', 'EXPIRED', 'SOMETHING_UNKNOWN']) {
    const html = text(markup(api.AgreementSecureLinkSection, {
      agreementId: 'agr-1', agreementTitle: 'Tile the bathroom', agreementStatus: status, gateway: unreachableGateway(),
    }));
    assert.doesNotMatch(html, /Checking for an existing SecureLink/i);
  }
});

test('AgreementSecureLinkSection: reuses Slice 2\'s own unmodified SecureLink components -- no second SecureLink frontend', async () => {
  const source = await readFile(new URL('../src/features/securelink/AgreementSecureLinkSection.tsx', import.meta.url), 'utf8');
  assert.match(source, /import \{ createSecureLinkCreateController \} from '\.\/createController'/);
  assert.match(source, /import \{ createSecureLinkManageController \} from '\.\/manageController'/);
  assert.match(source, /import \{ SecureLinkManagePanel \} from '\.\/SecureLinkManagePanel'/);
  assert.doesNotMatch(source, /activateProduct\(/); // never calls the gateway directly -- only through the existing controllers
  assert.doesNotMatch(source, /issuePublicLocator\(/);
});

test('AgreementSecureLinkSection: eligibility is exactly the two statuses AgreementProductService#requireActivatable accepts -- no invented third status', async () => {
  const source = await readFile(new URL('../src/features/securelink/AgreementSecureLinkSection.tsx', import.meta.url), 'utf8');
  const eligibleLine = source.split('\n').find(l => l.includes('const eligible ='));
  assert.match(eligibleLine, /PARTICIPANTS_JOINING/);
  assert.match(eligibleLine, /CONFIRMATION_PENDING/);
});

// ---------------------------------------------------------------- ReconfirmPanel.tsx -- ownStanding (UR-148 creator confirmation)

test('ownStanding: CREATOR now gets real standing through the exact same mechanism a recipient already uses', () => {
  const row = { participantId: 'p1', identityId: 'i', roleCode: 'CREATOR', participantStatus: 'CREATOR', confirmedVersionId: null, confirmedVersionNumber: null, currentVersionId: 'v1', currentVersionNumber: 1, confirmationCurrent: false, reconfirmationRequired: true };
  assert.ok(api.ownStanding([row], 'CREATOR'));
});

test('ownStanding: an already-current creator confirmation still yields nothing to do (never re-prompted needlessly)', () => {
  const row = { participantId: 'p1', identityId: 'i', roleCode: 'CREATOR', participantStatus: 'CREATOR', confirmedVersionId: 'v1', confirmedVersionNumber: 1, currentVersionId: 'v1', currentVersionNumber: 1, confirmationCurrent: true, reconfirmationRequired: false };
  assert.equal(api.ownStanding([row], 'CREATOR'), null);
});

test('ownStanding: an unrecognized/invited-only status still gets nothing -- widening to CREATOR did not widen to everyone', () => {
  const row = { participantId: 'p1', identityId: 'i', roleCode: 'X', participantStatus: 'INVITED', confirmedVersionId: null, confirmedVersionNumber: null, currentVersionId: 'v1', currentVersionNumber: 1, confirmationCurrent: false, reconfirmationRequired: true };
  assert.equal(api.ownStanding([row], 'INVITED'), null);
});

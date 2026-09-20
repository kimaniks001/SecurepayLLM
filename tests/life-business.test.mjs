import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';

// ─── A. Projects' string-backed proposedAmountMinor no longer goes through Number(...) ─────────────────────────

test('A. ProjectsExperience renders the per-Agreement string-backed proposedAmountMinor through the shared precision-safe formatter, never Number(...)', async () => {
  const contents = await readFile('src/features/projects/ProjectsExperience.tsx', 'utf8');
  assert.doesNotMatch(contents, /Number\(a\.proposedAmountMinor\)/, 'must not coerce the string-backed per-Agreement amount through Number(...)');
  assert.match(contents, /decimalMoney\(a\.proposedAmountMinor,\s*a\.currency\)/, 'must render the per-Agreement amount through the shared precision-safe formatter');
});

// ─── B. Project ≠ Agreement, Vision ≠ Project: no cross-domain authority call ─────────────────────────

test('B1. No Projects/Vision Board feature or gateway file calls Agreement join/confirm/payment authority', async () => {
  const forbidden = /\.join\(|\.confirmVersion\(|\.pay\(|\.release\(|\.fund\(|\.exercise\(/;
  for (const file of [
    'src/features/projects/controller.ts', 'src/features/projects/ProjectsExperience.tsx', 'src/api/securepay/projects/index.ts',
    'src/features/visionboard/controller.ts', 'src/features/visionboard/VisionBoardExperience.tsx', 'src/api/securepay/visionboard/index.ts',
  ]) {
    const contents = await readFile(file, 'utf8');
    assert.doesNotMatch(contents, forbidden, `${file} must never call Agreement join/confirm/payment authority`);
  }
});

test('B2. Vision Board feature files never import from the Project feature/api, and vice versa -- the backend keeps these two domains structurally isolated (see PROJECT_MANAGE/VISION_BOARD_MANAGE doctrine)', async () => {
  const visionController = await readFile('src/features/visionboard/controller.ts', 'utf8');
  const visionExperience = await readFile('src/features/visionboard/VisionBoardExperience.tsx', 'utf8');
  const projectController = await readFile('src/features/projects/controller.ts', 'utf8');
  const projectExperience = await readFile('src/features/projects/ProjectsExperience.tsx', 'utf8');
  assert.doesNotMatch(visionController, /from ['"].*\/projects/i);
  assert.doesNotMatch(visionExperience, /from ['"].*\/projects/i);
  assert.doesNotMatch(projectController, /from ['"].*\/visionboard/i);
  // ProjectsExperience legitimately renders an "Open my Vision Board" navigation link (task section 15) --
  // that is a plain onOpenVisionBoard callback prop, never an import of the Vision Board feature/api itself.
  assert.doesNotMatch(projectExperience, /from ['"].*\/visionboard\/(controller|VisionBoardExperience)['"]/i);
});

test('B3. No Vision Board create/update/supersede call carries a projectId, and no Project create/update call carries a Vision item id -- confirming no invented cross-domain field', async () => {
  const visionGatewayDto = await readFile('src/api/securepay/visionboard/dto.ts', 'utf8');
  const projectDto = await readFile('src/api/securepay/projects/dto.ts', 'utf8');
  assert.doesNotMatch(visionGatewayDto, /projectId/i);
  assert.doesNotMatch(projectDto, /visionItemId|visionBoardId/i);
});

// ─── C. Recovery does not widen authority ─────────────────────────

test('C1. Recovery gateway calls exactly the real, previously-unwired AuthenticationController recovery endpoints, with no role/permission/organization field anywhere in the request bodies', async () => {
  const contents = await readFile('src/api/securepay/auth/index.ts', 'utf8');
  assert.match(contents, /\/api\/v1\/auth\/recovery\/request/);
  assert.match(contents, /\/api\/v1\/auth\/recovery\/verify/);
  assert.match(contents, /\/api\/v1\/auth\/recovery\/reset/);
  assert.doesNotMatch(contents, /roleCode|organizationId|permission/i, 'recovery/password endpoints must never carry an authority-shaped field');
});

test('C2. RecoveryExperience never denies or unconditionally confirms that a KS Number exists -- the copy matches the backend\'s own enumeration-resistant design (a hedged "if that KS Number exists..." is correct; "does not exist"/"was not found" is not)', async () => {
  const contents = await readFile('src/features/recovery/RecoveryExperience.tsx', 'utf8');
  assert.doesNotMatch(contents, /ks number (does not exist|was not found|is invalid|could not be found)/i);
  assert.match(contents, /if that ks number exists/i);
  assert.match(contents, /never confirms whether/i);
});

test('C3. RecoveryExperience never claims Business membership, delegated authority, or Agreement/Money authority is restored by a password reset', async () => {
  const contents = await readFile('src/features/recovery/RecoveryExperience.tsx', 'utf8');
  assert.match(contents, /does not (restore|touch)/i);
});

// ─── D. Business acting capacity is backend-backed, never inferred from UI location ─────────────────────────

test('D1. authoritySummary is called with only an organizationId -- the backend resolves the caller\'s own identity server-side; the frontend never supplies or requests a different identity\'s summary', async () => {
  const contents = await readFile('src/api/securepay/authorization/index.ts', 'utf8');
  assert.match(contents, /authoritySummary:\s*\(organizationId: string\)/);
  assert.doesNotMatch(contents, /authoritySummary:.*identityId/);
});

test('D2. Business Home never claims a role assignment takes effect immediately -- it is real maker-checker (initiate only), never a same-step grant', async () => {
  const contents = await readFile('src/features/business/BusinessExperience.tsx', 'utf8');
  assert.match(contents, /approve/i);
  assert.doesNotMatch(contents, /role (has been|is now) (granted|assigned)/i);
});

test('D3. Business/Account controllers never derive what a person can do from which screen they are on -- every permission list is sourced only from an authoritySummary read, never a client-side computed set', async () => {
  for (const file of ['src/features/business/controller.ts', 'src/features/account/controller.ts']) {
    const contents = await readFile(file, 'utf8');
    assert.doesNotMatch(contents, /permissions\s*[:=]\s*\[/, `${file} must never construct its own permissions array`);
  }
});

// ─── E. Developer/Connect never invents credentials, and never calls the application-authenticated surfaces ─────────────────────────

test('E1. The Developer gateway never wires DeveloperSandboxController or DeveloperMoneySessionController -- both authenticate as an application (client-id/secret), not a signed-in KS person, which this web app cannot do', async () => {
  const contents = await readFile('src/api/securepay/developer/index.ts', 'utf8');
  assert.doesNotMatch(contents, /\/developer\/sandbox/);
  assert.doesNotMatch(contents, /\/developer\/money-sessions/);
});

test('E2. No credential, client secret, or webhook signing secret is hardcoded anywhere in the Developer feature -- every secret value rendered comes from a live gateway response field, never a literal string', async () => {
  const controller = await readFile('src/features/developer/controller.ts', 'utf8');
  const experience = await readFile('src/features/developer/DeveloperExperience.tsx', 'utf8');
  const suspiciousLiteral = /(secret|clientId|signingSecret)\s*[:=]\s*['"][^'"]{6,}['"]/i;
  assert.doesNotMatch(controller, suspiciousLiteral);
  assert.doesNotMatch(experience, suspiciousLiteral);
});

test('E3. DeveloperExperience discloses that sandbox simulation and hosted Money sessions happen from the developer\'s own backend, never offering a working "simulate" action inside this app', async () => {
  const contents = await readFile('src/features/developer/DeveloperExperience.tsx', 'utf8');
  assert.match(contents, /your own backend/i);
  assert.doesNotMatch(contents, /Simulate/);
});

// ─── F. No local-only durable Project/Business/Vision association is presented as backend truth ─────────────────────────

test('F1. Account never persists Business-membership or identity facts to localStorage/sessionStorage -- every value is re-read from the gateway each time', async () => {
  for (const file of ['src/features/account/controller.ts', 'src/features/business/controller.ts', 'src/features/developer/controller.ts', 'src/features/settings/controller.ts', 'src/features/recovery/controller.ts']) {
    const contents = await readFile(file, 'utf8');
    assert.doesNotMatch(contents, /localStorage|sessionStorage/);
  }
});

test('F2. The Business Home\'s role-assignment protectedActionId is disclosed as session-local only, never presented as a durable "approvals inbox"', async () => {
  const contents = await readFile('src/features/business/controller.ts', 'utf8');
  assert.match(contents, /session-local only/i);
});

// ─── G. No new frontend-invented financial/ranking/health-score metric ─────────────────────────

test('G. No new Phase 5 feature file computes a health/readiness/completeness score, or a rank/rating/reputation field', async () => {
  const forbidden = /health.?score|readiness.?score|completeness.?%|\brank(ing)?\b|\brating\b|\breputation\b/i;
  for (const file of [
    'src/features/account/controller.ts', 'src/features/account/AccountExperience.tsx',
    'src/features/business/controller.ts', 'src/features/business/BusinessExperience.tsx',
    'src/features/developer/controller.ts', 'src/features/developer/DeveloperExperience.tsx',
    'src/features/settings/controller.ts', 'src/features/settings/SettingsExperience.tsx',
    'src/features/recovery/controller.ts', 'src/features/recovery/RecoveryExperience.tsx',
  ]) {
    const contents = await readFile(file, 'utf8');
    assert.doesNotMatch(contents, forbidden, `${file} must not invent a score/ranking metric`);
  }
});

// ─── H. Navigation convergence ─────────────────────────

test('H1. NavBar\'s Account item routes to the real account destination, never back to signed-in Home', async () => {
  const contents = await readFile('src/components/NavBar.tsx', 'utf8');
  assert.match(contents, /label:\s*'Account',\s*view:\s*'account'/);
});

test('H2. AppView includes exactly the five new Phase 5 destinations', async () => {
  const contents = await readFile('src/types.ts', 'utf8');
  for (const view of ["'account'", "'settings'", "'recovery'", "'business'", "'developer'"]) {
    assert.match(contents, new RegExp(view.replace(/'/g, "'")));
  }
});

test('H3. Recovery is reachable while signed out (the entire point of account recovery), unlike Account/Settings/Business/Developer which are all authenticated-only', async () => {
  const contents = await readFile('src/features/agent/AgentExperience.tsx', 'utf8');
  assert.match(contents, /if \(recoveryView\) \{[\s\S]*?return <RecoveryExperience/);
});

// ─── I. No Phase 5 feature imports fixture/demo data into the production bundle ─────────────────────────

test('I. No new Phase 5 feature file imports a *Data.ts fixture module', async () => {
  const forbidden = /from ['"].*(storeData|circleData|communityData|ecosystemData|moneyData|demoData|milestoneData|disputeData|offerTradeSnapshot)['"]/;
  for (const file of [
    'src/features/account/AccountExperience.tsx', 'src/features/business/BusinessExperience.tsx',
    'src/features/developer/DeveloperExperience.tsx', 'src/features/settings/SettingsExperience.tsx',
    'src/features/recovery/RecoveryExperience.tsx',
  ]) {
    const contents = await readFile(file, 'utf8');
    assert.doesNotMatch(contents, forbidden, `${file} must not import fixture/demo data into a real route`);
  }
});

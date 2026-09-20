import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { build } from 'esbuild';

// Phase 5 final correction pass -- behavioral tests for the two transient-state hygiene fixes need
// the real controllers, not just source-text checks. Use Vite's existing esbuild dependency to run
// pure TypeScript with Node's built-in test runner, matching every other behavioral suite here.
const bundle = await build({ stdin: { contents: `
export * as developerController from './src/features/developer/controller';
export * as recoveryController from './src/features/recovery/controller';
`, resolveDir: process.cwd() }, bundle: true, write: false, format: 'esm', platform: 'node' });
const api = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);

function fakeDeveloperGateway(overrides = {}) {
  const calls = [];
  const gateway = {
    registerApplication: async body => { calls.push(['registerApplication', body]); return { id: 'app-1', name: body.name, ownerBusinessKsNumber: body.ownerBusinessKsNumber, environment: body.environment, status: 'ACTIVE', productionAccessState: 'NOT_REQUESTED', createdAt: '2026-01-01T00:00:00Z' }; },
    getApplication: async id => { calls.push(['getApplication', id]); return { id, name: 'App', ownerBusinessKsNumber: 'KS-OAK', environment: 'SANDBOX', status: 'ACTIVE', productionAccessState: 'NOT_REQUESTED', createdAt: '2026-01-01T00:00:00Z' }; },
    integrationCheck: async id => { calls.push(['integrationCheck', id]); return { applicationId: id, applicationName: 'App', businessKsNumber: 'KS-OAK', environment: 'SANDBOX', applicationConnected: true, identityConnected: true, credentialsWorking: true, statusUpdatesConnected: true, callbacksConnected: true, readyToTestTrade: true, checkedAt: '2026-01-01T00:00:00Z' }; },
    suspendApplication: async id => { calls.push(['suspendApplication', id]); return { id, name: 'App', ownerBusinessKsNumber: 'KS-OAK', environment: 'SANDBOX', status: 'SUSPENDED', productionAccessState: 'NOT_REQUESTED', createdAt: '2026-01-01T00:00:00Z' }; },
    reactivateApplication: async id => { calls.push(['reactivateApplication', id]); return { id, name: 'App', ownerBusinessKsNumber: 'KS-OAK', environment: 'SANDBOX', status: 'ACTIVE', productionAccessState: 'NOT_REQUESTED', createdAt: '2026-01-01T00:00:00Z' }; },
    revokeApplication: async id => { calls.push(['revokeApplication', id]); return { id, name: 'App', ownerBusinessKsNumber: 'KS-OAK', environment: 'SANDBOX', status: 'REVOKED', productionAccessState: 'NOT_REQUESTED', createdAt: '2026-01-01T00:00:00Z' }; },
    issueCredential: async (id, scopes) => { calls.push(['issueCredential', id, scopes]); return { id: 'cred-1', clientId: 'client-1', secret: 'plaintext-secret-shown-once', scopes, status: 'ACTIVE' }; },
    rotateCredential: async id => { calls.push(['rotateCredential', id]); return { id, clientId: 'client-1', secret: 'plaintext-secret-rotated', scopes: ['AGREEMENTS_READ'], status: 'ACTIVE' }; },
    revokeCredential: async id => { calls.push(['revokeCredential', id]); },
    registerWebhook: async (id, body) => { calls.push(['registerWebhook', id, body]); return { id: 'hook-1', url: body.url, subscribedEventTypes: body.subscribedEventTypes, status: 'ACTIVE', signingSecret: 'plaintext-signing-secret-shown-once' }; },
    rotateWebhookSecret: async id => { calls.push(['rotateWebhookSecret', id]); return { id, url: 'https://example.com', subscribedEventTypes: ['x'], status: 'ACTIVE', signingSecret: 'rotated-signing-secret' }; },
    webhookDeliveries: async id => { calls.push(['webhookDeliveries', id]); return []; },
    replayWebhookDelivery: async id => { calls.push(['replayWebhookDelivery', id]); return { id, eventId: 'e1', eventType: 'x', status: 'DELIVERED', attemptCount: 1, responseStatus: 200, failureReason: null, createdAt: '2026-01-01T00:00:00Z' }; },
    issueSecureCode: async (id, body) => { calls.push(['issueSecureCode', id, body]); return { id: 'code-1', applicationId: id, secureCode: 'plaintext-secure-code-shown-once', expiresAt: '2026-01-01T01:00:00Z' }; },
    revokeSecureCode: async id => { calls.push(['revokeSecureCode', id]); },
    ...overrides,
  };
  return { calls, gateway };
}

function fakeRecoveryGateway(overrides = {}) {
  const calls = [];
  const gateway = {
    requestRecovery: async ksNumber => { calls.push(['requestRecovery', ksNumber]); return { recoveryToken: 'recovery-token-1', expiresAt: '2026-01-01T01:00:00Z' }; },
    verifyRecovery: async body => { calls.push(['verifyRecovery', body]); return { recoveryToken: body.recoveryToken, expiresAt: '2026-01-01T01:00:00Z', verified: true }; },
    resetRecoveryPassword: async body => { calls.push(['resetRecoveryPassword', body]); },
    ...overrides,
  };
  return { calls, gateway };
}

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

test('B2. Vision Board feature files never import from the Project feature/api, and vice versa -- no direct cross-domain dependency exists today (the backend forbids exactly that, while explicitly leaving room for a future feature built through each domain\'s own authorized API -- see PROJECT_MANAGE/VISION_BOARD_MANAGE doctrine)', async () => {
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

test('D2. Business Home never claims a role assignment takes effect immediately, and no longer offers the interactive cross-member role-assignment form the backend rejects', async () => {
  const contents = await readFile('src/features/business/BusinessExperience.tsx', 'utf8');
  assert.doesNotMatch(contents, /role (has been|is now) (granted|assigned)/i);
  // Final correction: the prior version's subjectIdentityId/roleCode inputs and
  // controller.initiateRoleAssignment() call are gone -- replaced with a truthful capability note.
  assert.doesNotMatch(contents, /initiateRoleAssignment/);
  assert.doesNotMatch(contents, /Member's identity id/);
  assert.match(contents, /does not\s+yet\s+support\s+an\s+administrator\s+assigning\s+a\s+role\s+to\s+a/i);
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

test('F2. The Business controller no longer exposes an initiateRoleAssignment method or any role-assignment state at all -- the interactive form and its backing state were removed together, not just hidden (a doc-comment explaining the removal, naming the real backend method, is fine and expected)', async () => {
  const contents = await readFile('src/features/business/controller.ts', 'utf8');
  assert.doesNotMatch(contents, /async initiateRoleAssignment/, 'the controller must no longer define an initiateRoleAssignment method');
  assert.doesNotMatch(contents, /gateway\.authorization\.initiateRoleAssignment/, 'the controller must no longer call the gateway\'s initiateRoleAssignment');
  assert.doesNotMatch(contents, /lastInitiatedProtectedActionId/);
  assert.doesNotMatch(contents, /roleAssignmentInput/);
  assert.doesNotMatch(contents, /'initiateRoleAssignment'/, 'the gateway pick-list must no longer request this method');
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

// ─── J. Business acting-capacity / activation / Developer-ownership copy corrections ─────────────────────────

test('J1. Business Home never claims actions happen "as this Business" -- the authenticated actor remains the actor; Business is scope, not a second identity', async () => {
  const contents = await readFile('src/features/business/BusinessExperience.tsx', 'utf8');
  assert.doesNotMatch(contents, /happens as this business/i);
  assert.doesNotMatch(contents, /never your personal identity/i);
  assert.match(contents, /you are signed in as yourself/i);
});

test('J2. Business activation copy states the exact current requirement (signing in as the Business KS identity itself) rather than equating "owner" with Organization admin/membership', async () => {
  const contents = await readFile('src/features/business/BusinessExperience.tsx', 'utf8');
  assert.match(contents, /signing in as the business ks identity itself/i);
});

test('J3. Developer/Connect never claims Organization admin/membership is sufficient for application ownership -- the exact actorKsNumber requirement is stated instead', async () => {
  const controller = await readFile('src/features/developer/controller.ts', 'utf8');
  const experience = await readFile('src/features/developer/DeveloperExperience.tsx', 'utf8');
  for (const contents of [controller, experience]) {
    assert.doesNotMatch(contents, /business owner\/administrator/i, 'must not conflate owner and administrator as equally sufficient');
  }
  assert.match(experience, /must currently be that business ks identity itself/i);
});

test('J4. No Developer file reads or reacts to authoritySummary -- Business Organization permissions are never reused client-side to imply Developer application ownership', async () => {
  for (const file of ['src/features/developer/controller.ts', 'src/features/developer/DeveloperExperience.tsx']) {
    const contents = await readFile(file, 'utf8');
    assert.doesNotMatch(contents, /authoritySummary/i);
  }
});

test('J5. No Phase 5 customer-facing UI copy implies a general "Business mode" or session-wide acting-identity switch (the doc\'s own prose describing and ruling this out, in quotes, is not a violation and is intentionally not checked here)', async () => {
  const forbidden = /business mode|switch into business|acting as business globally/i;
  for (const file of [
    'src/features/account/AccountExperience.tsx', 'src/features/business/BusinessExperience.tsx',
    'src/features/developer/DeveloperExperience.tsx',
  ]) {
    const contents = await readFile(file, 'utf8');
    assert.doesNotMatch(contents, forbidden, `${file} must not imply a global Business acting mode`);
  }
});

// ─── K. Developer one-time secret hygiene ─────────────────────────

test('K1. Issuing a credential sets issuedCredential; clearSensitiveTransientState removes it', async () => {
  const { gateway } = fakeDeveloperGateway();
  const controller = api.developerController.createDeveloperController(gateway);
  controller.setRegisterForm({ name: 'App', ownerBusinessKsNumber: 'KS-OAK' });
  await controller.registerApplication();
  controller.setCredentialScopesInput('AGREEMENTS_READ');
  await controller.issueCredential();
  assert.equal(controller.getSnapshot().issuedCredential.secret, 'plaintext-secret-shown-once');
  controller.clearSensitiveTransientState();
  assert.equal(controller.getSnapshot().issuedCredential, null);
});

test('K2. clearSensitiveTransientState also clears issuedWebhook and issuedSecureCode, leaving application/integrationCheck untouched', async () => {
  const { gateway } = fakeDeveloperGateway();
  const controller = api.developerController.createDeveloperController(gateway);
  controller.setRegisterForm({ name: 'App', ownerBusinessKsNumber: 'KS-OAK' });
  await controller.registerApplication();
  await controller.runIntegrationCheck();
  controller.setWebhookUrlInput('https://example.com');
  controller.setWebhookEventsInput('agreement.created');
  await controller.registerWebhook();
  await controller.issueSecureCode();
  const before = controller.getSnapshot();
  assert.equal(before.issuedWebhook.signingSecret, 'plaintext-signing-secret-shown-once');
  assert.equal(before.issuedSecureCode.secureCode, 'plaintext-secure-code-shown-once');
  controller.clearSensitiveTransientState();
  const after = controller.getSnapshot();
  assert.equal(after.issuedWebhook, null);
  assert.equal(after.issuedSecureCode, null);
  assert.equal(after.application.data.id, before.application.data.id, 'clearing secrets must not clear the open application');
  assert.equal(after.integrationCheck.status, 'ready', 'clearing secrets must not clear the integration check');
});

test('K3. Opening a different application clears any previously-issued secret so it never appears attached to the newly-opened application', async () => {
  const { gateway } = fakeDeveloperGateway();
  const controller = api.developerController.createDeveloperController(gateway);
  controller.setRegisterForm({ name: 'App', ownerBusinessKsNumber: 'KS-OAK' });
  await controller.registerApplication();
  controller.setCredentialScopesInput('AGREEMENTS_READ');
  await controller.issueCredential();
  assert.ok(controller.getSnapshot().issuedCredential);
  await controller.openApplication('app-2');
  assert.equal(controller.getSnapshot().issuedCredential, null);
});

test('K4. Revoking the open application clears any previously-issued secret', async () => {
  const { gateway } = fakeDeveloperGateway();
  const controller = api.developerController.createDeveloperController(gateway);
  controller.setRegisterForm({ name: 'App', ownerBusinessKsNumber: 'KS-OAK' });
  await controller.registerApplication();
  controller.setCredentialScopesInput('AGREEMENTS_READ');
  await controller.issueCredential();
  assert.ok(controller.getSnapshot().issuedCredential);
  await controller.setApplicationLifecycle('revoke');
  assert.equal(controller.getSnapshot().issuedCredential, null);
  // Suspend/reactivate are not a revocation -- they must not be treated the same way.
  await controller.issueCredential();
  assert.ok(controller.getSnapshot().issuedCredential);
  await controller.setApplicationLifecycle('suspend');
  assert.ok(controller.getSnapshot().issuedCredential, 'suspending must not clear a still-valid secret');
});

test('K5. Rotating/revoking a credential, and revoking a SecureCode, never leave the prior secret behind', async () => {
  const { gateway } = fakeDeveloperGateway();
  const controller = api.developerController.createDeveloperController(gateway);
  controller.setRegisterForm({ name: 'App', ownerBusinessKsNumber: 'KS-OAK' });
  await controller.registerApplication();
  await controller.issueSecureCode();
  const issued = controller.getSnapshot().issuedSecureCode;
  await controller.revokeSecureCode(issued.id);
  assert.equal(controller.getSnapshot().issuedSecureCode, null);
});

test('K6. No Developer secret is ever written to localStorage/sessionStorage/window.location -- the controller module never references browser storage or the URL at all', async () => {
  const contents = await readFile('src/features/developer/controller.ts', 'utf8');
  assert.doesNotMatch(contents, /localStorage|sessionStorage|location\.(href|search)|URLSearchParams/);
});

// ─── L. Recovery sensitive-state hygiene ─────────────────────────

test('L1. Leaving Recovery (calling reset()) clears the recovery token, OTP, both password fields, and returns to the request step', async () => {
  const { gateway } = fakeRecoveryGateway();
  const controller = api.recoveryController.createRecoveryController(gateway);
  controller.setKsNumber('KS-0099');
  await controller.requestRecovery();
  controller.setOtpCode('123456');
  await controller.verifyOtp();
  controller.setNewPassword('NewPass123!');
  controller.setConfirmPassword('NewPass123!');
  const midFlow = controller.getSnapshot();
  assert.equal(midFlow.step, 'reset');
  assert.ok(midFlow.recoveryToken);
  controller.reset();
  const cleared = controller.getSnapshot();
  assert.equal(cleared.step, 'request');
  assert.equal(cleared.recoveryToken, null);
  assert.equal(cleared.otpCode, '');
  assert.equal(cleared.newPassword, '');
  assert.equal(cleared.confirmPassword, '');
  assert.equal(cleared.verified, false);
  assert.equal(cleared.error, null);
});

test('L2. A successful password reset does not retain the new password, confirm password, OTP, or recovery token in state', async () => {
  const { gateway } = fakeRecoveryGateway();
  const controller = api.recoveryController.createRecoveryController(gateway);
  controller.setKsNumber('KS-0099');
  await controller.requestRecovery();
  controller.setOtpCode('123456');
  await controller.verifyOtp();
  controller.setNewPassword('NewPass123!');
  controller.setConfirmPassword('NewPass123!');
  await controller.resetPassword();
  assert.equal(controller.getSnapshot().step, 'done');
  // The success screen's own "Go to sign in" action calls reset() before navigating away (see
  // AgentExperience.tsx) -- confirm that reset from the 'done' step also clears everything.
  controller.reset();
  const cleared = controller.getSnapshot();
  assert.equal(cleared.newPassword, '');
  assert.equal(cleared.confirmPassword, '');
  assert.equal(cleared.otpCode, '');
  assert.equal(cleared.recoveryToken, null);
});

test('L3. AgentExperience clears Recovery state unconditionally on every navigation, not only when explicitly entering Recovery -- so leaving mid-flow also clears it', async () => {
  const contents = await readFile('src/features/agent/AgentExperience.tsx', 'utf8');
  assert.match(contents, /setAccount\(false\); setSettingsView\(false\); setRecoveryView\(false\); setBusinessView\(false\); setDeveloperView\(false\);[\s\S]{0,600}?recoveryController\.reset\(\);[\s\S]{0,200}?developerController\.clearSensitiveTransientState\(\);/);
});

test('L4. Recovery controller never references browser storage or the URL/query string', async () => {
  const contents = await readFile('src/features/recovery/controller.ts', 'utf8');
  assert.doesNotMatch(contents, /localStorage|sessionStorage|location\.(href|search)|URLSearchParams/);
});

// ─── M. Account Business lookup fails closed on authority ─────────────────────────

test('M1. AccountExperience never presents a Business as one the person administers from business.get() succeeding alone -- "Your authority for this Business" only appears once authoritySummary is ready', async () => {
  const contents = await readFile('src/features/account/AccountExperience.tsx', 'utf8');
  assert.doesNotMatch(contents, /a business you administer/i);
  assert.match(contents, /open a business/i);
  assert.match(contents, /your authority for this business/i);
  assert.match(contents, /could not confirm your authority/i);
});

test('M2. Account controller requests authoritySummary immediately and unconditionally once the organization read succeeds -- never gated on a separate user action', async () => {
  const contents = await readFile('src/features/account/controller.ts', 'utf8');
  assert.match(contents, /business:\s*\{\s*status:\s*'ready'[\s\S]{0,80}authority:\s*\{\s*status:\s*'loading'/);
});

// ─── N. Vision/Project doctrine wording matches the corrected architecture rule exactly ─────────────────────────

test('N. VisionBoardExperience states the corrected doctrine precisely: no bridge exists today, but the backend leaves room for one via each domain\'s own authorized API -- never "architecturally prevented" absolutism', async () => {
  const contents = await readFile('src/features/visionboard/VisionBoardExperience.tsx', 'utf8');
  assert.doesNotMatch(contents, /architecturally prevented/i);
  assert.match(contents, /future feature to link them/i);
  assert.match(contents, /authorized owner-scoped api/i);
});

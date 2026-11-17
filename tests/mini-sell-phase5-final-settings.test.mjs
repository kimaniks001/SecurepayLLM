import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const get=(path)=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const ui=get('src/mini/MiniSellerBusinessOptIns.tsx');
const gateway=get('src/api/securepay/mini-business-preferences/index.ts');
const settings=get('src/mini/MiniSellerAccountSettings.tsx');
const team=get('src/mini/MiniSellerTeamAccess.tsx');
const shell=get('src/mini/MiniFirstPartyKs001.tsx');

test('Business directory request only follows explicit seller review and server revision check',()=>{
  assert.ok(ui.includes('Request directory review'));
  assert.ok(ui.includes('Withdraw directory request'));
  assert.ok(ui.includes('Yes, record my choice'));
  assert.ok(ui.includes('Not now'));
  assert.ok(ui.includes('preferencesGateway.read(businessKsNumber)'));
  assert.ok(ui.includes('preferencesGateway.choose(businessKsNumber,desired.choice'));
  assert.ok(ui.includes('fresh.version!==old.version'));
  assert.ok(ui.includes('sellerConfirmsChoice:true'));
  assert.ok(ui.includes('No KRA connection, taxpayer data or invoice has been sent'));
  assert.ok(ui.includes('has NOT been published to a community directory'));
  assert.equal(ui.includes('navigator.geolocation'),false);
});
test('eTIMS is a setup request, never a KRA billing API or eligible input-tax claim',()=>{
  assert.ok(ui.includes('Request eTIMS setup'));
  assert.ok(ui.includes('REQUESTED_NOT_CONNECTED'));
  assert.ok(gateway.includes("choice:'DIRECTORY'|'ETIMS'"));
  assert.ok(gateway.includes("auth:'required'"));
  assert.ok(gateway.includes("method:'POST'"));
  assert.ok(ui.includes('taxpayer data or invoice has been sent'));
  for(const dangerous of ['kra.go.ke','/submit-invoice','sendTaxInvoice','inputTaxEligible=true'])
    assert.equal(ui.includes(dangerous),false,dangerous);
});
test('server confirmation states cannot be promoted from requests into active connections',()=>{
  assert.ok(ui.includes("REQUESTED_NOT_PUBLISHED"));
  assert.ok(ui.includes("REQUESTED_NOT_CONNECTED"));
  assert.ok(ui.includes('result.version!==fresh.version+1'));
  assert.ok(ui.includes('Reopen settings and check before trying again'));
  assert.ok(ui.includes('Community directories, other apps')===false);
});
test('membership choice is explicit, only after authenticated server NO_SUBSCRIPTION, no Money',()=>{
  assert.ok(settings.includes("error.code==='NO_SUBSCRIPTION'"));
  assert.ok(settings.includes("memberState==='none'"));
  assert.ok(settings.includes("setChosenPlan('FOR_YOU')"));
  assert.ok(settings.includes("setChosenPlan('BUSINESS')"));
  assert.ok(settings.includes('Yes, open pending plan'));
  assert.ok(settings.includes('subscriptionGateway.selectPlan(chosenPlan)'));
  assert.ok(settings.includes('subscriptionGateway.myStatus()'));
  assert.ok(settings.includes('current.subscriptionId!==opened.subscriptionId'));
  assert.ok(settings.includes('no payment has been authorized'));
  assert.equal(settings.includes('prepareCurrentBillingCycle('),false);
  assert.equal(settings.includes('initiateVerificationTransfer('),false);
});
test('team invitation is two-step and only a pending membership',()=>{
  assert.ok(team.includes('Invite a helper'));
  assert.ok(team.includes('Review invitation'));
  assert.ok(team.includes('Yes, send invitation'));
  assert.ok(team.includes('businessGateway.representation(businessKsNumber)'));
  assert.ok(team.includes('authorizationGateway.authoritySummary(org.organizationId)'));
  assert.ok(team.includes("summary.permissions.includes('ORGANIZATION_MANAGE_MEMBERS')"));
  assert.ok(team.includes('businessGateway.inviteMember(businessKsNumber,target)'));
  assert.ok(team.includes('pending Business membership invitation'));
  for(const forbidden of ['executeRoleAssignment(', 'approveProtectedAction(', 'prepareCurrentBillingCycle('])
    assert.equal(team.includes(forbidden),false);
});
test('no synthetic owner account may reach real directory eTIMS or membership gateway',()=>{
  assert.ok(shell.includes('preferencesGateway={demo?undefined:businessPreferences}'));
  assert.ok(shell.includes('subscriptionGateway={demo?undefined:subscriptions}'));
  assert.ok(settings.includes("representation==='verified'&&businessKsNumber&&preferencesGateway"));
});

test('membership activation requires canonical version review and independent confirmation',()=>{
  const source=get('src/mini/MiniSellerActivationAgreement.tsx');
  assert.ok(source.includes('subscriptionGateway.activationAgreement()'));
  assert.ok(source.includes('subscriptionGateway.establishActivationAgreement()'));
  assert.ok(source.includes('subscriptionGateway.confirmActivationAgreement()'));
  assert.ok(source.includes('Yes, prepare draft'));
  assert.ok(source.includes('I have read these terms'));
  assert.ok(source.includes('Yes, confirm this Agreement'));
  assert.ok(source.includes('fresh.contentHash!==reviewed.contentHash'));
  assert.ok(source.includes('recorded.agreementVersionId!==reviewed.agreementVersionId'));
  assert.ok(source.includes('No Money has been initiated'));
  for(const prohibited of ['prepareCurrentBillingCycle(', 'initiateVerificationTransfer(',
    'initiatePayment(', 'connectToMoney('])assert.equal(source.includes(prohibited),false);
});
test('invitees can accept only their own pending Business invitation, never assume a role',()=>{
  const invite=get('src/mini/MiniSellerInvitationAcceptance.tsx');
  const store=get('src/mini/MiniSellerStore.tsx');
  assert.ok(invite.includes('Have a Business invitation?'));
  assert.ok(invite.includes('Review invitation'));
  assert.ok(invite.includes('Yes, accept invitation'));
  assert.ok(invite.includes('businessGateway.acceptInvitation(target)'));
  assert.ok(invite.includes('They cannot act for the Business')===false);
  assert.ok(invite.includes('No Agreement or Money authority was granted'));
  assert.ok(store.includes('visibilityEnabled&&<MiniSellerInvitationAcceptance'));
});

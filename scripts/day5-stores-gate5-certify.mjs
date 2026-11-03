/**
 * Digital Stores Day 5, Gate 5. Fail-closed release evidence evaluator.
 *
 * This script checks the existence, freshness and exact-candidate binding of
 * operator-supplied staging evidence. It does NOT run the journeys, inspect
 * real phones, verify provider delivery, or approve production. Even a full
 * evidentiary PASS leads only to OWNER_REVIEW_REQUIRED, never auto-deploy.
 *
 * Usage:
 *   node scripts/day5-stores-gate5-certify.mjs \
 *     --evidence testing/day5-stores-gate5-evidence.json \
 *     --ui-sha <40-character-ui-commit> --api-sha <40-character-api-commit>
 */
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export const REQUIRED_CHECKS = Object.freeze([
  'gate1.public_store_offer',
  'gate1.store_deep_link',
  'gate1.gps_privacy',
  'gate2.real_buyer_enquiry',
  'gate2.seller_inbox_reply',
  'gate2.duplicate_enquiry_replay',
  'gate3.source_and_offer_provenance',
  'gate3.original_quantity_terms_retain',
  'gate3.changed_offer_fail_closed',
  'gate3.canonical_agreement_review',
  'gate4.customer_saved_work_other_phone',
  'gate4.seller_reply_draft_other_phone',
  'gate4.concurrent_draft_version_409',
  'gate4.in_app_notifications',
  'gate4.locked_phone_delivery',
  'gate4.business_representative_delivery',
  'gate4.identity_change_isolation',
  'gate4.foreground_resume',
  'gate5.full_java_compile',
  'gate5.sequential_flyway_postgresql',
  'gate5.junit_doctrine_integration',
  'gate5.frontend_typecheck_build_lint',
  'gate5.frontend_full_regression',
  'gate5.two_real_ks_identities',
  'gate5.ios_android_browser',
  'gate5.day4_work_continuity_preserved',
  'gate5.fault_injection_retry_rollback',
  'gate5.financial_execution_disabled',
  'gate5.production_unmodified',
]);

const SHA = /^[0-9a-f]{40}$/i;
const DISALLOWED = /^(?:n\/a|none|unknown|pending|todo|not run|mock|fixture|example)(?:\W|$)/i;
const STAGING_HOST = /^(?:staging|sandbox|qa|test)(?:[.-][a-z0-9-]+)*\.securepay\.ke$/i;

export function evaluateStoreGate5(evidence, expected = {}, now = new Date()) {
  const blockers = [];
  const candidate = evidence?.candidate ?? {};
  const checks = evidence?.checks ?? {};
  const runAt = new Date(now);
  if (evidence?.schemaVersion !== 1) blockers.push('schemaVersion must be 1');
  for (const [field, expectedValue] of [
    ['uiSha', expected.uiSha],
    ['apiSha', expected.apiSha],
  ]) {
    const actual = candidate[field];
    if (typeof actual !== 'string' || !SHA.test(actual) || /^0{40}$/.test(actual)) {
      blockers.push(`candidate.${field} must be a real 40-character SHA`);
    } else if (expectedValue && actual.toLowerCase() !== String(expectedValue).toLowerCase()) {
      blockers.push(`candidate.${field} does not match the exact verified head`);
    }
  }
  try {
    const url = new URL(candidate.stagingUrl);
    if (url.protocol !== 'https:' || !STAGING_HOST.test(url.hostname) ||
        url.username || url.password || url.search || url.hash || url.pathname !== '/') {
      blockers.push('candidate.stagingUrl must be an isolated SecurePay staging HTTPS origin');
    }
  } catch {
    blockers.push('candidate.stagingUrl must be a valid isolated staging HTTPS origin');
  }
  const safety = evidence?.safety ?? {};
  for (const key of ['isolatedDatabase', 'productionUnchanged',
    'financialExecutionDisabled', 'rollbackAvailable', 'productionCredentialsNotReused']) {
    if (safety[key] !== true) blockers.push(`safety.${key} must be verified true`);
  }
  if (!candidate.uiSha || !candidate.apiSha) blockers.push('Both exact UI and API commits are required');
  const pass = [];
  for (const key of REQUIRED_CHECKS) {
    const entry = checks[key];
    if (entry?.status !== 'PASS') {
      blockers.push(`${key}: no PASS evidence`);
      continue;
    }
    const reference = entry.evidenceRef;
    if (typeof reference !== 'string' || reference.length < 15 ||
        DISALLOWED.test(reference.trim())) {
      blockers.push(`${key}: missing reviewable evidence reference`);
      continue;
    }
    const observed = new Date(entry.observedAt);
    if (!Number.isFinite(observed.getTime())
        || observed > runAt || runAt.getTime() - observed.getTime() > 7 * 86400_000) {
      blockers.push(`${key}: evidence is missing, in the future or older than seven days`);
      continue;
    }
    if (!entry.uiSha || !entry.apiSha
        || entry.uiSha.toLowerCase() !== String(candidate.uiSha).toLowerCase()
        || entry.apiSha.toLowerCase() !== String(candidate.apiSha).toLowerCase()) {
      blockers.push(`${key}: evidence does not match BOTH exact tested commits`);
      continue;
    }
    pass.push(key);
  }

  const decision = blockers.length ? 'NO_GO' : 'OWNER_REVIEW_REQUIRED';
  return {
    gate: 'Digital Stores Day 5 Gate 5',
    decision,
    releaseApproved: false,
    checksPassed: pass.length,
    checksRequired: REQUIRED_CHECKS.length,
    blockers,
    note: 'Evidence evaluator only; not a deployment mechanism or substitute for real phone/staging tests.',
  };
}

function argValue(args, flag) {
  const index = args.indexOf(flag);
  return index < 0 ? null : args[index + 1] ?? null;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const evidencePath = argValue(args, '--evidence');
  const uiSha = argValue(args, '--ui-sha');
  const apiSha = argValue(args, '--api-sha');
  let evidence;
  try {
    if (!evidencePath || !SHA.test(uiSha ?? '') || !SHA.test(apiSha ?? ''))
      throw new Error('Supply --evidence, --ui-sha and --api-sha for the exact staging candidate');
    evidence = JSON.parse(readFileSync(evidencePath, 'utf8'));
    const result = evaluateStoreGate5(evidence, { uiSha, apiSha });
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
    if (result.decision !== 'OWNER_REVIEW_REQUIRED') process.exitCode = 1;
  } catch (error) {
    process.stderr.write('Gate 5 NO_GO: ' + (error instanceof Error ? error.message : String(error)) + '\n');
    process.exitCode = 1;
  }
}

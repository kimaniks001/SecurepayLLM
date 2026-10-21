#!/usr/bin/env node
/**
 * Gate 5C — first-time human experience evidence evaluator.
 * Reads local, access-controlled session metadata; does not contact SecurePay,
 * Vercel, GitHub, banks, or production. Never produces human certification
 * automatically. Human attendance and evidence authenticity require review.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const JOURNEY_IDS = Object.freeze([
  'first-impression',
  'work-400-delivery',
  'vision-private',
  'circle-chama',
  'community-boundary',
  'money-boundary',
  'securepay-check',
  'return-journey',
]);
const CRITICAL = new Set([
  'privacy-leak', 'money-misrepresentation', 'false-acceptance',
  'unauthorized-action', 'lost-work', 'inaccessible-critical-action',
]);
const FULL_SHA = /^[a-f\d]{40}$/i;
const NON_EMPTY = value => typeof value === 'string' && value.trim().length > 0;
function previewIsSafe(value) {
  try {
    const u = new URL(value);
    if (u.protocol !== 'https:' || u.username || u.password) return false;
    const host = u.hostname.toLowerCase();
    return host !== 'securepay.ke' && host !== 'www.securepay.ke'
      && host !== 'localhost' && !host.endsWith('.localhost')
      && !host.endsWith('.invalid');
  } catch {
    return false;
  }
}
function timestampIsValid(value) {
  return NON_EMPTY(value) && /(?:Z|[+-]\d{2}:\d{2})$/.test(value)
    && !Number.isNaN(Date.parse(value));
}
export function certify(report) {
  const errors = [];
  const blockers = [];
  const reviewItems = [];
  if (!report || typeof report !== 'object' || Array.isArray(report)) {
    return { status: 'NOT_CERTIFIED', participants: 0, passed: 0, attempted: 0,
      errors: ['Report must be a JSON object'], blockers, reviewItems };
  }
  const candidate = report.candidate || {};
  if (candidate.repo !== 'kimaniks001/SecurepayLLM')
    errors.push('Candidate must identify the SecurepayLLM repository');
  if (!FULL_SHA.test(candidate.sha || ''))
    errors.push('Candidate requires one complete 40-character Git commit SHA');
  if (!previewIsSafe(candidate.previewUrl))
    errors.push('Use an HTTPS non-production preview URL with no embedded credentials');
  if (candidate.deploymentSha !== candidate.sha)
    errors.push('Preview deployment SHA must match the candidate SHA exactly');

  const environment = report.environment || {};
  for (const flag of [
    'isolated', 'noRealMoney', 'noProductionWrites', 'noProductionReads',
    'syntheticIdentitiesOnly', 'noExternalProviderWrites', 'connectedStagingReady',
  ]) {
    if (environment[flag] !== true) errors.push('Staging safety attestation missing: ' + flag);
  }
  for (const evidence of ['isolationEvidenceRef', 'stagingDeploymentEvidenceRef', 'gate4cEvidenceRef']) {
    if (!NON_EMPTY(environment[evidence]))
      errors.push('Staging evidence reference missing: ' + evidence);
  }
  if (!timestampIsValid(environment.verifiedAt))
    errors.push('Staging verification must contain an offset-aware timestamp');

  const sessions = Array.isArray(report.sessions) ? report.sessions : [];
  if (sessions.length < 5) errors.push('At least five distinct uncoached first-time participants required');
  const participantIds = new Set();
  const counts = Object.fromEntries(JOURNEY_IDS.map(id => [id, {pass:0, fail:0, blocked:0, missing:0}]));
  let passed = 0;
  let attempted = 0;
  for (const [index, session] of sessions.entries()) {
    const s = session && typeof session === 'object' ? session : {};
    const who = s.id || 'participant-' + (index + 1);
    if (!NON_EMPTY(s.id) || participantIds.has(s.id))
      errors.push(who + ': unique anonymous participant ID required');
    participantIds.add(s.id);
    if (s.priorSecurePayExperience !== false || s.coached !== false)
      errors.push(who + ': must be a first-time, uncoached participant');
    if (s.consent !== true) errors.push(who + ': recording/observation consent must be confirmed');
    if (!NON_EMPTY(s.device) || !timestampIsValid(s.startedAt) || !NON_EMPTY(s.evidenceRef))
      errors.push(who + ': device, offset-aware start time and controlled evidence link required');
    if (s.candidateSha !== candidate.sha)
      errors.push(who + ': session must identify exact deployed candidate SHA');
    if (!Array.isArray(s.journeys)) {
      errors.push(who + ': journeys missing');
      for (const id of JOURNEY_IDS) counts[id].missing++;
      continue;
    }
    if (s.journeys.length !== JOURNEY_IDS.length)
      errors.push(who + ': exactly eight recognised journey entries required');
    for (const id of JOURNEY_IDS) {
      const found = s.journeys.filter(j => j && j.id === id);
      if (found.length !== 1) {
        errors.push(who + '/' + id + ': exactly one result required');
        counts[id].missing++;
        continue;
      }
      const j = found[0];
      attempted++;
      if (!['pass', 'fail', 'blocked'].includes(j.result))
        errors.push(who + '/' + id + ': result must be pass, fail or blocked');
      else {
        counts[id][j.result]++;
        if (j.result === 'pass') passed++;
        if (j.result === 'blocked') blockers.push(who + '/' + id + ': blocked journey');
      }
      if (!NON_EMPTY(j.observation) || !NON_EMPTY(j.evidenceRef))
        errors.push(who + '/' + id + ': actual observation and evidence reference required');
      if (!Array.isArray(j.defects))
        errors.push(who + '/' + id + ': defects must be an explicit array (can be empty)');
      for (const defect of Array.isArray(j.defects) ? j.defects : []) {
        if (!NON_EMPTY(defect?.code) || !NON_EMPTY(defect?.description)) {
          errors.push(who + '/' + id + ': defect code and description required');
        } else if (CRITICAL.has(defect.code)) {
          blockers.push(who + '/' + id + ': ' + defect.code + ' — ' + defect.description);
        } else {
          reviewItems.push(who + '/' + id + ': ' + defect.code + ' — ' + defect.description);
        }
      }
    }
  }
  if (!sessions.some(s => /mobile|phone|android|ios/i.test(s?.device || '')))
    errors.push('At least one mobile first-time participant is required');
  if (!sessions.some(s => /desktop|laptop|mac|windows/i.test(s?.device || '')))
    errors.push('At least one desktop first-time participant is required');

  const allComplete = attempted === sessions.length * JOURNEY_IDS.length
    && passed === attempted;
  const status = !errors.length && !blockers.length && allComplete
    ? 'ELIGIBLE_FOR_OWNER_REVIEW' : 'NOT_CERTIFIED';
  return {
    status, candidateSha: candidate.sha || null, participants: sessions.length,
    passed, attempted, counts, errors, blockers, reviewItems,
    note: 'This checks only metadata completeness and reported outcomes. A human reviewer must inspect real session evidence, verify staging controls and decide certification. Synthetic fixtures never count.',
  };
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    if (!process.argv[2]) throw Error('Usage: node scripts/gate5c-certify.mjs <private-sessions.json>');
    const output = certify(JSON.parse(readFileSync(process.argv[2], 'utf8')));
    process.stdout.write(JSON.stringify(output, null, 2) + '\n');
    if (output.status !== 'ELIGIBLE_FOR_OWNER_REVIEW') process.exitCode = 1;
  } catch (error) {
    process.stderr.write(String(error) + '\n');
    process.exitCode = 1;
  }
}

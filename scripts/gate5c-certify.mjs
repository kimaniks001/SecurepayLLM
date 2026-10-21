#!/usr/bin/env node
/**
 * Gate 5C: first-time human certification evaluator.
 * Run: node scripts/gate5c-certify.mjs path/to/sessions.json
 * No network, no credentials, no product write operations.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const REQUIRED = ['first-impression','work-400-delivery','vision-private','circle-chama','community-boundary','money-boundary','securepay-check','return-journey'];
const BLOCKERS = new Set(['privacy-leak','money-misrepresentation','false-acceptance','unauthorized-action','lost-work','inaccessible-critical-action']);
export function certify(report) {
  const errors = [], blockers = [];
  if (!report || typeof report !== 'object') return { status:'NOT_CERTIFIED', errors:['Report must be an object'], blockers:[] };
  if (!report.candidate?.repo || !report.candidate?.sha || !report.candidate?.previewUrl) errors.push('Candidate repo, exact SHA, and isolated preview URL required');
  if (!report.environment?.isolated || !report.environment?.noRealMoney || !report.environment?.noProductionWrites) errors.push('Isolation, no-real-money and no-production-writes attestation required');
  const sessions = Array.isArray(report.sessions) ? report.sessions : [];
  if (sessions.length < 5) errors.push('At least five distinct uncoached first-time participants required');
  const ids = new Set();
  let completed = 0, attempted = 0;
  for (const [index, s] of sessions.entries()) {
    const who = s.id || `session-${index+1}`;
    if (!s.id || ids.has(s.id)) errors.push(`Unique anonymous session ID required: ${who}`);
    ids.add(s.id);
    if (s.priorSecurePayExperience !== false || s.coached !== false) errors.push(`${who}: must explicitly confirm first-time and uncoached`);
    if (!s.device || !s.startedAt || !s.evidenceRef) errors.push(`${who}: device, time and evidence reference required`);
    if (!Array.isArray(s.journeys)) { errors.push(`${who}: journeys missing`); continue; }
    for (const id of REQUIRED) {
      const matches = s.journeys.filter(j=>j.id===id);
      if (matches.length!==1) { errors.push(`${who}: exactly one ${id} result required`); continue; }
      const j=matches[0]; attempted++;
      if (!['pass','fail','blocked'].includes(j.result)) errors.push(`${who}/${id}: invalid result`);
      if (!j.observation || !j.evidenceRef) errors.push(`${who}/${id}: observation and linked evidence required`);
      if (j.result==='pass') completed++;
      if (j.result==='blocked') blockers.push(`${who}/${id}: blocked journey`);
      for (const defect of j.defects || []) {
        if (!defect.code || !defect.description) errors.push(`${who}/${id}: defect code and description required`);
        if (BLOCKERS.has(defect.code)) blockers.push(`${who}/${id}: ${defect.code}`);
      }
    }
  }
  const mobile = sessions.some(s=>/mobile|phone|android|ios/i.test(s.device||''));
  const desktop = sessions.some(s=>/desktop|laptop|mac|windows/i.test(s.device||''));
  if (!mobile || !desktop) errors.push('Desktop and mobile human sessions both required');
  // Conservative release criterion: all journeys pass; human exceptions require review, never automatic waiver.
  const status = errors.length || blockers.length || attempted!==sessions.length*REQUIRED.length || completed!==attempted ? 'NOT_CERTIFIED' : 'ELIGIBLE_FOR_OWNER_REVIEW';
  return { status, participants:sessions.length, completed, attempted, blockers, errors, note:'Only owner review can grant final human certification. Passing automation alone never certifies the product.' };
}
if (process.argv[1] && fileURLToPath(import.meta.url)===process.argv[1]) {
  try {
    const path=process.argv[2];
    if (!path) throw Error('Usage: node scripts/gate5c-certify.mjs <sessions.json>');
    const result=certify(JSON.parse(readFileSync(path,'utf8')));
    process.stdout.write(JSON.stringify(result,null,2)+'\n');
    if (result.status!=='ELIGIBLE_FOR_OWNER_REVIEW') process.exitCode=1;
  } catch(e) { process.stderr.write(String(e)+'\n'); process.exitCode=1; }
}

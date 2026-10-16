import type { AgreementFormation, FormationTerm } from '../formation/view';

/** Human presentation only. Terms and authority always remain with the SecurePay API. */
export type LivingFact = {label:string; value:string; state:'noted'|'check'|'missing'; reason?:string};
const compact=(value:string,max=94)=>value.trim().length>max?value.trim().slice(0,max-1).trimEnd()+'…':value.trim();
function termFact(label:string,terms:FormationTerm[]):LivingFact|null {
  const entries=terms.filter(t=>t.value.trim());
  if(!entries.length)return null;
  const needsCheck=entries.some(t=>t.needsChecking||t.basis==='INFERRED');
  return {label,value:compact(entries.slice(0,2).map(t=>t.value).join(' · ')),
    state:needsCheck?'check':'noted',reason:needsCheck?'Needs checking against the original information':undefined};
}
export function compactAgreementFacts(formation:AgreementFormation):LivingFact[] {
  const people=formation.who.length?{
    label:'People', value:compact(formation.who.slice(0,2).map(p=>p.name+(p.role?' · '+p.role:'')).join(', ')),
    state:formation.who.some(p=>!p.linked)?'check' as const:'noted' as const,
    reason:formation.who.some(p=>!p.linked)?'Identity not verified':undefined,
  }:null;
  // Location stays a projection of server-owned terms, never a second fact store.
  const placeTerms=[...formation.what,...formation.when,...formation.conditions]
    .filter(term=>/place|location|address|site|entrance|destination|drop.off|pickup/i.test(term.label));
  const candidates=[termFact('Work',formation.what),people,termFact('Money',formation.money),
    termFact('When',formation.when),termFact('Place',placeTerms)];
  const rows=candidates.filter((fact):fact is LivingFact=>fact!==null);
  const topic=formation.openPoints.find(p=>p.blocksConfirmation&&!p.checked)?.topic;
  const missingLabel=topic==='DATE'||topic==='TIMING'?'When':topic==='MONEY'||topic==='CURRENCY'?'Money':topic==='PARTY'||topic==='ROLE'?'People':topic==='LOCATION'?'Place':null;
  if(missingLabel&&!rows.some(r=>r.label===missingLabel))rows.push({label:missingLabel,value:'To be agreed',state:'missing'});
  return rows.slice(0,5);
}
export function livingFactStatus(fact:LivingFact) {
  return fact.state==='noted'?'Recorded':fact.state==='missing'?'Missing':'Check';
}
export function humanNextQuestion(question:string):string {
  const text=question.trim().replace(/^.{0,120}\.(?:pdf|docx|xlsx|csv|txt)\s+(?:doesn't say|does not say|says|shows)\s*:?\s*/i,'')
    .replace(/^the schedule does not state\s*/i,'').trim();
  return text||question;
}

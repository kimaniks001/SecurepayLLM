/** Gate 3: public invitation wording only. Never asserts an Agreement,
 * SecureLink, a fair-trade examination, legal compliance, or secured money.
 * Actual source adoption, party acceptance and payments remain canonical. */
export type ProjectOpportunityKind = 'PAID_WORK' | 'VOLUNTARY_CAUSE';
export type ProposedFunding = 'NOT_CONFIRMED' | 'ORGANISER_REPORTS_AVAILABLE';
export type ProjectOpportunityIntent = {
  kind: ProjectOpportunityKind;
  purpose: string;
  duties: string;
  peopleNeeded: string;
  schedule: string;
  supervisor: string;
  safety: string;
  compensation: string;
  funding: ProposedFunding;
  joining: string;
};

export const newProjectOpportunityIntent = ():ProjectOpportunityIntent=>({
  kind:'PAID_WORK',purpose:'',duties:'',peopleNeeded:'',schedule:'',
  supervisor:'',safety:'',compensation:'',funding:'NOT_CONFIRMED',joining:'',
});
const clean=(value:string)=>value.trim().replace(/\s+/g,' ');
const required=(value:string)=>clean(value).length>0;
export function missingProjectOpportunityFacts(d:ProjectOpportunityIntent):string[] {
  const missing:string[]=[];
  if(!required(d.purpose))missing.push('What is the project trying to achieve?');
  if(!required(d.duties))missing.push(d.kind==='PAID_WORK'?'What work will people perform?':'How can people help?');
  if(!required(d.peopleNeeded))missing.push('How many people or what kinds of help are needed?');
  if(!required(d.schedule))missing.push('When and for how long?');
  if(!required(d.supervisor))missing.push('Who will coordinate or supervise?');
  if(!required(d.safety))missing.push('How will people work safely?');
  if(d.kind==='PAID_WORK'&&!required(d.compensation))missing.push('What pay is proposed, in which currency, and on what basis?');
  if(!required(d.joining))missing.push('How should people express interest, and who will select them?');
  return missing;
}
export function projectOpportunityInvitation(d:ProjectOpportunityIntent):string {
  const paid=d.kind==='PAID_WORK';
  const sections=[
    paid?'PROPOSED PAID WORK — INVITATION TO EXPRESS INTEREST':'VOLUNTARY CAUSE — INVITATION TO PARTICIPATE',
    'Purpose: '+clean(d.purpose),
    (paid?'Work and responsibilities: ':'Ways to contribute: ')+clean(d.duties),
    'People sought: '+clean(d.peopleNeeded),
    'Timing and duration: '+clean(d.schedule),
    'Coordination and supervision: '+clean(d.supervisor),
    'Safety and practical arrangements: '+clean(d.safety),
  ];
  if(paid){
    sections.push('Proposed compensation: '+clean(d.compensation));
    sections.push(d.funding==='ORGANISER_REPORTS_AVAILABLE'
      ? 'Funding: organiser reports funds available; SecurePay has NOT verified or reserved the money.'
      : 'Funding: NOT CONFIRMED. This is a proposal, NOT a promise of secured payment.');
  }else{
    sections.push('Participation: voluntary; no wage or paid engagement is promised by this invitation.');
  }
  sections.push('How selection works: '+clean(d.joining));
  sections.push('Expressing interest is not selection, acceptance, an Agreement or a paid engagement.');
  sections.push('KS001 must still examine material facts against SecurePay’s 12 Principles of Fair Trade. A SecureLink or funding confirmation can only follow the authorised Agreement and Money journey.');
  return sections.join('\n\n');
}

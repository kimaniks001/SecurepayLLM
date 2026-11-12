/**
 * READ-ONLY view model for the canonical SecurePayAPI AgreementFormationDto.
 * Never promotes chat-derived claims into accepted terms, identifies a party,
 * or infers a date, amount, delivery, consent, stock or financial state.
 */
const isText = x => typeof x === 'string' && !!x.trim();
const validArray = value => Array.isArray(value) ? value : [];
const term = x => x && isText(x.label) && isText(x.value) ? {
  key:String(x.key||x.label), title:x.label, value:x.value,
  detail:isText(x.detail)?x.detail:null, needsChecking:x.needsChecking===true,
  basis:isText(x.basis)?x.basis:null,
  kind:'term',
} : null;
const values = arr => validArray(arr).map(term).filter(Boolean);
const people = arr => validArray(arr).filter(x=>x && isText(x.name)).map(x=>({
  key:String(x.key||x.name),
  title:x.name,
  value:[x.role,x.describedAs].filter(isText).join(' · ') || 'Person mentioned',
  detail:x.participation==='NOT_JOINED'?'Has not joined or accepted this Agreement':
    x.link==='NOT_LINKED'?'Identity not linked to a verified KSNumber':
    x.link==='NOT_NAMED'?'Identity not established':
    'Agreement participation and authority must still be confirmed',
  // A linked identity is NOT the same as consent or accepted participation.
  needsChecking:true,
  basis:null,
  kind:'person',
}));
const section = (id,title,items) => items.length?{id,title,items}:null;

/** Reveal only known aspects, with an expandable layer for each. */
export function miniAgreementSlots(dto) {
  if (!dto || !isText(dto.conversationId) || !Number.isInteger(dto.version) ||
    dto.version<0 || !Array.isArray(dto.openPoints) ||
    !['what','who','money','when','responsibilities','conditions','notIncluded']
      .every(k=>Array.isArray(dto[k]))) return null;
  const dutyItems = validArray(dto.responsibilities).flatMap((r,i)=>
    r && Array.isArray(r.duties)
      ?values(r.duties).map((d,j)=>({
        ...d,key:['duty:',i,':',j,':',d.key].join(''),
        title:isText(r.party)?r.party+' — '+d.title:d.title,
      })) : []);
  const sections = [
    section('purpose','What is being agreed',values(dto.what)),
    section('people','People',people(dto.who)),
    section('money','Money',values(dto.money)),
    section('dates','Dates and times',values(dto.when)),
    section('duties','Responsibilities',dutyItems),
    section('conditions','Conditions',values(dto.conditions)),
    section('excluded','Not included',values(dto.notIncluded)),
  ].filter(Boolean);
  const unresolved = dto.openPoints.map((p,i)=>p && isText(p.text)?{
    id:String(p.id||'pending-'+i), text:p.text,
    // ACKNOWLEDGED or checked is STILL open; do not count it as resolved.
    acknowledged:p.state==='ACKNOWLEDGED'||p.checked===true,
    blocks:typeof p.effect==='string'?p.effect:null,
  }:null).filter(Boolean);
  const question=dto.question?.ask===true && isText(dto.question.text) &&
    dto.question.alreadyAsked!==true ? {
      text:dto.question.text,
      choices:validArray(dto.question.choices).filter(isText).slice(0,4),
      blocksSetUp:dto.question.blocksSetUp===true,
    }:null;
  return {
    conversationId:dto.conversationId,
    version:dto.version,
    stage:isText(dto.stage)?dto.stage:'forming',
    summary:isText(dto.summary)?dto.summary:null,
    sections,
    unresolved,
    question,
    sourceReading:validArray(dto.readingSources).filter(isText),
    reviewable:dto.reviewable===true,
    confirmable:dto.confirmable===true,
    reviewBlockedReason:isText(dto.reviewBlockedReason)?dto.reviewBlockedReason:null,
    confirmationBlockedReason:isText(dto.confirmationBlockedReason)?dto.confirmationBlockedReason:null,
    accepted:false,
    paid:false,
    moneyMoved:false,
  };
}

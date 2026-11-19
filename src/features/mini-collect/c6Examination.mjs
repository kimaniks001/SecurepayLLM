/**
 * Mini Collect C6: human-sized, NON-authoritative Fair Trade clarification.
 * Answer pills do not verify bills, legal rights, recipient accounts,
 * school terms, provider mandates, refund entitlement or Money.
 */
import { isCalendarDate } from './governanceDraft.mjs';

const pick = (id,label) => Object.freeze({id,label});
const SOURCE = Object.freeze({
  id:'source', title:'Is the original source available?',
  why:'We need the actual item, bill or offer and its version—not just a total.',
  options:Object.freeze([
    pick('have-original','I have the original'),
    pick('ask-issuer','Ask the issuer'),
    pick('need-help','Help me find it'),
  ]),
});
const RECURRENCE = Object.freeze({
  id:'period', title:'Does this apply only to this period?',
  why:'A previous contribution must never silently create a new monthly charge.',
  options:Object.freeze([
    pick('this-period','Only this period'),
    pick('new-period','A different period is needed'),
    pick('clarify-period','Ask about the period'),
  ]),
});
const PURPOSE = Object.freeze({
  'shared-purchase':{
    id:'supplier',title:'Is the supplier still offering the same items?',
    why:'The exact item, price, delivery date and offer version must remain intact.',
    options:[pick('same-offer','Same offer presented'),pick('offer-changed','The offer changed'),pick('ask-supplier','Ask the supplier')],
  },
  'school-fees':{
    id:'term',title:'Is this for the right student and school term?',
    why:'Each family should privately see their own original school invoice.',
    options:[pick('stated-term','The term looks right'),pick('term-different','The term has changed'),pick('ask-school','Ask the school')],
  },
  'course-enrolment':{
    id:'start',title:'When will the course or access begin?',
    why:'The trainer should confirm the start, lessons, support and cancellation terms.',
    options:[pick('start-in-offer','Already stated in the offer'),pick('ask-trainer','Ask the trainer'),pick('propose-date','Propose a date')],
    calendar:true,
  },
  'thrift-item':{
    id:'condition',title:'Is the condition of this exact item clear?',
    why:'A buyer deserves the real condition, pickup/return rules and seller identity.',
    options:[pick('condition-shown','Condition is described'),pick('condition-unclear','I need better details'),pick('item-changed','The item has changed')],
  },
  'single-bill':{
    id:'bill',title:'Does this match the agreed work or service?',
    why:'A requested payment must be tied to an accepted bill or delivered work.',
    options:[pick('bill-matches','It matches what was agreed'),pick('work-disputed','There is a difference'),pick('ask-payee','Ask for the bill')],
  },
  'estate-dues':{
    id:'levy',title:'Is this the approved charge for this month?',
    why:'The community must preserve the approved levy, period and authority to collect.',
    options:[pick('levy-stated','The charge is stated'),pick('levy-changed','The levy changed'),pick('ask-community','Ask the committee')],
  },
  'school-transport':{
    id:'route',title:'Are the route, bus and service days clear?',
    why:'Parents need to know the actual operator, route, pickup, coverage and missed-trip rules.',
    options:[pick('route-stated','The route is shown'),pick('route-changed','The route changed'),pick('ask-operator','Ask the operator')],
  },
  'membership':{
    id:'membership',title:'What service does this membership include?',
    why:'Each period should state the service, cancellation and renewal rights.',
    options:[pick('service-stated','The service is stated'),pick('membership-different','Something changed'),pick('ask-provider','Ask the provider')],
  },
  'rent':{
    id:'rent',title:'Is the property, month and authorized payee correct?',
    why:'The tenancy and receiving person must match the original Agreement.',
    options:[pick('rent-stated','The month is stated'),pick('rent-changed','The amount or payee changed'),pick('ask-landlord','Ask the payee')],
  },
  'chama-cycle':{
    id:'rotation',title:'Is this round and its beneficiary agreed?',
    why:'The group must preserve the approved order, mandate and missed-payment rules.',
    options:[pick('rotation-stated','The round is stated'),pick('rotation-disputed','The order changed'),pick('ask-group','Ask the group')],
  },
  'group-project':{
    id:'project',title:'Will this fund the agreed project?',
    why:'Scope, milestones, suppliers and changed costs must stay visible to contributors.',
    options:[pick('project-stated','The project is stated'),pick('project-changed','The plan changed'),pick('ask-organizer','Ask the organizer')],
  },
  'welfare':{
    id:'cause',title:'Who will receive support and for what purpose?',
    why:'Giving is voluntary; the beneficiary and use must be clear and private.',
    options:[pick('cause-stated','The cause is explained'),pick('cause-unclear','I need more details'),pick('ask-beneficiary','Ask the organizer')],
  },
  'church-giving':{
    id:'giving',title:'Is this a general offering or a named project?',
    why:'A donation to one purpose should not silently fund another.',
    options:[pick('purpose-stated','The purpose is explained'),pick('purpose-different','The purpose changed'),pick('ask-organizer','Ask the organization')],
  },
  'education-fund':{
    id:'education',title:'When is this education money needed?',
    why:'Beneficial ownership, actual school fees and permitted withdrawals need proof.',
    options:[pick('need-stated','The need is stated'),pick('need-changed','The need has changed'),pick('ask-beneficiary','Ask the beneficiary')],
  },
  'event-goal':{
    id:'event',title:'Is the event date and budget agreed?',
    why:'A delayed event or changed supplier may alter the lawful refund route.',
    options:[pick('event-stated','The plan is stated'),pick('event-changed','The event changed'),pick('ask-organizer','Ask the organizer')],
  },
});

const SOURCE_GIVING=Object.freeze({
  ...SOURCE,
  title:'Is this the purpose the contributor intended?',
  why:'The original named cause and authorized beneficiary must be clear. A gift is not a debt.',
});
const BASE_PENDING=Object.freeze([
  'Original issuer/source and offer version must be independently checked',
  'Collector and recipient rights must be verified—not asserted by a pill',
  'Every contributor needs their own exact Agreement, money and return rights',
  'A genuine regulated provider must prove custody, fees, limits and refund capabilities',
]);

export function questionsForCollection(draft,period) {
  const specific=PURPOSE[draft?.collectionTypeId];
  if (!specific || !period?.sourceCategory) return Object.freeze([]);
  const first=(draft.kind==='give' && period.sourceCategory==='purpose-only') ? SOURCE_GIVING : SOURCE;
  const q=[first,specific];
  if (draft?.collectionCadence !== 'one-time') q.push(RECURRENCE);
  return Object.freeze(q.map(item => Object.freeze({
    id:item.id,title:item.title,why:item.why,
    calendar:!!item.calendar,
    options:Object.freeze(item.options.map(p => Object.freeze({...p}))),
  })));
}
// Explicit material changes: never infer that an old invoice, route, school
// term, item or recurring period remains authorized after these answers.
// Keep this allowlist synchronized with the human question profiles.
const MATERIAL_CHANGE_ANSWERS = new Set([
  'offer-changed', 'term-different', 'condition-unclear', 'item-changed',
  'work-disputed', 'levy-changed', 'route-changed',
  'membership-different', 'rent-changed', 'rotation-disputed',
  'project-changed', 'cause-unclear', 'purpose-different',
  'need-changed', 'event-changed', 'new-period',
]);
export function assessCollectionExamination(draft,period,answers={},dateProposal=null) {
  const questions=questionsForCollection(draft,period);
  const unanswered=questions.filter(q=>!q.options.some(x=>x.id===answers[q.id])).map(q=>q.id);
  const hasDateRequest=questions.some(q=>q.calendar && answers[q.id]==='propose-date');
  const proposedDateValid=!hasDateRequest || isCalendarDate(dateProposal);
  return Object.freeze({
    questions,
    unanswered:Object.freeze(unanswered),
    localClarificationsCaptured:questions.length>0 && unanswered.length===0 && proposedDateValid,
    disputed:questions.some(q=>MATERIAL_CHANGE_ANSWERS.has(answers[q.id])),
    pendingIndependentEvidence:BASE_PENDING,
    sourceVerified:false,collectorAuthorityVerified:false,
    recipientAuthorityVerified:false,providerCertified:false,
    legalDebtEstablished:false,agreementAccepted:false,
    paymentAuthorized:false,recurringDebitAuthorized:false,
    refundAuthorized:false,financialExecutionAllowed:false,
  });
}
export function canExaminationAuthorizeMoney() {return false;}


/**
 * Exact draft-only mapping to the server's finite C6 clarification vocabulary.
 * No payment or evidence request is sent by this function. The server must
 * still authenticate self, re-check original C5B hashes and validate relevance.
 */
const CODE_FOR_HUMAN_QUESTION=Object.freeze({
  source:'ORIGINAL_SOURCE',period:'NO_AUTO_DEBIT',
  supplier:'SHARED_PURPOSE',term:'PRIVATE_SCHOOL_BILL',
  start:'SERVICE_START',condition:'ITEM_CONDITION',bill:'ACTUAL_OBLIGATION',
  levy:'RECURRING_PERIOD',route:'ROUTE_AND_SERVICE',
  membership:'RECURRING_PERIOD',rent:'RECURRING_PERIOD',
  rotation:'GROUP_ROTATION',project:'SHARED_PURPOSE',
  cause:'VOLUNTARY_NOT_DEBT',giving:'VOLUNTARY_NOT_DEBT',
  education:'EDUCATION_BENEFICIARY',event:'EVENT_DELIVERY',
});
const SPECIAL_ANSWER=Object.freeze({
  'need-help':'NEED_ASSISTANCE',
});
export function toCanonicalClarification(question,answerId,proposedDate=null) {
  if (!question || !question.options.some(o=>o.id===answerId)) return null;
  const questionCode=CODE_FOR_HUMAN_QUESTION[question.id];
  if (!questionCode) return null;
  const answerCode=SPECIAL_ANSWER[answerId] ||
    answerId.replace(/-/g,'_').toUpperCase();
  const needsDate=questionCode==='SERVICE_START' && answerCode==='PROPOSE_DATE';
  if (needsDate && !isCalendarDate(proposedDate)) return null;
  if (!needsDate && proposedDate != null) return null;
  return Object.freeze({
    questionCode,answerCode,
    proposedDate:needsDate?proposedDate:null,
    evidenceVerified:false,moneyAuthorized:false,
  });
}

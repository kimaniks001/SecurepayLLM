/**
 * A local, inspectable guided-intake model for "Collect money" in SecurePay Mini.
 * These are question/answer prompts, NOT an LLM, accepted Agreement, charity
 * approval, authorization proof, provider rail, SecureLink or money movement.
 * Never store raw answers in browser storage or send them to analytics.
 */
export const COLLECT_STAGES = Object.freeze([
  'beneficiary','beneficiaryDetail','purpose','consent','recipient',
  'recipientAuthority','goal','targetAmount','reporting','disclosure','review'
]);

const option = (id,label) => ({id,label});
const bounded = (text) => typeof text === 'string' ? text.trim().replace(/\s+/g,' ').slice(0,160) : '';
const hasSensitiveIdentifier = (value) =>
  /(?:\d[ -]?){8,}|(?:@|https?:\/\/)|\b(?:password|pin code|otp|id number|account number)\b/i.test(value);

export function startCollectInterview(seed='') {
  const mother = /\b(?:my|our)\s+(?:mother|mum|mom|mama)\b/i.test(seed);
  return {
    stage:mother ? 'purpose' : 'beneficiary',
    answers:mother ? {beneficiary:'mother', beneficiaryLabel:'My mother'} : {},
    turns:mother ? [{stage:'beneficiary',answer:'My mother'}] : [],
    lastError:'',
  };
}

export function collectQuestion(state) {
  const a=state.answers || {};
  const forMother=a.beneficiary==='mother';
  const relation=forMother?'your mother':a.beneficiary==='group'?'the group':'the person';
  switch(state.stage) {
    case 'beneficiary':return {
      text:'Who is this collection for?',
      note:'I can help you prepare it without taking payments or publishing anything.',
      options:[option('mother','My mother'),option('self','For me'),option('other','Someone else'),option('group','A group or cause')],
    };
    case 'beneficiaryDetail':return {
      text:'How is this person connected to you?',
      note:'A relationship is enough for now. Please do not type their full name or ID.',
      options:[],placeholder:'For example: my father',
    };
    case 'purpose':return {
      text:'What will the contributions help pay for?',
      note:forMother
        ? 'You mentioned your mother. Describe the purpose, not her private medical history.'
        : 'Keep it practical. No private documents or account details needed here.',
      options:[
        option('medical','Hospital or treatment bills'),
        option('living','Food and household needs'),
        option('rent','Rent or living expenses'),
      ],placeholder:'Or describe the purpose briefly',
    };
    case 'consent':return {
      text:forMother ? 'Does your mother know about this collection and agree to it?' :
        a.beneficiary==='group'?'Has the group authorised you to organise this collection?':
        'Does this person know about the collection and agree to it?',
      note:'An answer here is your statement, not yet independently verified consent.',
      options:[option('yes',forMother?'Yes, she agrees':'Yes, they agree'),option('pending','Not yet — I need to ask'),option('unable',forMother?'She cannot currently give consent':'They cannot currently give consent')],
    };
    case 'recipient':return {
      text:'Who would receive and control the contributions?',
      note:'We are identifying the proposed arrangement, not requesting an account number.',
      options:[
        option('beneficiary',a.beneficiary==='self'?'Me, as the beneficiary':forMother?'My mother':'The beneficiary'),
        option('provider','Pay a provider directly'),
        option('collector','Me, collecting on their behalf'),
        option('other','Another authorised person or group'),
      ],
    };
    case 'recipientAuthority':return {
      text:'Has '+relation+' authorised that person to receive or manage the money?',
      note:'Collecting for someone does not automatically mean you may handle their funds.',
      options:[option('yes','Yes, they authorised it'),option('pending','Not yet'),option('unable','They cannot currently authorise it')],
    };
    case 'goal':return {
      text:'Do you have a target amount?',
      note:'Contributors may choose their own amount unless the accepted terms say otherwise.',
      options:[option('target','Yes, set a target'),option('open','No fixed target')],
    };
    case 'targetAmount':return {
      text:'What is the target in KSh?',
      note:'This is your proposed goal, not verified expenditure or money already raised.',
      options:[],placeholder:'For example: 25000',inputMode:'decimal',
    };
    case 'reporting':return {
      text:'How will contributors know how the money was used?',
      note:'Keep promises realistic. No receipts or expenditure have been verified yet.',
      options:[
        option('updates','Share progress and spending updates'),
        option('receipts','Show receipts when available'),
        option('undecided','We have not decided yet'),
      ],
    };
    case 'disclosure':return {
      text:'What should people see before contributing?',
      note:forMother
        ? 'Your mother’s name, location, records and personal details stay private unless she agrees to share them.'
        : 'Names, exact addresses and private details stay private unless each person agrees to share them.',
      options:[
        option('purpose','Only the purpose and collection terms'),
        option('firstName',forMother?'Her first name, if she authorises it':'A first name, only with permission'),
        option('moreLater','Decide on details with her later'),
      ],
    };
    case 'review':return {text:'Here is the arrangement you described',note:'Prepared locally for review. Nothing has been published or collected.',options:[]};
    default:throw new Error('Unknown collection interview stage');
  }
}

function nextStage(stage,answers) {
  if(stage==='beneficiary')return answers.beneficiary==='other' ? 'beneficiaryDetail':'purpose';
  if(stage==='beneficiaryDetail')return 'purpose';
  if(stage==='purpose')return answers.beneficiary==='self'?'recipient':'consent';
  if(stage==='consent')return 'recipient';
  if(stage==='recipient')return answers.beneficiary!=='self' && ['collector','other'].includes(answers.recipient)
    ? 'recipientAuthority':'goal';
  if(stage==='recipientAuthority')return 'goal';
  if(stage==='goal')return answers.goal==='target'?'targetAmount':'reporting';
  if(stage==='targetAmount')return 'reporting';
  if(stage==='reporting')return 'disclosure';
  if(stage==='disclosure')return 'review';
  return 'review';
}

export function answerCollectInterview(state,value) {
  const stage=state.stage;
  if(stage==='review')return {...state,lastError:'Review the collection before continuing.'};
  const q=collectQuestion(state);
  const raw=bounded(value);
  if(!raw) return {...state,lastError:'Please answer this question to continue.'};
  let answer=raw;
  const choices=q.options||[];
  if(choices.length && stage!=='purpose'){
    const chosen=choices.find(item=>item.id===raw);
    if(!chosen) return {...state,lastError:'Please choose one of the options shown.'};
    answer=chosen.id;
  }
  if(stage!=='targetAmount' && hasSensitiveIdentifier(raw))return {...state,lastError:'Please leave phone numbers, ID numbers, accounts and private details out of this draft.'};
  const a={...state.answers};
  let shown=raw;
  if(stage==='beneficiary') {
    a.beneficiary=answer;
    a.beneficiaryLabel=choices.find(c=>c.id===answer)?.label||answer;
    shown=a.beneficiaryLabel;
  } else if(stage==='beneficiaryDetail') {
    if(raw.length>80)return {...state,lastError:'A short relationship is enough.'};
    a.beneficiaryLabel=raw;shown=raw;
  } else if(stage==='purpose') {
    const pick=choices.find(c=>c.id===raw);
    a.purpose=pick?.label||raw;
    if(a.purpose.length>160)return {...state,lastError:'Please use a shorter purpose.'};
    shown=a.purpose;
  } else if(stage==='targetAmount') {
    const cleaned=raw.replace(/,/g,'');
    if(!/^[1-9]\d{0,8}(?:\.\d{1,2})?$/.test(cleaned))
      return {...state,lastError:'Please enter a reasonable KSh amount without a phone or account number.'};
    a.targetAmount=cleaned;
    shown='KSh '+Number(cleaned).toLocaleString('en-KE',{maximumFractionDigits:2});
  } else {
    a[stage]=answer;
    shown=choices.find(c=>c.id===answer)?.label||answer;
  }
  return {
    stage:nextStage(stage,a),
    answers:a,
    turns:[...state.turns,{stage,answer:shown}].slice(0,16),
    lastError:'',
  };
}

export function collectionReview(state) {
  if(state.stage!=='review')return null;
  const a=state.answers;
  const needs=[];
  if(a.beneficiary!=='self'){
    if(a.consent!=='yes')needs.push('Beneficiary consent or independently verified lawful authority is still needed before publishing.');
    else needs.push('Verify the beneficiary’s stated consent through an authorised process.');
  }
  if(['collector','other'].includes(a.recipient) && a.beneficiary!=='self'){
    if(a.recipientAuthority!=='yes')needs.push('Authority to receive or manage these funds is not established.');
    else needs.push('Independently verify who may receive and manage contributions.');
  }
  if(a.reporting==='undecided')needs.push('Agree how contributors will receive spending updates.');
  if(a.disclosure==='firstName')needs.push('Confirm consent before displaying a beneficiary’s first name.');
  needs.push('Verify identities, destination, contributor terms and any required provider checks before a public collection.');
  const recipientLabels={
    beneficiary:a.beneficiary==='self'?'The beneficiary (organiser)':'The beneficiary',
    provider:'A provider, subject to confirmation',
    collector:'The organiser, subject to authority',
    other:'Another person or group, subject to verification',
  };
  const reportingLabels={updates:'Progress and spending updates',receipts:'Receipts when available',undecided:'Not decided'};
  return {
    beneficiary:a.beneficiaryLabel||'Not specified',
    purpose:a.purpose||'Not specified',
    consent:a.beneficiary==='self'?'Not applicable — for self':
      a.consent==='yes'?'Claimed, not verified':a.consent==='pending'?'Not yet obtained':'Consent or lawful authority needs review',
    recipient:recipientLabels[a.recipient]||'Not specified',
    target:a.goal==='target' && a.targetAmount
      ? 'KSh '+Number(a.targetAmount).toLocaleString('en-KE',{maximumFractionDigits:2})
      :'Contributors choose the amount',
    reporting:reportingLabels[a.reporting]||'Not specified',
    disclosure:a.disclosure==='purpose'?'Purpose and terms only':
      a.disclosure==='firstName'?'First name only after consent':'Decide with beneficiary later',
    checks:needs,
    publishable:false,paid:false,agreementAccepted:false,
  };
}

/** Plain words intended for review, NOT an automatically transmitted campaign. */
export function proposedCollectionDraft(state) {
  const review=collectionReview(state);
  if(!review)return null;
  return {
    description:review.purpose,
    amount:state.answers.goal==='target' ? state.answers.targetAmount||'' : '',
    note:'For: '+review.beneficiary+'. Recipient: '+review.recipient+
      '. Permission: '+review.consent+'. Contributor updates: '+review.reporting+
      '. LOCAL PROPOSAL ONLY. No consent, identities, collection account, Agreement or funds verified.',
  };
}

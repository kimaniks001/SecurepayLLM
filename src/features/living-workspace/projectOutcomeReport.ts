import type { CommunityProjectDto } from '../../api/securepay/community/dto';

/** Gate 6: deliberately member-authored PUBLIC narrative. No money/evidence source
 * is serialized into Community. Agreement ids, partner names and private files
 * must remain in their own restricted authorities.
 */
export type PublicCostStage='ESTIMATED'|'INCURRED_REPORTED';
export type PublicCost={description:string;amount:string;stage:PublicCostStage};
export type PublicOutcomeDraft={
  projectId:string;title:string;workDone:string;outcome:string;difficulties:string;
  lessons:string;nextOpportunity:string;currency:string;costs:PublicCost[];
};
export const newPublicOutcome=():PublicOutcomeDraft=>({
  projectId:'',title:'',workDone:'',outcome:'',difficulties:'',
  lessons:'',nextOpportunity:'',currency:'KES',costs:[],
});
export const projectIsPublic=(p:CommunityProjectDto,agreementId:string)=>
  p.circleId===null && (p.status==='ACTIVE'||p.status==='COMPLETED')
  && (p.agreementId===null||p.agreementId===agreementId);

const clean=(x:string)=>x.trim().replace(/\s+/g,' ');
const privatePattern=/(?:\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b)|(?:\b(?:\+?254|0)(?:[\s-]?\d){9}\b)|(?:\bKS[\s-]?\d{3,}\b)|(?:https?:\/\/\S*\/(?:agreement|invitations?|evidence|private|token)\b)/i;
function minor(amount:string):bigint|null {
  const x=amount.trim().replace(/,/g,'');
  if(!/^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/.test(x))return null;
  const [a,b='']=x.split('.');
  const v=BigInt(a)*100n+BigInt(b.padEnd(2,'0'));
  return v>0n?v:null;
}
const money=(x:bigint):string=>{
  const whole=(x/100n).toString().replace(/\B(?=(\d{3})+(?!\d))/g,',');
  return whole+'.'+String(x%100n).padStart(2,'0');
};
export function outcomeChecks(d:PublicOutcomeDraft,project:CommunityProjectDto|null,agreementId:string):string[]{
  const problems:string[]=[];
  if(!project||project.id!==d.projectId||!projectIsPublic(project,agreementId))
    problems.push('Select a current public Community Project; a private Circle Project or unrelated Agreement cannot be published here.');
  if(clean(d.title).length<5)problems.push('Give this public outcome a meaningful title.');
  if(clean(d.workDone).length<15)problems.push('Describe the work you personally know was done.');
  if(clean(d.outcome).length<15)problems.push('Describe what changed and what remains unfinished.');
  if(!/^[A-Z]{3}$/.test(d.currency))problems.push('Use a valid three-letter currency code.');
  if(d.costs.length>8)problems.push('Keep the public cost account to eight summarised entries or fewer.');
  for(const c of d.costs){
    if(clean(c.description).length<3||minor(c.amount)===null)
      problems.push('Every published cost needs a clear description and a positive amount with no more than two decimal places.');
  }
  if([d.title,d.workDone,d.outcome,d.difficulties,d.lessons,d.nextOpportunity,
      ...d.costs.map(x=>x.description)].some(x=>privatePattern.test(x)))
    problems.push('Possible private phone, KS Number, email or restricted link detected. Remove it before sharing publicly.');
  return problems;
}
export function publicOutcomeBody(d:PublicOutcomeDraft):string {
  const rows=[
    'MEMBER-REPORTED PROJECT OUTCOME — NOT AN AGREEMENT OR MONEY CERTIFICATION',
    'Work reported:\n'+clean(d.workDone),
    'Outcome and what remains:\n'+clean(d.outcome),
  ];
  if(clean(d.difficulties))rows.push('Challenges and unfinished matters:\n'+clean(d.difficulties));
  if(clean(d.lessons))rows.push('What we learned:\n'+clean(d.lessons));
  if(d.costs.length){
    const estimates=d.costs.filter(c=>c.stage==='ESTIMATED');
    const incurred=d.costs.filter(c=>c.stage==='INCURRED_REPORTED');
    rows.push('PUBLIC COST ACCOUNT — ALL FIGURES MEMBER-REPORTED, NOT VERIFIED BY SECUREPAY');
    for(const [group,items] of [['Estimated costs',estimates],['Reported costs incurred',incurred]] as const){
      if(!items.length)continue;
      rows.push(group+':\n'+items.map(c=>'• '+clean(c.description)+': '+d.currency+' '+money(minor(c.amount)!)).join('\n'));
      rows.push(group+' subtotal (member-reported): '+d.currency+' '+
        money(items.reduce((sum,c)=>sum+minor(c.amount)!,0n)));
    }
    rows.push('These entries are not bank-settled expenses, certified wages, or proof that SecurePay funded or released money.');
  }else rows.push('No public cost figures supplied. Private Agreement/Money records were not copied.');
  if(clean(d.nextOpportunity))rows.push('What could happen next (proposal, not an awarded job):\n'+clean(d.nextOpportunity));
  rows.push('This story is a member account, shared by choice. Other people’s private Agreements, evidence, identity and payment records remain private. Questions or corrections should be raised through the relevant authorised channels.');
  return rows.join('\n\n');
}

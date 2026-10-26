/** Allowlisted, UI-only hints. Server remains authoritative for trade reasoning and terms.
 * Never turn a suggested answer into a fact until the user explicitly selects it.
 */
export type AnswerAction =
  | {type:'answer';label:string;value:string}
  | {type:'mini';label:string;kind:'date'|'time'|'money'|'person'|'place'}
  | {type:'focus';label:string}
  | {type:'tool';label:string;tool:'Photos'|'Places'|'People & Invitations'}
  | {type:'local-day';label:string;days:0|1};
export type QuestionIntent='date'|'time'|'currency'|'money'|'person'|'place'|'goods'|'confirmation'|'unknown';
export function questionIntent(question:string):QuestionIntent{
  const q=question.toLowerCase().trim();
  if(!q.endsWith('?'))return 'unknown';
  // Currency is a separate decision from amount. Identify it BEFORE the generic money words.
  // Never infer a currency from the person's location, a KES-looking example, or the amount.
  if(/\bcurrency\b|\b(?:kes|usd|eur|gbp)\s+or\s+(?:kes|usd|eur|gbp)\b|(?:shillings?|dollars?|pounds?|euros?)\s+or\s+(?:shillings?|dollars?|pounds?|euros?)|\b(?:is|are)\s+(?:this|that|it|the amount|the price|the total)\s+in\s+(?:kes|usd|eur|gbp)\s*\?/.test(q))return 'currency';
  if(/how much|price|amount|cost|fee|budget|payment|deposit/.test(q))return 'money';
  if(/what (goods|items|products|materials|are we deliver|is being deliver|will be deliver)|what.*(deliver|transport|supply|buy)|which (goods|items)|quantity|how many|what exactly is being provided or done|what work or item are you arranging/.test(q))return 'goods';
  if(/what time|which time|at what time/.test(q))return 'time';
  if(/when|which date|what date|day|deadline|delivery date|start date/.test(q))return 'date';
  if(/where|which location|what address|pickup|collection point|delivery site|drop.off|destination/.test(q))return 'place';
  if(/who|which person|which supplier|who will|who is|responsible|recipient|buyer|seller/.test(q))return 'person';
  if(/confirm|is that correct|does this look right|shall we proceed/.test(q))return 'confirmation';
  return 'unknown';
}
export function answerActions(question:string):AnswerAction[]{
  switch(questionIntent(question)){
    case 'date':return [{type:'local-day',label:'Today',days:0},{type:'local-day',label:'Tomorrow',days:1},{type:'mini',label:'Choose date',kind:'date'},{type:'answer',label:'Not decided',value:'The date is not decided yet.'},{type:'focus',label:'I’ll explain'}];
    case 'time':return [{type:'mini',label:'Choose time',kind:'time'},{type:'answer',label:'Time to be agreed',value:'The exact time is to be agreed.'},{type:'focus',label:'I’ll explain'}];
    case 'currency':return [
      {type:'answer',label:'KES',value:'The currency for the amount we were discussing is KES (Kenyan shillings).'},
      {type:'answer',label:'USD',value:'The currency for the amount we were discussing is USD (US dollars).'},
      {type:'answer',label:'EUR',value:'The currency for the amount we were discussing is EUR (euros).'},
      {type:'answer',label:'GBP',value:'The currency for the amount we were discussing is GBP (British pounds).'},
      {type:'focus',label:'Other currency'},
      {type:'answer',label:'Not sure yet',value:'The currency has not been decided yet.'},
    ];
    case 'money':return [{type:'mini',label:'Enter amount',kind:'money'},{type:'answer',label:'Not agreed yet',value:'The amount is not agreed yet.'},{type:'focus',label:'I’ll explain'}];
    case 'person':return [{type:'mini',label:'Choose person',kind:'person'},{type:'answer',label:'Not chosen yet',value:'The person is not yet chosen.'},{type:'focus',label:'I’ll explain'}];
    case 'place':return [{type:'tool',label:'Choose place',tool:'Places'},{type:'mini',label:'Type place',kind:'place'},{type:'answer',label:'Not sure yet',value:'The location is not decided yet.'},{type:'focus',label:'I’ll explain'}];
    case 'goods':return [{type:'focus',label:'Describe the work or goods'},{type:'tool',label:'Add photo',tool:'Photos'}];
    case 'confirmation':return [{type:'answer',label:'That looks correct',value:'That looks correct to me, but this does not accept or execute any Agreement.'},{type:'focus',label:'I need to change something'}];
    default:return []; // Never display generic suggestions for questions we have not understood.
  }
}

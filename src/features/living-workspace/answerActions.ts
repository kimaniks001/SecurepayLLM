/**
 * Bound, human-readable KS001 answer affordances.
 *
 * Server-provided answer choices have priority when the server supplies a plan;
 * this fallback only recognises the semantic shape of a real question.
 * It cannot execute tools by name supplied by an LLM.
 */
export type MiniAnswerKind = 'date'|'time'|'money'|'person'|'place';
export type AnswerAction =
  | { id:string;label:string;kind:'answer';answer:string }
  | { id:string;label:string;kind:'mini';input:MiniAnswerKind }
  | { id:string;label:string;kind:'shelf';tool:'Photos'|'Places'|'People & Invitations' }
  | { id:string;label:string;kind:'compose' };

const action=(id:string,label:string,answer:string):AnswerAction=>({id,label,kind:'answer',answer});
const mini=(id:string,label:string,input:MiniAnswerKind):AnswerAction=>({id,label,kind:'mini',input});
const shelf=(id:string,label:string,tool:'Photos'|'Places'|'People & Invitations'):AnswerAction=>({id,label,kind:'shelf',tool});
const compose=(label='I’ll explain'):AnswerAction=>({id:'type',label,kind:'compose'});

export function questionActions(question:string, serverChoices:readonly string[] = []): AnswerAction[] {
  const q=question.trim().toLowerCase();
  if (!q.includes('?') || q.length>600) return [];
  // Trust only bounded HUMAN CHOICES from the server's planned open point, not arbitrary tool names.
  const grounded=[...new Set(serverChoices.map(c=>c.trim()).filter(c=>c.length>0&&c.length<=70))].slice(0,3);
  if(grounded.length) return [...grounded.map((value,i)=>action('choice-'+i,value,value)),compose()];
  if(/what (goods|item|items|product|products|parcel|package)|what (is|are) (being |we |you )?(deliver|transport|ship|send|supply)|what exactly is being provided or done|what are we delivering/i.test(q))
    return [action('parcel','Parcel','A parcel'),action('food','Food','Food'),action('furniture','Furniture','Furniture'),shelf('photo','Add photo','Photos'),compose('Something else')];
  if(/what (work|job|service)|what are (you|we) (doing|arranging)|what exactly.*(work|done)/i.test(q))
    return [compose('Describe the work'),shelf('photo','Add photo','Photos')];
  if(/who|which (person|supplier|seller|buyer)|responsib|provider|recipient|receiver|deliverer/i.test(q))
    return [mini('person','Choose person','person'),shelf('people','People & invitations','People & Invitations'),compose('I’ll give the name')];
  if(/where|location|address|collection (point|site)|drop.?off|pick.?up|destination|site|entrance/i.test(q))
    return [mini('place','Enter place','place'),shelf('map','Choose place','Places'),compose('I’ll describe it')];
  if(/what time|which time|time of day|at what time/i.test(q))
    return [mini('time','Choose time','time'),action('later','Not decided','Not decided yet'),compose()];
  if(/when|which date|what date|delivery date|deadline|by what day|day should/i.test(q))
    return [action('today','Today','today'),action('tomorrow','Tomorrow','tomorrow'),mini('date','Choose date','date'),action('later','Not decided','Not decided yet')];
  if(/how much|price|amount|cost|budget|charge|fee|deposit|payment/i.test(q))
    return [mini('amount','Enter amount','money'),action('later','To be agreed','To be agreed'),compose('I’ll explain')];
  if(/how.*(confirm|verify|accept|check|acknowledge)|evidence|proof|inspection/i.test(q))
    return [shelf('evidence','Add photo','Photos'),compose('Explain how to verify')];
  if(/full price or (a )?deposit|which total/i.test(q))
    return [action('total','Full price','Full price'),action('deposit','Deposit','Deposit'),compose()];
  return [compose()];
}

/** Calendar-day answers use the local civil date. No time or deadline is inferred. */
export function localCalendarDate(which:'today'|'tomorrow',now=new Date()):string {
  const day=new Date(now.getFullYear(),now.getMonth(),now.getDate()+(which==='tomorrow'?1:0));
  const n=(v:number)=>String(v).padStart(2,'0');
  return day.getFullYear()+'-'+n(day.getMonth()+1)+'-'+n(day.getDate());
}

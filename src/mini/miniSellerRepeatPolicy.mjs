/**
 * Mini Phase 6C/D: private reusable WORDS and proposed timing, not a mandate.
 * No previous buyer/price/stock/rights is ever replayed.
 */
const CADENCES=new Set(['ONE_TIME','WEEKLY','MONTHLY','ON_REQUEST']);
const STOPS=new Set(['EACH_CYCLE_CONFIRM','UNTIL_DATE']);
export function miniSellerRepeatTemplate(input) {
  if(!input || typeof input.title!=='string' || !input.title.trim() ||
     input.title.trim().length>160 || typeof input.referenceKey!=='string' ||
     !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.referenceKey))
    return null;
  const cadence=CADENCES.has(input.cadence)?input.cadence:null;
  const stopRule=STOPS.has(input.stopRule)?input.stopRule:null;
  if(!cadence || !stopRule || (cadence==='ONE_TIME' && stopRule!=='EACH_CYCLE_CONFIRM'))return null;
  let untilDate=null;
  if(stopRule==='UNTIL_DATE'){
    if(typeof input.untilDate!=='string'|| !/^\d{4}-\d{2}-\d{2}$/.test(input.untilDate))return null;
    const parsed=new Date(input.untilDate+'T00:00:00Z');
    if(!Number.isFinite(parsed.getTime())||parsed.toISOString().slice(0,10)!==input.untilDate)return null;
    // Scheduling is not inferred: the backend checks its own current-date rule.
    untilDate=input.untilDate;
  }else if(input.untilDate)return null;
  const termsHint=typeof input.termsHint==='string'?
    input.termsHint.trim().slice(0,500)||null:null;
  return {kind:'TEMPLATE',referenceKey:input.referenceKey,label:input.title.trim(),
    termsHint,cadence,stopRule,untilDate,ownerConfirms:true};
}
export function miniSellerRepeatTiming(entry){
  if(!entry||entry.kind!=='TEMPLATE'||!CADENCES.has(entry.cadence)||entry.cadence==='ONE_TIME')
    return '';
  const label={WEEKLY:'Weekly',MONTHLY:'Monthly',ON_REQUEST:'When requested'}[entry.cadence];
  if(!label)return '';
  const stop=entry.stopRule==='UNTIL_DATE'&&entry.untilDate
    ? 'Proposed end date: '+entry.untilDate
    : 'Each occurrence requires a fresh agreement';
  return 'Proposed repeat arrangement: '+label+'. '+stop+
    '. No automatic renewal, performance, invoice or payment.';
}

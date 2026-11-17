/**
 * Source-grounded clarification questions for a buyer's proposed basket.
 *
 * Never invent mandatory requirements not evidenced by published offer text.
 * A buyer's answer is a preference/proposed term, never a verified supplier
 * promise; the accepted Agreement must still be constructed server-side.
 */
const short=(value,max=240)=>String(value??'').trim().slice(0,max);
export function miniBasketQuestions(lines,answers={}){
  const questions=[];
  const seen=new Set();
  const add=(q)=>{
    if(!seen.has(q.id)){seen.add(q.id);questions.push(q);}
  };
  for(const line of Array.isArray(lines)?lines:[]){
    const d=short(line.description,900);
    const title=short(line.title,200);
    const source=(title+' '+d).toLowerCase();
    const key=short(line.sellerKsNumber,20)+':'+short(line.offerId,80);
    const common={offerId:line.offerId,sellerKsNumber:line.sellerKsNumber,offerTitle:title};
    // Product options must come from what this exact Store says is undecided.
    if(line.kind==='PRODUCT'&&/colou?r (?:to confirm|to be agreed|choice)|colou?r available/i.test(source))
      add({...common,id:key+':colour',type:'text',
        title:'Which colour would you like for '+title+'?',
        hint:'Tell the Store your preference, or say you need advice.',
        placeholder:'Your preferred colour or need advice',maxLength:120});
    if(line.kind==='PRODUCT'&&/(diameter|size) (?:to be agreed|to confirm)|correct diameter/i.test(source))
      add({...common,id:key+':size',type:'text',
        title:'Which size or diameter do you need?',
        hint:'Share the size if you know it; otherwise ask the Store to advise.',
        placeholder:'Size or please advise',maxLength:120});
    if(line.kind==='PRODUCT'&&/compatib(?:le|ility).*agree|compatible.*confirm/.test(source))
      add({...common,id:key+':compatibility',type:'text',
        title:'What should '+title+' work with?',
        hint:'Give the existing equipment or say the Store should help you check.',
        placeholder:'Model, equipment or please advise',maxLength:180});
    // Only services whose published words name undecided essentials prompt
    // the buyer for them. A fixed-price service without such requirements
    // should never be forced through generic onboarding questions.
    if(line.kind==='SERVICE'&&/scope (?:to be agreed|to agree|needs? (?:agreement|confirmation))|actual hours .* to agree/i.test(source))
      add({...common,id:key+':scope',type:'text',
        title:'What work do you want done?',
        hint:'A short description helps the provider review the scope.',
        placeholder:'Describe the work you need',maxLength:240});
    if(line.kind==='SERVICE'&&/appointment|start date|visit time|timing (?:to be agreed|to agree)|date to be agreed/i.test(source))
      add({...common,id:key+':schedule',type:'choice',
        title:'When would suit you for '+title+'?',
        hint:'This is your preference. The provider confirms the appointment.',
        choices:[['soon','As soon as arranged'],['next-week','Next week'],['agree','Let the provider suggest']]});
    if(line.kind==='SERVICE'&&/on-site|site (?:visit|assessment)|at your (?:home|site)/i.test(source))
      add({...common,id:key+':site',type:'text',
        title:'Where will this service take place?',
        hint:'Provide an area or landmark; no exact home address is needed at this stage.',
        placeholder:'Area or landmark',maxLength:180});
  }
  const required=questions.filter(q=>!short(answers[q.id],q.maxLength||240));
  return {questions,nextQuestion:required[0]??null,
    complete:required.length===0,resolved:questions.length-required.length,
    outstanding:required.length};
}
export function miniBasketAnswersForOffer(lines,answers={}){
 const q=miniBasketQuestions(lines,answers);
 return q.questions.filter(x=>short(answers[x.id])).map(x=>({
  offerId:x.offerId,sellerKsNumber:x.sellerKsNumber,question:x.title,
  proposedAnswer:short(answers[x.id],x.maxLength||240),
 }));
}

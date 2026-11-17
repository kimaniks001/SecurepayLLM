/**
 * Human-facing Store-image review prompts. No typing needed.
 * This is copy and UI intent only, NEVER review authority.
 * A real evidence resubmission needs a server-ingested new source and
 * authenticated, exact-offer-version backend validation.
 */
const topics={
  PHOTO_SOURCE:{
    question:'Where did the photo come from?',
    detail:'Help the reviewer understand the photo source. Your answer is not proof of ownership.',
    first:'Add a source document', tool:'documents'
  },
  SUPPLIER_PERMISSION:{
    question:'May you use this supplier photo?',
    detail:'A supplier image and permission to use it are different things.',
    first:'Add supplier permission', tool:'documents'
  },
  SELLER_AUTHORITY:{
    question:'Are you authorised to offer this?',
    detail:'Show what gives you permission to sell or represent the goods.',
    first:'Add seller authorisation', tool:'documents'
  },
  PHOTO_CLARITY:{
    question:'Could we see a clearer photo?',
    detail:'A clearer photo may help the reviewer understand your offer.',
    first:'Choose another photo', tool:'photos'
  },
  OFFER_DETAILS:{
    question:'Could you clarify the offer details?',
    detail:'A clearer description can help, but changing an offer may require a new review version.',
    first:'Improve description', tool:'describe'
  },
  OTHER:{
    question:'One more detail is needed.',
    detail:'Check the photo and supporting information before requesting another review.',
    first:'Add supporting information', tool:'documents'
  }
};
const clean=x=>typeof x==='string'?x:'';
export function miniSellerReviewAnswerPills(status,topic){
  const key=Object.prototype.hasOwnProperty.call(topics,topic)?topic:'OTHER';
  const item=topics[key];
  if(status==='RESUBMITTED_FOR_REVIEW')
    return {status,question:'Your new evidence is awaiting review.',
      detail:'The request is not approved. SecurePay will review the linked source and offer version.',
      pills:[{id:'wait',label:'Keep this for later'}],canPublish:false,canIssueIdentimark:false};
  if(status==='REJECTED')
    return {status,question:'This photo cannot be used in the offer right now.',
      detail:'Remove it or prepare a different, properly authorised photo. No approval has been issued.',
      pills:[{id:'photos',label:'Use another photo'},{id:'remove',label:'Remove photo'},{id:'save',label:'Save offer'}],
      canPublish:false,canIssueIdentimark:false};
  if(status==='ESCALATED')
    return {status,question:'This photo needs further independent review.',
      detail:'The seller cannot approve it by answering a question.',
      pills:[{id:'save',label:'Save for later'},{id:'help',label:'Ask KS001'}],
      canPublish:false,canIssueIdentimark:false};
  if(status!=='MORE_INFORMATION_REQUIRED')return null;
  return {status,question:item.question,detail:item.detail,
    pills:[{id:item.tool,label:item.first},{id:'submitted',label:"I've added proof"},
      {id:'save',label:'I need more time'},{id:'remove',label:'Remove photo'},
      {id:'help',label:'Ask KS001'}],
    canPublish:false,canIssueIdentimark:false};
}

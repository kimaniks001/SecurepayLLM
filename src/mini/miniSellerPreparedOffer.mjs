/**
 * Phase 2: local Offer Preparation -> Store contract adapter.
 *
 * The Store payload is deliberately UNPUBLISHED and NOT submitted. A candidate
 * is not a canonical source, verified stock, invitation, Agreement or payment.
 * Never append local photo/document names to Store mediaRefs or credentialRefs.
 */
const clean=(value,max)=>typeof value==='string'?value.trim().slice(0,max):'';
const moneyMinor=value=>{
  if(typeof value!=='string')return null;
  const raw=value.trim();
  if(!/^(?:\d{1,10}|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/.test(raw))return null;
  const number=Number(raw.replaceAll(',',''));
  const minor=Math.round(number*100);
  return Number.isSafeInteger(minor)&&minor>0&&minor<=1_000_000_000_000?minor:null;
};
const allowedCategories=new Set(['Goods','Agriculture','Equipment','Furniture','Services','Capacity']);
const normalizedQuantity=value=>{
  const raw=clean(value,30);
  if(!raw)return null;
  if(!/^\d+(?:\.\d{1,3})?$/.test(raw))return undefined;
  const parsed=Number(raw);
  return Number.isFinite(parsed)&&parsed>0&&parsed<=1_000_000?parsed:undefined;
};
const safeArray=(input,max)=>Array.isArray(input)?input.slice(0,max):[];

export function miniSellerPreparedOffer(input){
  if(!input||typeof input!=='object')return {ok:false,error:'The offer details could not be read.'};
  // Never silently discard a material seller condition before the reviewed
  // KS001 handoff. Local text controls and server contracts have firm limits.
  for(const [field,max] of Object.entries({
    title:240,description:2000,condition:300,specifications:800,
    purpose:300,included:300,limitations:600,warranty:600,
    place:300,timing:600,availability:160,rightType:80,unit:40
  })){
    if(typeof input[field]==='string' && input[field].trim().length>max){
      return {ok:false,error:'The '+field+' details are too long. Please shorten and review them before continuing.'};
    }
  }
  const title=clean(input.title,240);
  if(!title)return {ok:false,error:'Describe what you are selling first.'};
  const category=allowedCategories.has(input.category)?input.category:'Goods';
  const kind=category==='Services'?'SERVICE':category==='Capacity'?'CAPACITY':'PRODUCT';
  const quote=input.priceType==='quote';
  const priceMinor=quote?null:moneyMinor(input.price);
  if(!quote&&priceMinor===null)return {ok:false,error:'Enter a valid positive amount or choose price to agree.'};
  const count=normalizedQuantity(input.quantity);
  if(count===undefined)return {ok:false,error:'Check the quantity. Enter a number greater than zero.'};
  const priceUnit=clean(input.unit,40)|| (kind==='SERVICE'?'job':kind==='CAPACITY'?'hour':'each');
  const availability=clean(input.availability,160);
  const photoMetadata=safeArray(input.photos,4).map((p,i)=>({
    localOrdinal:i+1,name:clean(p?.name,120),source:clean(p?.source,20)||'unknown',
    permissionDeclared:Boolean(p?.supplierPermission),status:'LOCAL_UNVERIFIED'
  }));
  const documents=safeArray(input.documents,5).map(d=>({
    name:clean(d?.name,120),purpose:clean(d?.purpose,80),status:'FILENAME_ONLY_NOT_UPLOADED'
  }));
  const persons=safeArray(input.people,8).map(p=>({
    label:clean(p?.name,120),role:clean(p?.role,60),status:'NOT_INVITED_OR_VERIFIED'
  }));
  const placeLabel=clean(input.place,300), timing=clean(input.timing,600);
  const descriptionApproved=Boolean(input.descriptionReviewed)&&Boolean(clean(input.description,2000));
  const description=descriptionApproved?clean(input.description,2000):null;
  const offerTerms={
    category,kind,title,description:description??'',
    // An unapproved description is never quietly presented as if complete.
    descriptionRequiresReview:Boolean(clean(input.description,2000))&&!descriptionApproved,
    pricing:{mode:quote?'QUOTE_REQUIRED':'LISTED_PRICE',priceMinor,currency:'KES',per:priceUnit},
    quantityRequested:count, // A proposed sale quantity is NOT verified inventory.
    // Preserve seller's distinct practical terms even when the generated
    // description was NOT individually approved. Local authoring is never
    // authority, but a real Agreement must not quietly lose conditions.
    commercialDetails:{
      condition:clean(input.condition,300)||null,
      specifications:clean(input.specifications,800)||null,
      purpose:clean(input.purpose,300)||null,
      included:clean(input.included,300)||null
    },
    fulfilment:{
      purpose:['Pickup','Delivery','Work location'].includes(input.placeType)?input.placeType:'To agree',
      placeLabel:placeLabel||null,
      timingProposal:timing||null, // Not a booked appointment.
      availabilityDeclaration:availability||null,
      warranty:clean(input.warranty,600)||null,
      limitations:clean(input.limitations,600)||null,
    },
    proposedPeople:persons, // Identity not resolved, no invitation sent.
    localPhotos:photoMetadata,
    localDocuments:documents,
    authorityDeclaration:Boolean(input.rightToOffer)?clean(input.rightType,80):null,
    status:'LOCAL_UNVERIFIED'
  };
  const storeCandidate={
    kind,title:title.slice(0,140),description,
    priceMinor,
    quantityAvailable:null, // Never convert proposed order count into claimed stock.
    availabilityState:'NEEDS_CONFIRMATION',
    published:false, // NEVER publish based on local authoring, source or pill declarations.
    mediaRefs:[] // Only verified server-media ids can be passed through this API field.
  };
  const moneyText=quote?'Price to agree':
    'KSh '+(priceMinor/100).toLocaleString('en-KE',{minimumFractionDigits:0,maximumFractionDigits:2})+
    ' / '+priceUnit;
  const totalMinor=!quote&&count!==null&&Number.isInteger(count)&&
    Number.isSafeInteger(priceMinor*count)?priceMinor*count:null;
  return {ok:true,offerTerms,storeCandidate,summary:{
    title,kind,category,moneyText,count,priceUnit,
    totalMinor,descriptionApproved,placeLabel,timing,
    persons:persons.length,photos:photoMetadata.length,documents:documents.length
  },boundary:{
    canonical:false,storePublished:false,inventoryConfirmed:false,
    buyerAccepted:false,moneyAuthorized:false,attachmentsUploaded:false,
    imageOwnershipVerified:false,personAuthorityVerified:false
  }};
}

/** Only seller-authored non-file text may be saved into this tab.
 * Names/identifiers of third parties, source files and private meeting notes
 * are excluded. The snapshot can be resumed, never treated as acceptance.
 */
export function miniSellerSafeDraft(input){
  const fields=['title','category','priceType','price','quantity','unit','condition',
    'specifications','purpose','included','limitations','warranty','description',
    'placeType','place','timing','stockStatement'];
  const lengths={title:240,category:24,priceType:8,price:30,quantity:30,unit:40,condition:300,
    specifications:800,purpose:300,included:300,limitations:800,warranty:600,
    description:2000,placeType:24,place:300,timing:600,stockStatement:160};
  const result={version:2,localOnly:true};
  for(const field of fields)result[field]=clean(input?.[field],lengths[field]);
  result.descriptionReviewed=Boolean(input?.descriptionReviewed);
  return result;
}
export function miniSellerRestoreDraft(raw){
  if(!raw||typeof raw!=='object'||raw.version!==2||raw.localOnly!==true)return null;
  const sanitized=miniSellerSafeDraft(raw);
  if(!sanitized.title)return null;
  return sanitized;
}

/**
 * Mini Sell Phase 3: a truthful, quiet local PREPARED-OFFER examiner.
 *
 * Contextual guidance, not legal advice, seller identity verification,
 * image copyright evidence, regulated-goods authorization or a certified
 * publishing decision. Backend authority is intentionally absent from this
 * pure function. No caller-supplied "verified" bool can bypass the gate.
 */
const knownSources=new Set(['own','supplier','permission']);
const short=(x,n=160)=>typeof x==='string'?x.trim().slice(0,n):'';
const check=(key,title,status,detail)=>({key,title,status,detail});
export function miniSellerTrustExamination(input){
  const details=input && typeof input==='object'?input:{};
  const images=Array.isArray(details.photos)?details.photos.slice(0,4):[];
  const documents=Array.isArray(details.documents)?details.documents.slice(0,5):[];
  const sellerDeclared=Boolean(details.rightToOffer)&&Boolean(short(details.rightType,80));
  const availabilityDeclared=Boolean(short(details.stockStatement,160));
  const suspicious=Boolean(details.suspicious);
  const restricted=Boolean(details.sensitive);
  const imageProblems=images.filter(p=>!knownSources.has(p?.source)||
    (p?.source==='supplier'&&!p?.supplierPermission));
  const imageAwaitingRights=images.length>0&&imageProblems.length===0;
  const descriptionReviewed=Boolean(details.descriptionReviewed)&&Boolean(short(details.description,2000));
  const blockers=[];
  if(suspicious)blockers.push('POSSIBLE_PROHIBITED_OFFER');
  if(restricted)blockers.push('REGULATED_CATEGORY_REVIEW_REQUIRED');
  if(imageProblems.length)blockers.push('IMAGE_SOURCE_OR_PERMISSION_MISSING');
  if(!sellerDeclared)blockers.push('RIGHT_TO_OFFER_UNDECLARED');
  if(!availabilityDeclared)blockers.push('AVAILABILITY_UNDECLARED');
  const checks=[
    check('law','Can it be offered?',suspicious||restricted?'NEEDS_SPECIALIST_REVIEW':'NOT_INDEPENDENTLY_CHECKED',
      suspicious||restricted?'Potential restriction must be handled by authorized review.':'Mini has not certified legality or product eligibility.'),
    check('seller','Right to sell',sellerDeclared?'SELLER_DECLARED':'NEEDS_SELLER_ANSWER',
      sellerDeclared?'Seller has stated a basis to offer this; it is not verified.':'Who owns it, or who authorized you to sell it?'),
    check('photos','Photos and image rights',
      imageProblems.length?'NEEDS_SELLER_ANSWER':imageAwaitingRights?'PERMISSION_DECLARED_UNVERIFIED':'NOT_APPLICABLE',
      imageProblems.length?'Clarify each photo source and permission, or remove the photo.':
        imageAwaitingRights?'Source claimed; copyright and image-use rights not independently verified.':
        'No photograph is required for every type of sale.'),
    check('truth','Buyer understanding',
      descriptionReviewed?'SELLER_REVIEWED':'OPTIONAL_IMPROVEMENT',
      descriptionReviewed?'Seller reviewed the description; specifications still have no independent proof.':
        'A clearer description may help a buyer decide.'),
    check('fulfil','Can it be fulfilled?',
      availabilityDeclared?'SELLER_DECLARED':'NEEDS_SELLER_ANSWER',
      availabilityDeclared?'Availability is a seller statement; no stock hold or booking exists.':
        'Ask whether it is available, limited, made to order or to be confirmed.')
  ];
  if(documents.length)checks.push(check('documents','Supporting documents','LOCAL_REFERENCE_ONLY',
    'Documents are local filenames, not uploaded, validated or accepted as proof.'));
  const localReady=blockers.length===0;
  return {
    checks,blockers,
    localReady,
    canShowPreview:localReady,
    canPublish:false,
    canIssueSecureLink:false,
    serverImageUseRegistered:false,
    sellerIdentityVerified:false,
    stockVerified:false,
    independentLegalityVerified:false,
    imageExactDigestVerified:false,
    imagePerceptualMatchChecked:false,
    totalImageIssues:imageProblems.length,
    summary:localReady?'The proposal can be reviewed. Independent checks remain outstanding.':
      'A few important seller answers are still needed.',
    publicationState:'AWAITING_AUTHORITATIVE_SERVER_VERIFICATION'
  };
}

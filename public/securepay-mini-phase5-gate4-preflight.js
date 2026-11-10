/**
 * Phase 5 / Gate 4: OFFLINE source-shape inspections for expansion hosts.
 *
 * This deliberately does NOT activate any host in the Gate 2 signed ticket
 * registry, and never sends a ride, storage record, bill or gate pass to Mini.
 * All examples are fictional, generated locally, and non-authoritative.
 * The host application/server MUST later re-check their own real domain facts.
 */
export const PHASE5_GATE4_HOSTS=Object.freeze({
  MY_RIDE:Object.freeze({
    title:'My Ride',subtitle:'A journey has to exist before payment',
    domain:'TRIP_FARE_AND_DRIVER',
    sourceOwner:'My Ride trip, rider, driver and fare authority',
    backend:'Authorised dispatch/trip service',
    next:'Verify the ride, driver, seat, fare and cancellation terms on the My Ride server. Do not accept a browser quote.'
  }),
  STORAGE:Object.freeze({
    title:'Storage',subtitle:'Space and access must be reserved first',
    domain:'SPACE_TERM_AND_ACCESS',
    sourceOwner:'Storage owner, renter, space, term and access authority',
    backend:'Authorised storage booking and inventory service',
    next:'Verify the owner, unit capacity, actual availability, duration and handover conditions on the Storage server.'
  }),
  ESTATE:Object.freeze({
    title:'Varsityville Estate',subtitle:'A resident bill is not a gate pass',
    domain:'BILL_HOUSEHOLD_AND_ESTATE_SCOPE',
    sourceOwner:'Estate bill, household, management approval and privacy',
    backend:'Estate manager billing and resident-authorisation service',
    next:'Verify the authenticated household and outstanding bill on the Estate server. Gate access is a separate permission check.'
  })
});
export const PHASE5_GATE4_SCENARIOS=Object.freeze([
  Object.freeze({id:'complete',label:'Locally complete sample'}),
  Object.freeze({id:'missing',label:'Missing domain approval'}),
  Object.freeze({id:'expired',label:'Expired source or hold'}),
  Object.freeze({id:'wrong_person',label:'Wrong person / scope'})
]);
export const PHASE5_GATE4_AUTHORITY=Object.freeze({
  sampleOnly:true,
  sourceServerVerified:false,
  hostRegistered:false,
  signedHostTicketIssued:false,
  checkoutAuthorized:false,
  agreementAccepted:false,
  paymentEnabled:false,
  providerVerified:false,
  paid:false,
  moneyMoved:false,
  fulfilmentAllowed:false,
  gateAccessAllowed:false
});
export const PHASE5_GATE4_EXTERNAL_BLOCKERS=Object.freeze([
  'REGISTERED_HOST_SERVER_REQUIRED',
  'SIGNED_SOURCE_VERSION_REQUIRED',
  'AUTHENTICATED_PARTICIPANT_SCOPE_REQUIRED',
  'CANONICAL_AGREEMENT_REQUIRED',
  'SECUREPAY_API_AND_PROVIDER_UNAVAILABLE'
]);
const own=(obj,key)=>Object.prototype.hasOwnProperty.call(obj,key);
const text=(value,len=3)=>typeof value==='string'&&value.length>=len&&value.length<=110;
const after=(value,now)=>typeof value==='string'&&
  Number.isFinite(Date.parse(value))&&Date.parse(value)>now;
const before=(value,now)=>typeof value==='string'&&
  Number.isFinite(Date.parse(value))&&Date.parse(value)<=now;
const money=(value)=>Number.isSafeInteger(value)&&value>0&&value<=100000000;

export function phase5Gate4Sample(hostId,scenario='complete',now=Date.now()){
  if(!own(PHASE5_GATE4_HOSTS,hostId)||
      !PHASE5_GATE4_SCENARIOS.some(x=>x.id===scenario)||
      !Number.isSafeInteger(now)||now<0)return null;
  const future=ms=>new Date(now+ms).toISOString();
  const prior=ms=>new Date(now-ms).toISOString();
  const sample={
    hostId,scenario,sourceContext:'BROWSER_ONLY_FICTIONAL_SOURCE',
    sampleCode:'SIM-'+hostId.replaceAll('_','-')+'-01',
    sourceVersion:'SAMPLE-v1',createdAt:prior(60000),
    sampleExpiryAt:future(1800000),currency:'KES',
    ...PHASE5_GATE4_AUTHORITY,
    data:null
  };
  if(hostId==='MY_RIDE'){
    sample.data={
      riderId:'SAMPLE-RIDER-01',driverId:'SAMPLE-DRIVER-01',
      vehicleId:'SAMPLE-VEHICLE-01',tripId:'SAMPLE-TRIP-01',
      pickUp:'Sample pickup point',dropOff:'Sample destination',
      departureAt:future(3600000),quoteValidUntil:future(900000),
      seatsRequested:2,seatsAvailable:3,fareMinor:250000,
      driverAccepted:true,vehicleInspected:true,
      riderReviewedCancellation:true
    };
    if(scenario==='missing')sample.data.driverAccepted=false;
    if(scenario==='expired')sample.data.quoteValidUntil=prior(1000);
    if(scenario==='wrong_person')sample.data.driverId=sample.data.riderId;
  }else if(hostId==='STORAGE'){
    sample.data={
      storageOwnerId:'SAMPLE-OWNER-01',renterId:'SAMPLE-RENTER-01',
      unitId:'SAMPLE-SPACE-01',spaceType:'GARAGE',
      periodStart:future(7200000),periodEnd:future(86400000*3),
      availabilityHoldUntil:future(900000),
      capacityKg:750,requiredKg:180,priceMinor:450000,
      ownerApproved:true,accessRulesReviewed:true,
      handoverConditionReviewed:true
    };
    if(scenario==='missing')sample.data.accessRulesReviewed=false;
    if(scenario==='expired')sample.data.availabilityHoldUntil=prior(1000);
    if(scenario==='wrong_person')sample.data.renterId=sample.data.storageOwnerId;
  }else{
    sample.data={
      estateContext:'VARSITYVILLE_SAMPLE_ONLY',
      billId:'SAMPLE-ESTATE-BILL-01',householdId:'SAMPLE-HOUSEHOLD-01',
      residentId:'SAMPLE-RESIDENT-01',payerHouseholdId:'SAMPLE-HOUSEHOLD-01',
      billVersion:'SAMPLE-BILL-v1',billType:'SERVICE_CHARGE',
      billStatus:'PENDING',amountDueMinor:150000,
      billValidUntil:future(900000),estateApprovalRecorded:true,
      householdAuthorised:true,gatePassReference:null
    };
    if(scenario==='missing')sample.data.estateApprovalRecorded=false;
    if(scenario==='expired')sample.data.billValidUntil=prior(1000);
    if(scenario==='wrong_person')sample.data.payerHouseholdId='SAMPLE-OTHER-HOUSEHOLD';
  }
  return sample;
}

/**
 * Local shape checks only. Even a locally complete sample can NEVER start
 * checkout: signed merchant order/booking/invoice authority does not exist.
 */
export function phase5Gate4Assess(hostId,sample,now=Date.now()){
  const notRegistered=Object.freeze({
    hostId:typeof hostId==='string'?hostId:'UNKNOWN',
    supported:false,sourceShapeComplete:false,
    checkoutEnabled:false,canLaunchMini:false,
    assessment:'UNREGISTERED_HOST',
    checks:[],blockers:['UNREGISTERED_HOST'],
    nextAction:'No registered domain source. Stop.'
  });
  if(!own(PHASE5_GATE4_HOSTS,hostId)||!sample||
     typeof sample!=='object'||Array.isArray(sample)||
     !Number.isSafeInteger(now)||now<0)return notRegistered;
  const checks=[];
  const check=(key,label,ok)=>{
    checks.push({key,label,passed:ok===true});
  };
  check('sample_scope','Only a fictional host-local source',
    sample.hostId===hostId&&
    sample.sourceContext==='BROWSER_ONLY_FICTIONAL_SOURCE'&&
    sample.sampleOnly===true&&sample.scenario!==undefined);
  check('source_version','Source has a local revision and example reference',
    text(sample.sampleCode)&&text(sample.sourceVersion));
  check('sample_lifetime','Sample is not past its local time window',
    before(sample.createdAt,now)&&
    after(sample.sampleExpiryAt,now)&&
    Date.parse(sample.sampleExpiryAt)-Date.parse(sample.createdAt)<=3600000);
  check('currency','Amount unit is Kenyan shillings',sample.currency==='KES');
  check('no_financial_authority','No payment, Agreement or gate authority has been asserted',
    Object.entries(PHASE5_GATE4_AUTHORITY).every(([key,v])=>sample[key]===v));
  const d=sample.data;
  if(!d||typeof d!=='object'||Array.isArray(d)){
    check('domain_record','Domain details are present',false);
  }else if(hostId==='MY_RIDE'){
    check('ride_parties','Rider and driver are separate sample parties',
      text(d.riderId)&&text(d.driverId)&&d.driverId!==d.riderId);
    check('ride_route','A pickup and destination are recorded',
      text(d.pickUp,5)&&text(d.dropOff,5)&&d.pickUp!==d.dropOff);
    check('ride_driver','Driver and vehicle sample checks completed',
      text(d.tripId)&&text(d.vehicleId)&&d.driverAccepted===true&&
      d.vehicleInspected===true);
    check('ride_capacity','A vehicle has enough available seats',
      Number.isSafeInteger(d.seatsRequested)&&d.seatsRequested>=1&&
      Number.isSafeInteger(d.seatsAvailable)&&
      d.seatsAvailable>=d.seatsRequested);
    check('ride_fare','Fare and departure are locally recorded',
      money(d.fareMinor)&&after(d.departureAt,now)&&
      d.riderReviewedCancellation===true);
    check('ride_quote','The illustrative quote has not expired',
      after(d.quoteValidUntil,now));
  }else if(hostId==='STORAGE'){
    check('storage_parties','Owner and renter are separate sample parties',
      text(d.storageOwnerId)&&text(d.renterId)&&
      d.storageOwnerId!==d.renterId);
    check('storage_space','A space type, unit and capacity are recorded',
      text(d.unitId)&&['GARAGE','WAREHOUSE','PARKING','ROOM'].includes(d.spaceType)&&
      Number.isSafeInteger(d.capacityKg)&&d.capacityKg>0&&
      Number.isSafeInteger(d.requiredKg)&&d.requiredKg>0&&
      d.requiredKg<=d.capacityKg);
    check('storage_dates','Storage starts later and has an end date',
      after(d.periodStart,now)&&after(d.periodEnd,now)&&
      Date.parse(d.periodEnd)>Date.parse(d.periodStart));
    check('storage_owner','Space owner sample approval is recorded',
      d.ownerApproved===true);
    check('storage_terms','Access and handover condition reviewed',
      d.accessRulesReviewed===true&&d.handoverConditionReviewed===true);
    check('storage_price','Price and temporary space hold recorded',
      money(d.priceMinor)&&after(d.availabilityHoldUntil,now));
  }else if(hostId==='ESTATE'){
    check('estate_identity','Bill is scoped to a household and resident',
      d.estateContext==='VARSITYVILLE_SAMPLE_ONLY'&&
      text(d.householdId)&&text(d.residentId));
    check('estate_bill','Sample bill has version and permitted type',
      text(d.billId)&&text(d.billVersion)&&
      ['SERVICE_CHARGE','PROJECT_TOPUP','ACCESS_FEE'].includes(d.billType));
    check('estate_balance','Outstanding sample charge has a positive balance',
      d.billStatus==='PENDING'&&money(d.amountDueMinor));
    check('estate_resident','Payer belongs to that sample household',
      d.householdAuthorised===true&&d.payerHouseholdId===d.householdId);
    check('estate_issuer','Estate approval is recorded locally',
      d.estateApprovalRecorded===true);
    check('estate_bill_life','Bill preview has not expired',
      after(d.billValidUntil,now));
    check('estate_gate_privacy','Bill cannot stand in for permission to enter',
      d.gatePassReference===null&&sample.gateAccessAllowed===false);
  }
  const failures=checks.filter(x=>!x.passed).map(x=>x.key);
  const blockers=[...failures,...PHASE5_GATE4_EXTERNAL_BLOCKERS];
  return {
    hostId,supported:true,
    sourceShapeComplete:failures.length===0,
    checkoutEnabled:false,
    canLaunchMini:false,
    assessment:failures.length===0?'LOCAL_SAMPLE_COMPLETE_NOT_AUTHORISED':
      'SOURCE_REVIEW_BLOCKED',
    checks,blockers,
    nextAction:failures.length?('Fix local sample: '+failures.join(', ')+
      '. Then request an authorised server check.'):
      PHASE5_GATE4_HOSTS[hostId].next
  };
}

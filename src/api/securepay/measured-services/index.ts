import { segment, type HttpClient } from '../http';

export type MeasuredRateBasis='PER_HOUR'|'PER_KM'|'PER_KM_PLUS_FIXED';
export type MeasuredMethod='WORK_LOG'|'ODOMETER'|'GPS_ROUTE'|'MUTUAL_MANUAL';

export interface MeasuredServicePreviewRequest {
  expectedVersionId:string;
  expectedVersionHash:string;
  rateBasis:MeasuredRateBasis;
  currency:string;
  /** Proposed amounts in integer minor currency units. NOT an agreed tariff. */
  proposedRateMinorPerUnit:number;
  proposedFixedMinor:number;
  /** Proposed or reported measurement, in hundredths of an hour/km. */
  reportedHundredths:number;
  proposedMaxHundredths:number|null;
  measurementMethod:MeasuredMethod;
}
export interface MeasuredServicePreview {
  agreementId:string;
  agreementVersionId:string;
  agreementVersionHash:string;
  rateBasis:MeasuredRateBasis;
  currency:string;
  proposedRateMinorPerUnit:number;
  proposedFixedMinor:number;
  reportedHundredths:number;
  proposedMaxHundredths:number|null;
  measurementMethod:MeasuredMethod;
  measurementUnit:'HOUR'|'KM';
  roundingPolicy:'HALF_UP_TO_MINOR_UNIT';
  variableChargeMinor:number;
  proposedTotalMinor:number;
  proposedMaximumMinor:number|null;
  state:'PROPOSAL_ONLY';
  tariffAgreed:false;
  usageVerified:false;
  supplierApproved:false;
  executable:false;
  paymentEnabled:false;
}

/** Never treat browser-proposed metering as a Money bill. */
export function measuredPreviewProof(
  response:MeasuredServicePreview, expectedAgreementId:string,
  request:MeasuredServicePreviewRequest,
):boolean {
  const r=response;
  return !!r && r.agreementId===expectedAgreementId &&
    r.agreementVersionId===request.expectedVersionId &&
    r.agreementVersionHash===request.expectedVersionHash &&
    r.rateBasis===request.rateBasis && r.currency===request.currency &&
    r.proposedRateMinorPerUnit===request.proposedRateMinorPerUnit &&
    r.proposedFixedMinor===request.proposedFixedMinor &&
    r.reportedHundredths===request.reportedHundredths &&
    r.proposedMaxHundredths===request.proposedMaxHundredths &&
    r.measurementMethod===request.measurementMethod &&
    r.measurementUnit===(request.rateBasis==='PER_HOUR'?'HOUR':'KM') &&
    r.roundingPolicy==='HALF_UP_TO_MINOR_UNIT' &&
    Number.isSafeInteger(r.variableChargeMinor) && r.variableChargeMinor>=0 &&
    Number.isSafeInteger(r.proposedTotalMinor) && r.proposedTotalMinor>=0 &&
    r.proposedTotalMinor===r.variableChargeMinor+r.proposedFixedMinor &&
    ((request.proposedMaxHundredths===null && r.proposedMaximumMinor===null) ||
      (request.proposedMaxHundredths!==null &&
       r.proposedMaximumMinor!==null &&
       Number.isSafeInteger(r.proposedMaximumMinor) &&
       r.proposedMaximumMinor>=r.proposedTotalMinor)) &&
    r.state==='PROPOSAL_ONLY' && r.tariffAgreed===false &&
    r.usageVerified===false && r.supplierApproved===false &&
    r.executable===false && r.paymentEnabled===false;
}
export function createMeasuredServicesGateway(http:HttpClient) {
  return {
    preview: (agreementId:string,request:MeasuredServicePreviewRequest) =>
      http.request<MeasuredServicePreview>(
        `/api/v1/agreements/${segment(agreementId)}/measured-service/preview`,
        {method:'POST',auth:'required',body:request}),
  };
}
export type MeasuredServicesGateway=ReturnType<typeof createMeasuredServicesGateway>;

export interface CommunitySaverItem {
  agreementId: string;
  agreementVersionId: string;
  itemId: string;
  baselineMinor: number;
  currency: 'KES';
}
export interface CommunitySaverCandidate {
  platformCode: 'SHORTSTAYS'|'MY_RIDE'|'STORAGE';
  items: CommunitySaverItem[];
  carrierOrHostCostMinor: number;
  otherIncrementalCostMinor: number;
  additionalProviderRewardMinor: number;
}
export interface CommunitySaverAllocation {
  agreementId:string;agreementVersionId:string;itemId:string;
  baselineMinor:number;projectedSavingMinor:number;projectedCostMinor:number;
}
export type CommunitySaverPreScreenResult =
  | {ok:false;reason:string;illustrationOnly:true;qualifies?:false;
     originalMinor?:number;minimumSavingsMinor?:number;plugFeeMinor?:number;
     allInMinor?:number;netSavingMinor?:number;requiredImprovementMinor?:number;
     maximumOtherCostsMinor?:number;agreementChanged:false;
     invitationSent:false;moneyAuthorized:false}
  | {ok:true;qualifies:true;illustrationOnly:true;
     platformCode:CommunitySaverCandidate['platformCode'];
     originalMinor:number;minimumSavingsMinor:number;plugFeeMinor:number;
     netSavingMinor:number;allInMinor:number;maxAllInMinor:number;
     maximumOtherCostsMinor:number;projectedNetSavingPercent:number;
     allocations:CommunitySaverAllocation[];
     capacityVerified:false;plugQualified:false;participantsConsented:false;
     agreementChanged:false;invitationSent:false;moneyAuthorized:false};
export declare const communitySaverRules:{
  readonly minNetSavingPercent:25;
  readonly plugPercentOfMinimumSaving:10;
  readonly approvedPlatformCodes:readonly ['SHORTSTAYS','MY_RIDE','STORAGE'];
};
export declare function communitySaverPreScreen(input:CommunitySaverCandidate):CommunitySaverPreScreenResult;

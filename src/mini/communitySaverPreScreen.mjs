/**
 * Community Saver Phase 7 — conservative, deterministic KES arithmetic.
 * This calculator is a PRE-SCREEN ONLY. It never reads canonical Agreements,
 * qualifies Plugs, accepts capacity, issues notifications, or moves Money.
 * Production decisions require verified, item-version-bound server sources.
 *
 * Minimum net savings: 25% of EACH agreed item after ALL incremental costs.
 * Proposed Plug fee: 10% of the 25% combined-item saving benchmark (2.5%
 * of the combined agreed item baselines), NOT 10% of gross savings.
 */
export const communitySaverRules=Object.freeze({
  minNetSavingPercent:25,
  plugPercentOfMinimumSaving:10,
  approvedPlatformCodes:Object.freeze(['SHORTSTAYS','MY_RIDE','STORAGE'])
});
const whole=n=>Number.isSafeInteger(n)&&n>=0&&n<=1_000_000_000_000_000;
const money=n=>whole(n)&&n>0;
const fail=(code)=>({ok:false,reason:code,illustrationOnly:true,
  agreementChanged:false,invitationSent:false,moneyAuthorized:false});
const sum=(numbers)=>numbers.reduce((a,b)=>a+b,0);

/**
 * inputs:
 *  platformCode: approved facilitation platform code (not arbitrary category)
 *  items: [{agreementId,agreementVersionId,itemId,baselineMinor,currency:'KES'}]
 *  carrierOrHostCostMinor: firm quoted combined base cost, NOT original totals
 *  otherIncrementalCostMinor: includes labour, detours, rails, SecurePay, etc.
 *  additionalProviderRewardMinor: if the provider needs a separate uplift
 */
export function communitySaverPreScreen(input){
  if(!input||!communitySaverRules.approvedPlatformCodes.includes(input.platformCode))
    return fail('PLATFORM_NOT_APPROVED');
  const items=input.items;
  if(!Array.isArray(items)||items.length<2||items.length>12)
    return fail('NEEDS_MULTIPLE_INDEPENDENT_ITEMS');
  const seen=new Set();
  for(const item of items){
    if(!item||typeof item.agreementId!=='string'||!item.agreementId.trim()||
       typeof item.agreementVersionId!=='string'||!item.agreementVersionId.trim()||
       typeof item.itemId!=='string'||!item.itemId.trim()||
       item.currency!=='KES'||!money(item.baselineMinor))
      return fail('ITEM_MISSING_CANONICAL_REFERENCE_OR_KES_PRICE');
    const key=item.agreementId+'/'+item.itemId;
    if(seen.has(key))return fail('DUPLICATE_AGREEMENT_ITEM');
    seen.add(key);
  }
  if(new Set(items.map(x=>x.agreementId)).size<2)
    return fail('NEEDS_INDEPENDENT_COMMITMENTS');
  if(!money(input.carrierOrHostCostMinor)||
     !whole(input.otherIncrementalCostMinor)||
     !whole(input.additionalProviderRewardMinor))
    return fail('SHARED_COSTS_NOT_ITEMIZED');
  const originalMinor=sum(items.map(x=>x.baselineMinor));
  if(!Number.isSafeInteger(originalMinor))return fail('COST_OUT_OF_RANGE');
  const minimumSavingsMinor=Math.ceil(originalMinor*0.25);
  // Avoid hidden fractional pennies by rounding the declared Plug fee UP.
  const plugFeeMinor=Math.ceil(minimumSavingsMinor*0.10);
  const costWithoutPlugMinor=input.carrierOrHostCostMinor+
    input.otherIncrementalCostMinor+input.additionalProviderRewardMinor;
  const allInMinor=costWithoutPlugMinor+plugFeeMinor;
  if(!Number.isSafeInteger(allInMinor))return fail('COST_OUT_OF_RANGE');
  const netSavingMinor=originalMinor-allInMinor;
  const maxAllInMinor=originalMinor-minimumSavingsMinor;
  const maximumOtherCostsMinor=Math.max(0,maxAllInMinor-
    input.carrierOrHostCostMinor-input.additionalProviderRewardMinor-plugFeeMinor);
  if(netSavingMinor<minimumSavingsMinor){
    return {...fail('BELOW_MINIMUM_NET_SAVING'),
      originalMinor,minimumSavingsMinor,plugFeeMinor,allInMinor,
      netSavingMinor,requiredImprovementMinor:minimumSavingsMinor-netSavingMinor,
      maximumOtherCostsMinor,qualifies:false};
  }
  // Distribute in proportion to the item-level agreed baselines. The last
  // item's remaining pennies are explicit; verify EACH item >= 25% net.
  let allocated=0;
  const allocations=items.map((item,index)=>{
    const saved=index===items.length-1
      ?netSavingMinor-allocated
      :Math.floor(netSavingMinor*item.baselineMinor/originalMinor);
    allocated+=saved;
    return {
      agreementId:item.agreementId,agreementVersionId:item.agreementVersionId,
      itemId:item.itemId,baselineMinor:item.baselineMinor,
      projectedSavingMinor:saved,projectedCostMinor:item.baselineMinor-saved
    };
  });
  if(allocations.some(x=>x.projectedSavingMinor*100<x.baselineMinor*25))
    return fail('INDIVIDUAL_25_PERCENT_NOT_MET');
  return {ok:true,qualifies:true,illustrationOnly:true,platformCode:input.platformCode,
    originalMinor,minimumSavingsMinor,plugFeeMinor,netSavingMinor,
    allInMinor,maxAllInMinor,maximumOtherCostsMinor,
    projectedNetSavingPercent:netSavingMinor/originalMinor*100,
    allocations,
    // These are ALWAYS false in a pre-screen, even for an economically good match.
    capacityVerified:false,plugQualified:false,participantsConsented:false,
    agreementChanged:false,invitationSent:false,moneyAuthorized:false};
}

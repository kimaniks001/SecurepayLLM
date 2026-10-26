import type { AgreementFundingOptionResponse } from '../../api/securepay/payment-intent';
export type SettlementFamily='bank'|'mobile'|'other';
/** Classification is presentation only; API remains sole source of actual eligibility and caps. */
export function settlementFamily(rail:Pick<AgreementFundingOptionResponse,'railCode'|'displayName'>):SettlementFamily{
 const name=(rail.railCode+' '+rail.displayName).toUpperCase();
 if(/MPESA|M-PESA|MOBILE[_ -]?MONEY|AIRTEL[_ -]?MONEY/.test(name))return 'mobile';
 if(/PESALINK|BANK|RTGS|SWIFT|EFT|INTERBANK|WIRE[_ -]?TRANSFER/.test(name))return 'bank';
 return 'other';
}
export const settlementFamilyTitle:Record<SettlementFamily,string>={
 bank:'Bank and bank-network settlement',
 mobile:'Mobile money',
 other:'Other backend-listed funding routes',
};
const weight:Record<SettlementFamily,number>={bank:0,mobile:1,other:2};
export function groupedSettlementOptions(rails:AgreementFundingOptionResponse[]):AgreementFundingOptionResponse[]{
 return [...rails].sort((a,b)=>weight[settlementFamily(a)]-weight[settlementFamily(b)]);
}

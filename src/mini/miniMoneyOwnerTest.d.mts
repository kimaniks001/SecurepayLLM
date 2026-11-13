export interface MiniMoneyOwnerSample {
  readonly agreementId:string;
  readonly publicReference:string;
  readonly title:string;
  readonly amountMinor:number;
  readonly currency:'KES';
  readonly source:'SYNTHETIC_AGREEMENT';
  readonly moneyStatus:'NOT_FUNDED';
}
export const MONEY_OWNER_SAMPLE:Readonly<MiniMoneyOwnerSample>;
export const MONEY_OWNER_SCHEDULES:ReadonlyArray<Readonly<{
  id:'FULL'|'DEPOSIT_BALANCE'|'THREE_MILESTONES';label:string;
}>>;
export type MoneyOwnerScheduleId=typeof MONEY_OWNER_SCHEDULES[number]['id'];
export interface MoneyOwnerStep {
  readonly sequence:number;
  readonly label:string;
  readonly amountMinor:number;
  readonly payable:false;
  readonly recorded:false;
  readonly sellerApproved:false;
  readonly simulationOnly:true;
}
export function moneyOwnerSteps(principalMinor:number,scheduleId:MoneyOwnerScheduleId):MoneyOwnerStep[]|null;

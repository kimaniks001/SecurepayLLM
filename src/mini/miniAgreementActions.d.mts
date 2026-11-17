import type {MiniStorePlanLine,MiniBasketFulfilment} from './MiniBuyStore';
export declare function miniStraightSaleMoneyPreview(lines:MiniStorePlanLine[],options?:{
  sourceFresh?:boolean;basketReady?:boolean;questionsComplete?:boolean;
  fulfilmentChoice?:MiniBasketFulfilment|null;deliveryContracts?:unknown[];
  providerRequests?:unknown[];priceQuoted?:boolean;
}):{canOpenMoney:boolean;reason:string|null;requiresSecureLink:false;backendAuthorised:false};

import type {MiniStorePlanLine} from './MiniBuyStore';
import type {PublicOfferView,PublicOfferDetailView} from '../api/securepay/store/dto';
export type MiniChangedOffer={sellerKsNumber:string;offerId:string;title:string;
 wasPriceMinor:number|null;fresh:PublicOfferView|null;canUse:boolean;
 maxQuantity:number|null;available:boolean;priceChanged:boolean;changed:boolean};
export declare function miniChangedOffers(lines:MiniStorePlanLine[],
 responses:PromiseSettledResult<PublicOfferDetailView>[]):MiniChangedOffer[];

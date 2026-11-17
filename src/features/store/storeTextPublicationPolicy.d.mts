import type {StoreOfferResponse} from '../../api/securepay/store/dto';
import type {OfferDraftFields} from '../../components/OfferBuilderView';
export type StoreTextPublicationCheck =
  | {ok:true;offerId:string;expectedUpdatedAt:string}
  | {ok:false;reason:string};
export function storeTextPublicationReview(
  current:StoreOfferResponse|null|undefined,
  draft:OfferDraftFields
):StoreTextPublicationCheck;
export function storeTextPublicationFresh(
  original:StoreOfferResponse,
  current:StoreOfferResponse|null|undefined
):{ok:true;expectedUpdatedAt:string}|{ok:false;reason:string};

export function storePublishedTextEditReview(
  current:StoreOfferResponse|null|undefined,
  draft:OfferDraftFields
):StoreTextPublicationCheck;

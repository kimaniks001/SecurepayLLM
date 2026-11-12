import type {PublicOfferDetailView} from '../api/securepay/store/dto';
import type {MiniStorePlanLine} from './MiniBuyStore';
export declare function miniStoreOfferSnapshotFresh(
  lines:readonly MiniStorePlanLine[],
  fresh:readonly PublicOfferDetailView[]
):boolean;

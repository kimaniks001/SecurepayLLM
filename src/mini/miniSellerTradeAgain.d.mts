import type { CurrentUserAgreementSummaryResponse, AgreementDetailResponse } from '../api/securepay/agreements/dto';
import type { Page } from '../api/securepay/agreements';
export function miniSellerRecentTradeReferences(page: Page<CurrentUserAgreementSummaryResponse>): CurrentUserAgreementSummaryResponse[];
export function miniSellerReadTradeAgainTitle(reference: CurrentUserAgreementSummaryResponse, detail: AgreementDetailResponse): string | null;

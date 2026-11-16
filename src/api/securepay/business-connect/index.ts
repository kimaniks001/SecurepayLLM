/**
 * SecurePayAPI B1 publication gateway. Backend source-of-truth only;
 * never infer consent from a public Store profile or paid UI badge.
 * Until the B1 API is deployed, calls fail and governed discovery hides results.
 */
import { segment, type HttpClient } from '../http';
import type {
  BusinessConnectSurface,
} from '../../../integrations/business-connect';
import type {
  NetworkPublicationAuthority,
  NetworkPublicationDecision,
} from '../../../integrations/business-connect/governed';

export interface MerchantNetworkPublication {
  businessKsNumber: string;
  enabledSurfaces: BusinessConnectSurface[];
  publicationVersion: number;
  updatedAt: string;
}

const merchantPath = (businessKsNumber: string) =>
  `/api/v1/business/${segment(businessKsNumber)}/store/network-publication`;

export function createBusinessConnectGateway(http: HttpClient) {
  const publication: NetworkPublicationAuthority = {
    evaluate({ sellerKsNumber, offerId, targetSurface }): Promise<NetworkPublicationDecision> {
      const query = new URLSearchParams({ surface: targetSurface });
      return http.request<NetworkPublicationDecision>(
        `/api/v1/stores/${segment(sellerKsNumber)}/offers/${segment(offerId)}/network-eligibility?${query.toString()}`,
        { auth: 'none' },
      );
    },
  };
  return {
    publication,
    myPublication: (businessKsNumber: string) =>
      http.request<MerchantNetworkPublication>(merchantPath(businessKsNumber), { auth: 'required' }),
    replaceMyPublication: (
      businessKsNumber: string,
      enabledSurfaces: BusinessConnectSurface[],
      expectedVersion: number,
    ) => http.request<MerchantNetworkPublication>(merchantPath(businessKsNumber), {
      method: 'PUT', auth: 'required',
      body: {
        enabledSurfaces,
        expectedVersion,
        acknowledgement: 'I_APPROVE_SELECTED_SECUREPAY_APP_DISTRIBUTION',
      },
    }),
  };
}

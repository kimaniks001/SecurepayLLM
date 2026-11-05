import type { HttpClient } from '../http';

export interface EmbedTransferClaimRequest {
  siteId: string;
  conversationId: string;
  ticket: string;
  /** Never expose the original anonymous token in URLs, storage, or application logs. */
  guestToken: string;
}
export interface EmbedTransferClaimed {
  siteId: string;
  conversationId: string;
  savedBuildId: string;
  returnOrigin: string;
  returnReference: string | null;
  purpose: 'HOME' | 'WORK' | 'UNSPECIFIED';
  newlyClaimed: boolean;
}

/**
 * First-party, authenticated SecurePay-only claim. The actual actor comes solely from
 * the normal memory-only SessionStore. The guest header goes only to the exact backend.
 * This never confirms/signs an Agreement or creates a SecureLink.
 */
export function createEmbedTransferGateway(http: HttpClient) {
  return {
    claim: ({guestToken,...body}: EmbedTransferClaimRequest) => {
      if(!/^[A-Za-z0-9_-]{43}$/.test(body.ticket))throw new Error('Invalid handoff ticket');
      if(!/^[A-Za-z0-9_-]{43,256}$/.test(guestToken))throw new Error('Invalid guest proof');
      if(!/^[a-z0-9][a-z0-9_-]{2,63}$/.test(body.siteId)||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.conversationId))
        throw new Error('Invalid source identifiers');
      return http.request<EmbedTransferClaimed>('/api/v1/embed/transfers/claim',{
        method:'POST',auth:'required',body,
        headers:{'X-SecurePay-Conversation-Token':guestToken}
      });
    }
  };
}
export type EmbedTransferGateway = ReturnType<typeof createEmbedTransferGateway>;

import { segment, type HttpClient } from '../http';
import type { DiscoveryResults, DiscoveryScope, PublicProfileResponse } from './dto';

/**
 * Phase 6 Slice 5 (Discovery & Identity) -- "SecurePay should help people find what actually exists
 * in their Community without deciding what is best for them." Every method here requires the real
 * signed-in identity (`auth: 'required'`) -- the backend independently enforces ACTIVE Trust Project
 * membership on top of authentication, matching every other Community read.
 *
 * <p>This is a SEPARATE, narrower surface from the existing exact "KS Finder" identity lookup
 * (`identities.byKsNumber`, if present elsewhere) -- broad discoverability and exact resolution are
 * different privacy semantics (Section 21) and must never share one call.
 */
export function createDiscoveryGateway(http: HttpClient) {
  return {
    /** The one coherent Community discovery entry point (Section 28). `scope=EVERYTHING` (the
     * default) returns a small, honest preview per section -- never a fabricated total. A specific
     * scope forwards real pagination to that one domain's own search. */
    search: (q: string, scope: DiscoveryScope = 'EVERYTHING', limit = 20, offset = 0) => {
      const query = new URLSearchParams();
      if (q) query.set('q', q);
      query.set('scope', scope);
      query.set('limit', String(limit));
      query.set('offset', String(offset));
      return http.request<DiscoveryResults>(`/api/v1/discovery/search?${query.toString()}`, { auth: 'required' });
    },
    profiles: {
      search: (q: string, limit = 50, offset = 0) => {
        const query = new URLSearchParams();
        if (q) query.set('q', q);
        query.set('limit', String(limit));
        query.set('offset', String(offset));
        return http.request<PublicProfileResponse[]>(`/api/v1/community/profiles/search?${query.toString()}`, { auth: 'required' });
      },
      get: (canonicalKsNumber: string) =>
        http.request<PublicProfileResponse>(`/api/v1/community/profiles/${segment(canonicalKsNumber)}`, { auth: 'required' }),
    },
  };
}
export type DiscoveryGateway = ReturnType<typeof createDiscoveryGateway>;

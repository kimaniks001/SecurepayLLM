/**
 * Phase 6 (Community Life) Slice 1 -- real, backend-persisted Community objects. Matches
 * `CommunityObjectController.CommunityObjectResponse` exactly. Author identity fields are always
 * server-resolved -- never sent by the client.
 */
export interface CommunityObjectResponse {
  id: string;
  objectType: 'QUESTION' | 'NEED' | 'OPPORTUNITY' | 'WORK_STORY' | 'DISCUSSION';
  status: 'ACTIVE' | 'CLOSED' | 'REMOVED';
  title: string;
  body: string;
  locationLabel: string | null;
  authorCanonicalKsNumber: string | null;
  authorDisplayName: string | null;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
}

import type {
  ApprenticeshipProjectDto, CircleResponse, CommunityEventDto, CommunityObjectResponse,
  CommunityProjectDto, CommunityServiceOpportunityDto, CirclePendingInvitationView,
} from '../../api/securepay/community/dto';

/** These are discovery-safe projections of records the current member is already
 * permitted to read. Never apply this filter in place of API authentication:
 * SecurePay remains the sole membership/content authority. */
export function communityLiveOnly(rows:readonly CommunityObjectResponse[]):CommunityObjectResponse[] {
  return rows.filter(row=>row.circleId===null && row.status==='ACTIVE');
}
export function communityOpenOpportunities(rows:readonly CommunityServiceOpportunityDto[]):CommunityServiceOpportunityDto[] {
  return rows.filter(row=>row.circleId===null && (row.status==='OPEN'||row.status==='IN_PROGRESS'));
}
export function communityVisibleProjects(rows:readonly CommunityProjectDto[]):CommunityProjectDto[] {
  return rows.filter(row=>row.circleId===null && (row.status==='ACTIVE'||row.status==='COMPLETED'));
}
export function communityPublicEvents(rows:readonly CommunityEventDto[]):CommunityEventDto[] {
  return rows.filter(row=>row.circleId===null && row.status==='CONFIRMED');
}
export function communityApprenticeships(rows:readonly ApprenticeshipProjectDto[]):ApprenticeshipProjectDto[] {
  return rows.filter(row=>row.circleId===null && (row.status==='PROPOSED'||row.status==='ACTIVE'));
}
export function discoverableCircles(rows:readonly CircleResponse[]):CircleResponse[] {
  return rows.filter(row=>row.visibility==='PUBLIC' && row.status==='ACTIVE');
}
/** Invitations are self-scoped by the API. They are not memberships and
 * reveal no Circle content, even when the Circle is PRIVATE. */
export function invitedCircleCards(rows:readonly CirclePendingInvitationView[]):CirclePendingInvitationView[] {
  return rows.filter(row=>!!row.circleId && !!row.circleName);
}
/** No ranking, engagement scoring, location inference or personal profiling. */
export function matchesCommunityText(needle:string,...fields:(string|null|undefined)[]):boolean {
  const query=needle.trim().toLocaleLowerCase();
  return !query||fields.some(value=>value?.toLocaleLowerCase().includes(query));
}

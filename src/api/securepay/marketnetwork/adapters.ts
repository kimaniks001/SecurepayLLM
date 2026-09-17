import { ApiError } from '../http';
import type {
  CustomerMarketRequestResponse, CustomerMarketRequestStatus, CustomerMarketRequestType,
  CustomerMarketSelectionResponse, CustomerPlugRelationshipResponse, CustomerPlugRelationshipStatus,
  InterestedCandidateResponse, RelationshipLifecycleResponse,
} from './dto';

const REQUEST_TYPES: readonly CustomerMarketRequestType[] = ['GENERAL_SECUREPAY_HELP', 'PROPERTY_JOURNEY_HELP'];
const REQUEST_STATUSES: readonly CustomerMarketRequestStatus[] = ['OPEN', 'SELECTED', 'CANCELLED'];
const RELATIONSHIP_STATUSES: readonly CustomerPlugRelationshipStatus[] = ['ACTIVE'];

function assertKnown<T extends string>(values: readonly T[], value: string, label: string): asserts value is T {
  if (!(values as readonly string[]).includes(value)) throw new ApiError('invalid-response', `SecurePay returned an unrecognized ${label}: ${value}`);
}

export interface CustomerMarketRequestView {
  requestId: string;
  requestType: CustomerMarketRequestType;
  status: CustomerMarketRequestStatus;
  interestedCount: number;
  createdAt: string;
  cancelledAt: string | null;
}
export function customerMarketRequestView(dto: CustomerMarketRequestResponse): CustomerMarketRequestView {
  assertKnown(REQUEST_TYPES, dto.requestType, 'customer market request type');
  assertKnown(REQUEST_STATUSES, dto.status, 'customer market request status');
  return { requestId: dto.requestId, requestType: dto.requestType, status: dto.status, interestedCount: dto.interestedCount, createdAt: dto.createdAt, cancelledAt: dto.cancelledAt };
}

export interface InterestedCandidateView { candidateRef: string; interestedAt: string }
/** No name/domain/geography exists on this projection (`InterestedCandidateResponse{candidateRef, interestedAt}`
 * only) — confirming the Plug-profile-richness gap. Never render this as anything but an opaque reference. */
export function interestedCandidateView(dto: InterestedCandidateResponse): InterestedCandidateView {
  return { candidateRef: dto.candidateRef, interestedAt: dto.interestedAt };
}

export interface CustomerMarketSelectionView { selectionRef: string; requestId: string; candidateRef: string; selectedAt: string }
export function customerMarketSelectionView(dto: CustomerMarketSelectionResponse): CustomerMarketSelectionView {
  return { selectionRef: dto.selectionRef, requestId: dto.requestId, candidateRef: dto.candidateRef, selectedAt: dto.selectedAt };
}

export interface CustomerPlugRelationshipView {
  relationshipRef: string;
  requestId: string;
  requestType: CustomerMarketRequestType;
  status: CustomerPlugRelationshipStatus;
  openedAt: string;
  contactExchangeAvailable: boolean;
}
export function customerPlugRelationshipView(dto: CustomerPlugRelationshipResponse): CustomerPlugRelationshipView {
  assertKnown(REQUEST_TYPES, dto.requestType, 'customer market request type');
  assertKnown(RELATIONSHIP_STATUSES, dto.status, 'customer/Plug relationship status');
  return { relationshipRef: dto.relationshipRef, requestId: dto.requestId, requestType: dto.requestType, status: dto.status, openedAt: dto.openedAt, contactExchangeAvailable: dto.contactExchangeAvailable };
}

export interface RelationshipLifecycleView {
  relationshipRef: string;
  status: string;
  requesterHandoffConsented: boolean;
  plugHandoffConsented: boolean;
  handoffReady: boolean;
  contactExchangeAvailable: boolean;
  terminalAt: string | null;
}
/** Status here is a separate, richer lifecycle string from `CustomerPlugRelationshipResponse.status` (the
 * immutable v1 binding, always `ACTIVE`) — rendered as-is, no enum invented for a field never fully traced. */
export function relationshipLifecycleView(dto: RelationshipLifecycleResponse): RelationshipLifecycleView {
  return { relationshipRef: dto.relationshipRef, status: dto.status, requesterHandoffConsented: dto.requesterHandoffConsented, plugHandoffConsented: dto.plugHandoffConsented, handoffReady: dto.handoffReady, contactExchangeAvailable: dto.contactExchangeAvailable, terminalAt: dto.terminalAt };
}

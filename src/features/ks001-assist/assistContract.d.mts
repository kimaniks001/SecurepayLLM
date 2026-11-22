/**
 * Type declarations for the compact, runtime-testable KS001 Assist adapter.
 * All actions must still be checked by SecurePayAPI.
 */
export type AssistService = 'stays' | 'ride' | 'storage';
export type CompactTool = AssistService | 'documents';
export type MiniatureKind = 'date' | 'time' | 'money' | 'person' | 'place' | 'text';
export type AssistCapabilityStatus = 'UNAVAILABLE' | 'EXPLAIN_ONLY' | 'READ_VERIFIED_EVIDENCE' | 'NO_CURRENT_EVIDENCE';
export const ASSIST_CONTRACT_VERSION: 'ks001-assist.v1';
export function classifyAssistRequest(input: string): CompactTool | null;
export function createAssistTurn(input: { service: AssistService; description: string; journey?: 'person' | 'goods' }): string;
export function miniatureAnswer(kind: MiniatureKind, raw: string): string;
export function assistCapabilityStatus(input: { implemented: boolean; backendAuthorised: boolean; providerEvidenceFresh: boolean }): AssistCapabilityStatus;

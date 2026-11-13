import type { AgreementMoneySnapshotResponse } from '../api/securepay/money-snapshot/dto';
export function miniMoneySnapshotProof(
  snapshot: unknown, agreementId:string, versionId:string,
): snapshot is AgreementMoneySnapshotResponse;
export function miniMoneyStatusLabel(snapshot:AgreementMoneySnapshotResponse|null):string;

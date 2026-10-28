import type { ObligationCompletionStatusDto } from '../../api/securepay/agreements';
import type { AgreementMoneySnapshotResponse } from '../../api/securepay/money-snapshot/dto';

/** Strictly read-only interpretation of canonical Agreement and Money facts.
 * A Circle coordination update is never an Agreement, completion or payment. */
export function describeExecutionTruth(status:ObligationCompletionStatusDto|null):{title:string;detail:string} {
  if(!status)return {title:'Completion not verified',detail:'SecurePay has not returned a current completion assessment.'};
  if(status.eligible===true)
    return {title:'Eligible for a separate completion action',detail:'The Agreement evaluator reports completion conditions satisfied. This is not yet a completed obligation or an authorised payment.'};
  return {title:'Completion conditions remain open',
    detail:status.unmetRequirements.length
      ?'Review the outstanding conditions returned by SecurePay before requesting completion.'
      :'SecurePay has not authorised completing this obligation.'};
}
export function describeMoneyTruth(snapshot:AgreementMoneySnapshotResponse|null):{title:string;detail:string} {
  if(!snapshot)return {title:'Money has not been checked',detail:'No version-matched Money snapshot is available.'};
  const readiness=snapshot.paymentReady;
  if(readiness.state!=='EVALUATED'||readiness.ready!==true)
    return {title:'Funding/payment readiness not confirmed',detail:'PaymentReady is not confirmed. An organiser statement, proposed budget or Circle message cannot replace a Money evaluation.'};
  if(snapshot.movement.state!=='READY')
    return {title:'Payment conditions evaluated; movement not authorised',detail:'PaymentReady does not itself authorise a transfer. Current movement authority is blocked or unavailable.'};
  return {title:'Money movement preflight is ready',detail:'The server reports a current movement preflight. A separate authorised payment or release action and explicit consent are still required; no payment was executed here.'};
}

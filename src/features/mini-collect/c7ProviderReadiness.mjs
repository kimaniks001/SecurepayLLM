/**
 * C7C–E human presentation of real, server-authenticated collection readiness.
 * This is NOT a provider certifier, payment switch, or notice-delivery proof.
 */
export const C7_PROTECTIONS=Object.freeze([
  Object.freeze({id:'institution',title:'A bank that can do this safely',
    reason:'The financial institution must independently prove that it may handle this exact kind of collection, its fees, holding limits and refunds.'}),
  Object.freeze({id:'agreement',title:'Everyone knows what they agreed',
    reason:'Each contributor must accept their original item, amount, dates and return rights before anyone can instruct Money.'}),
  Object.freeze({id:'payment',title:'Money confirmed by the provider',
    reason:'A real provider confirmation must agree with the original payer and regulated funding ledger.'}),
  Object.freeze({id:'return',title:'Unused money follows the original payment',
    reason:'A refund is confirmed only after the provider and refund ledger both prove it went back through an authorized route.'}),
  Object.freeze({id:'inbox',title:'Updates in your SecurePay inbox',
    reason:'Private updates use authoritative provider events. An in-app notice does not mean the device received a push message.'}),
]);

export function describeC7Readiness(server) {
  if (!server) return Object.freeze({
    providerVerified:false,canCollect:false,canRefund:false,
    notificationsDelivered:false,
    heading:'Bank connection is not verified here',
    message:'Before a collection can go live, the selected regulated provider and each contributor’s Agreement must be independently confirmed.',
    waiting:Object.freeze(['Verified regulated provider and signed mandate',
      'Your own authorized Agreement and original source',
      'Provider callbacks and payment/refund ledger checks']),
  });
  const providerVerified=server.providerMandateCertified===true;
  return Object.freeze({
    providerVerified,
    // Only a separately certified executable workflow may enable Money,
    // never the user interface or this overview.
    canCollect:false,canRefund:false,notificationsDelivered:false,
    heading:providerVerified?'Provider evidence found; Money still needs approval':'Provider is not ready for this collection',
    message:providerVerified
      ?'Even when a provider is certified, the original payer consent, payment instructions and callbacks still need their own approvals.'
      :'The provider must show that it can legally support the collection, hold funds and return unused money.',
    waiting:Object.freeze(Array.isArray(server.pending)
      ?server.pending.filter(x=>typeof x==='string').slice(0,5)
      :['Independent provider and Agreement confirmation is pending']),
  });
}
export function canC7ReadinessTriggerMoney(){return false;}

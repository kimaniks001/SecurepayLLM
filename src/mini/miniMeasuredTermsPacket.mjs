/** A portable NON-EXECUTABLE discussion draft. Never an Agreement amendment. */
export function miniMeasuredTermsPacket(r) {
  if(!r || r.state!=='PROPOSAL_ONLY' || r.tariffAgreed!==false ||
     r.usageVerified!==false || r.supplierApproved!==false ||
     r.executable!==false || r.paymentEnabled!==false ||
     typeof r.agreementId!=='string' ||
     typeof r.agreementVersionId!=='string' ||
     !/^[0-9a-f]{64}$/i.test(r.agreementVersionHash||'') ||
     !['PER_HOUR','PER_KM','PER_KM_PLUS_FIXED'].includes(r.rateBasis) ||
     !['WORK_LOG','ODOMETER','GPS_ROUTE','MUTUAL_MANUAL'].includes(r.measurementMethod) ||
     !/^[A-Z]{3}$/.test(r.currency||'') ||
     ![r.proposedRateMinorPerUnit,r.proposedFixedMinor,r.reportedHundredths,
        r.variableChargeMinor,r.proposedTotalMinor].every(n=>Number.isSafeInteger(n)&&n>=0) ||
     (r.proposedMaxHundredths!==null &&
        (!Number.isSafeInteger(r.proposedMaxHundredths)||r.proposedMaxHundredths<=0))) return null;
  const amount=minor=>`${r.currency} ${(minor/100).toFixed(2)}`;
  const units=n=>(n/100).toFixed(2);
  const unit=r.rateBasis==='PER_HOUR'?'hour':'km';
  const lines=[
    'SECUREPAY — TERMS PROPOSAL FOR DISCUSSION ONLY',
    'Not recorded or approved as an Agreement amendment. NOT PAYABLE.',
    `Agreement: ${r.agreementId}`,
    `Based on version: ${r.agreementVersionId}`,
    `Version content hash: ${r.agreementVersionHash}`,
    `Rate basis: ${r.rateBasis}`,
    `Proposed rate: ${amount(r.proposedRateMinorPerUnit)} per ${unit}`,
    `Proposed fixed trip charge: ${amount(r.proposedFixedMinor)}`,
    `Unverified reported quantity: ${units(r.reportedHundredths)} ${unit}(s)`,
    `Proposed maximum quantity: ${r.proposedMaxHundredths===null?'Not specified':units(r.proposedMaxHundredths)+' '+unit+'(s)'}`,
    `Proposed evidence method: ${r.measurementMethod}`,
    `Estimated charge (not due): ${amount(r.proposedTotalMinor)}`,
    `Estimated maximum (not due): ${r.proposedMaximumMinor===null?'Not specified':amount(r.proposedMaximumMinor)}`,
    'Next: agree a tariff and cap under an authorised future Agreement terms process.',
    'Then separately confirm the new version, submit evidence, independently verify usage and authorise any Money action.',
    'NO approved tariff. NO verified usage. NO payment instruction. NO escrow.',
  ];
  return lines.join('\n');
}

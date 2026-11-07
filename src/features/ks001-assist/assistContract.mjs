/**
 * KS001 Assist convergence v1.
 * A bounded adapter for human-originated requests from compact tools.
 * It does NOT create a second model, session, agreement, booking or pricing authority.
 * Current first-party transport is a regular, consented turn on the SAME AgentController.
 */
export const ASSIST_CONTRACT_VERSION = 'ks001-assist.v1';

const SERVICE_TITLES = Object.freeze({
  stays: 'ShortStays accommodation',
  ride: 'My Ride transport',
  storage: 'Storage physical space',
});

/** Not an inventory lookup. Only select a suitable compact tool from the person's text. */
export function classifyAssistRequest(input) {
  const q = String(input || '').toLowerCase();
  // Storage is physical space, never SecurePay Digital Stores.
  if (/\b(?:storage|self.storage|warehous(?:e|ing)|garage|parking bay|parking space|store my|store our|store a sofa|spare storage|store furniture|keep my sofa|keep our furniture)\b/.test(q)) return 'storage';
  if (/\b(?:hotel|guesthouse|lodging|short.stay|airbnb|overnight|accommodation|cottage|holiday home|guest room|check.in|book a room)\b/.test(q)) return 'stays';
  if (/\b(?:ride|rider|taxi|transport|delivery|deliver|parcel|pickup|drop.off|courier|truck|lorry|drive|trip|move my goods)\b/.test(q)) return 'ride';
  if (/\b(?:invoice|receipt|quotation)\b/.test(q)) return 'documents';
  return null;
}

/**
 * Explicit human request -> one existing KS001 conversation.
 * Nothing else about the embedding page, stored work or device is implicitly shared.
 * Live provider facts must arrive via verified, authorised backend reads.
 */
export function createAssistTurn({ service, description, journey = 'person' }) {
  if (!Object.prototype.hasOwnProperty.call(SERVICE_TITLES, service)) {
    throw new Error('Unknown KS001 service door');
  }
  const human = String(description || '').trim();
  if (!human || human.length > 1200) throw new Error('A brief human description is required');
  const topic = service === 'ride' && journey === 'goods'
    ? 'My Ride movement of goods'
    : SERVICE_TITLES[service];

  // JSON quoting keeps the exact user-supplied request visibly separate from
  // adapter instructions. It is NOT a credential or a provider verification.
  return [
    'Please help me with ' + topic + '.',
    'I explicitly chose to send this description only: ' + JSON.stringify(human) + '.',
    'Acknowledge naturally, keep the relevant details, then ask the single most useful missing question.',
    'Give an informational estimate only when grounded in stated assumptions and label it as an estimate; never represent one as a confirmed provider fare or availability.',
    'Suggest ShortStays, My Ride or physical Storage only when the actual need warrants it, at most once per identified gap; do not market unrelated services.',
    'If authorised, source-verified listings or quotes are unavailable, say so plainly. Digital Stores are a different product from physical Storage.',
    'Do not access my location, unrelated Agreements, calendar, contacts or private data; no other source context is shared by this request.',
    'Do not contact a provider, reserve a room or space, dispatch a vehicle, create an Agreement, make or release a payment without explicit user action and backend authority.',
  ].join(' ');
}

/** The mini instruments send a human-approved answer to the SAME canonical controller. */
export function miniatureAnswer(kind, raw) {
  const value = String(raw || '').trim();
  if (!value || value.length > 512) throw new Error('Missing mini tool answer');
  if (kind === 'date') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Invalid date');
    return 'The date is ' + value + '.';
  }
  if (kind === 'time') {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) throw new Error('Invalid local time');
    return 'The local time is ' + value + '.';
  }
  if (kind === 'money') {
    if (!/^(KES|USD|EUR|GBP) (?:\d+)(?:\.\d{1,2})?$/.test(value)) throw new Error('Invalid monetary amount');
    return value + '.';
  }
  if (kind === 'person') return 'The person is ' + value + '.';
  if (kind === 'place') return 'The place is ' + value + '.';
  if (kind === 'text') return value;
  throw new Error('Unknown miniature tool');
}

/** Labels are not entitlements. Do not expose a read/action because a tile exists. */
export function assistCapabilityStatus({ implemented, backendAuthorised, providerEvidenceFresh }) {
  if (!implemented) return 'UNAVAILABLE';
  if (!backendAuthorised) return 'EXPLAIN_ONLY';
  return providerEvidenceFresh ? 'READ_VERIFIED_EVIDENCE' : 'NO_CURRENT_EVIDENCE';
}

/**
 * The 12 Principles of Fair Trade -- reproduced verbatim, in canonical order, from the single
 * source of truth in SecurePayAPI:
 *
 *   services/agreement/src/main/resources/fair-trade/principles-v1.json
 *
 * (see docs/doctrine/SECUREPAY_AGENT_FAIR_TRADE_CONSTITUTION_V1.md section 1, and
 * Phase11DFairTradeAgentDoctrineTest#canonicalPrinciplesResourceRemainsTheOneSourceOfTruth, which
 * proves that packaged resource is byte-identical to this source file). Nothing here may
 * re-paraphrase a title or text -- if this content is ever revised upstream, this array must be
 * re-synced from that exact file, never edited independently. There is currently no public REST
 * endpoint exposing these principles, so this frontend copy is the one place outside SecurePayAPI's
 * own Agent constitution wiring that holds the wording -- see docs/PHASE6_CONVERGENCE_PRODUCTION.md
 * for this documented as a known re-sync gap, not something invented for the UI.
 */
export const FAIR_TRADE_PRINCIPLES: { number: number; title: string; text: string }[] = [
  { number: 1, title: 'To Protect Trust', text: 'Trust is the currency stronger than any coin; without it, no trade can last.' },
  { number: 2, title: 'To Safeguard Buyers & Sellers', text: 'Fairness ensures both parties walk away satisfied, reducing disputes and losses.' },
  { number: 3, title: 'To Build Long-Term Relationships', text: 'Honest dealings today bring repeat customers tomorrow.' },
  { number: 4, title: 'To Protect the Reputation of Every Store', text: 'One dishonest deal can tarnish a name; fairness keeps our names clean.' },
  { number: 5, title: 'To Strengthen the Marketplace', text: 'A marketplace known for integrity attracts better clients, suppliers, and opportunities.' },
  { number: 6, title: 'To Honour Our Commitments', text: 'A deal made is a promise kept; fairness is the backbone of reliability.' },
  { number: 7, title: 'To Prevent Exploitation', text: 'Fair trade stops the strong from taking advantage of the vulnerable.' },
  { number: 8, title: 'To Encourage Healthy Competition', text: 'When everyone plays fair, talent and quality decide the winner, not deception.' },
  { number: 9, title: 'To Uphold the Law', text: 'Fair trading keeps us within the bounds of national and platform laws, avoiding legal trouble.' },
  { number: 10, title: 'To Empower Growth', text: 'A safe trading environment lets businesses and individuals grow without fear of fraud.' },
  { number: 11, title: 'To Protect Community Goodwill', text: 'Fair trade ensures the platform remains a place people recommend to friends and family.' },
  { number: 12, title: 'To Honour Good', text: 'Lawfulness, community good, honesty, practicality, empowerment, and moral grounding guide all our dealings.' },
];

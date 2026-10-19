/** Phase 2 visual examples. Explicitly synthetic, never KS001 analysis or backend readiness.
 * No canonical Fair Trade principle titles live here; the server supplies those.
 */
export type Phase2ExampleId = 'delivery'|'chama'|'service'|'project'|'store';
export type Phase2Example = {
  id:Phase2ExampleId; title:string; humanSays:string;
  proposed:{label:string;value:string}[];
  attention:string; question:string; next:string;
};
export const phase2Examples: readonly Phase2Example[] = [
  {
    id:'delivery',title:'KES 400 delivery',
    humanSays:'I need something delivered. It will cost KES 400.',
    proposed:[{label:'Work',value:'Delivery service being explored'},{label:'Amount',value:'KES 400, proposed for delivery'}],
    attention:'The goods being delivered have not been described. The item, pickup, destination and handover are separate details.',
    question:'What needs to be delivered?',next:'Clarify the goods before considering timing, destination and who is responsible.',
  },
  {
    id:'chama',title:'Eight-person chama',
    humanSays:'I want to start a chama with eight friends, contributing KES 2,000 each month.',
    proposed:[{label:'Group',value:'Eight-person chama being planned'},{label:'Contributions',value:'KES 2,000 per person per month, proposed'}],
    attention:'The purpose, group rules, handling of funds and decision-making arrangements have not been established.',
    question:'What is the main purpose of this chama?',next:'Agree the purpose and governance before asking people to consider membership.',
  },
  {
    id:'service',title:'Professional service',
    humanSays:'I want to hire someone to provide a professional service.',
    proposed:[{label:'Work',value:'A professional service being considered'}],
    attention:'The service, expected deliverable, provider, timing and review arrangements remain unspecified.',
    question:'What result do you need the professional to deliver?',next:'Clarify the scope and desired result before discussing price or acceptance.',
  },
  {
    id:'project',title:'Project milestones',
    humanSays:'I want to organise a construction project in phases.',
    proposed:[{label:'Work',value:'Construction work in proposed phases'}],
    attention:'The deliverables, responsibilities, evidence and acceptance conditions for each phase still need agreement.',
    question:'What should the first phase deliver?',next:'Describe each milestone before considering when any payment could become due.',
  },
  {
    id:'store',title:'Store purchase',
    humanSays:'I found goods in a Store and want them delivered.',
    proposed:[{label:'Work',value:'Exploring a Store purchase with delivery'}],
    attention:'An advertised offer is not an accepted order. Stock, current price, seller commitment and delivery conditions are not confirmed.',
    question:'Which goods are you considering?',next:'Identify the goods and offer source, then seek the seller’s confirmation separately.',
  },
];
export const phase2ExampleById=(id:Phase2ExampleId|null):Phase2Example|null=>
  phase2Examples.find(e=>e.id===id)??null;

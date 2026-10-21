import type { Ks001WorkspaceMode } from './personas';

/**
 * Owner-approved Gate 5B meaning, not new domain authority or a question engine.
 * Purpose language is intentionally shared by the real Workspace landing,
 * right-hand context panel and compact Money tool.
 */
export type PurposeArea = Exclude<Ks001WorkspaceMode, 'work'> | 'money';
export type PurposeGuidance = Readonly<{
  label:string;
  title:string;
  intro:string;
  belongs:string;
  boundary:string;
  next:string;
}>;
export const WORKSPACE_PURPOSES: Readonly<Record<PurposeArea, PurposeGuidance>> = {
  vision: {
    label:'Vision',
    title:'Imagine what could be possible',
    intro:'Sketch a dream, explore options and learn what it might take. You do not need a supplier, budget or commitment to begin.',
    belongs:'Private ideas, photos, sketches and alternatives that you choose to keep or share.',
    boundary:'A Dream does not become an Agreement, confirmed quotation or payment obligation unless you deliberately take a selected plan to My Work.',
    next:'When an idea starts becoming practical, choose what to bring to My Work. KS001 can then help clarify the proposed terms.',
  },
  circle: {
    label:'Circle',
    title:'Decide and work together',
    intro:'Bring a group around an idea. Discuss proposals, gather perspectives and use the Circle’s actual decision rules.',
    belongs:'The members, proposals, discussions and shared work that your Circle authorises you to see.',
    boundary:'Interest or support is not a formal vote. Being invited or joining never means accepting a separate Agreement.',
    next:'Make the group decision through its authorised governance first. Take an actual agreed task to My Work only when the Circle permits it.',
  },
  community: {
    label:'Community',
    title:'Meet people and find help',
    intro:'Find practical knowledge, projects, opportunities and people who can help you grow or contribute.',
    belongs:'Public LIVE stories, discoverable opportunities, projects, events and learning — according to their access rules.',
    boundary:'Public Community is not a private Circle. Circle-only discussion and member information never belong in LIVE without permission.',
    next:'Explore an opportunity, ask for guidance or connect with people. Any real job or transaction needs its own Agreement and consent.',
  },
  money: {
    label:'Money',
    title:'Understand your financial possibilities',
    intro:'My Money, Borrow, Invest and Protect help you consider relevant options. Money should follow the agreement.',
    belongs:'Your own Agreement-linked money needs and genuine provider information only when permission and eligibility are verified.',
    boundary:'Exploring a bank, finance, investment or insurance possibility is not a provider quote, approval, active cover or permission to move money.',
    next:'Clarify the Agreement in My Work. Real party acceptance and the separate Money preflight must happen before any financial execution.',
  },
} as const;

export const workspacePurpose = (area:PurposeArea):PurposeGuidance => WORKSPACE_PURPOSES[area];

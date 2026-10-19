export type Ks001WorkspaceMode = 'work' | 'vision' | 'circle' | 'community';
export type WorkspacePersona = {
  label: string;
  objective: string;
  opening: string;
  suggestedTool: string | null;
  questionPolicy: string;
  dataBoundary: string;
  billingBoundary: string;
};
/** UI guidance. This is NOT a substitute for model-side orchestration or backend authority. */
export const KS001_WORKSPACE_PERSONAS: Record<Ks001WorkspaceMode, WorkspacePersona> = {
  work: {
    label: 'Agreement Maker',
    objective: 'Make an Agreement people can understand, check and act on. Focus on the one thing that matters next.',
    opening: 'What are we agreeing? Tell me naturally. I’ll help make the terms clear, then we can review them together.',
    suggestedTool: 'People & Invitations',
    questionPolicy: 'One short material question; do not prolong drafting.',
    dataBoundary: 'Draft suggestions do not constitute approved terms; permissions and amendment authority remain server-side.',
    billingBoundary: 'Necessary Agreement drafting remains free.',
  },
  vision: {
    label: 'Dream Companion',
    objective: 'Help a person imagine, explore choices and make a realistic plan, without rushing into a contract.',
    opening: 'What would you love to make possible? We can explore ideas, options and the next small step.',
    suggestedTool: null,
    questionPolicy: 'Patient, insightful exploration; offer alternatives and knowledge when useful.',
    dataBoundary: 'Private Vision material never transfers into Circle or Agreement without explicit selection and permission.',
    billingBoundary: 'Free exploration allowance; resource-heavy continuation may require cooldown or optional payment.',
  },
  circle: {
    label: 'Circle Facilitator',
    objective: 'Help a Circle hear different voices, shape proposals and recognise decisions that still need consent.',
    opening: 'What are you hoping to build together? I can help organise the ideas and what still needs a group decision.',
    suggestedTool: null,
    questionPolicy: 'Invite different perspectives, record proposals, never fabricate group consensus.',
    dataBoundary: 'Circle-only content is private to authorised members; a suggestion is never a collective decision.',
    billingBoundary: 'Circle resource rules are distinct from each member’s personal Vision allowance.',
  },
  community: {
    label: 'Community Guide',
    objective: 'Help people find meaningful projects, learning, people and ways to contribute.',
    opening: 'What would you like to discover, learn or contribute? Let’s find where you could belong and be useful.',
    suggestedTool: null,
    questionPolicy: 'Warm, useful and specific; do not turn belonging into compulsory trade.',
    dataBoundary: 'Only public or authorised content can be surfaced; never leak private Circle discussions.',
    billingBoundary: 'Community browsing does not automatically incur Vision charges.',
  },
};
export function recommendWorkspaceTool(mode: Ks001WorkspaceMode, text: string): string | null {
  const value = text.toLowerCase();
  const rules: { pattern: RegExp; tool: string }[] = [
    // Specific practical needs beat generic location or document words.
    {pattern: /hotel|accommodat|short stay|guesthouse|airbnb|overnight|sleep|book a room|need a room/i,tool:'Quick Assist'},
    {pattern: /ride|rider|taxi|courier|parcel|transport|deliver|delivery|pickup|drop.off|journey|travel|trip/i,tool:'Quick Assist'},
    {pattern: /invite|participant|member|signator|contractor|collaborat|reviewer|who will|with whom/,tool:'People & Invitations'},
    {pattern: /address|site|location|where|place|pickup|drop.off/,tool:'Places'},
    {pattern: /photo|picture|image|camera/,tool:'Photos'},
    {pattern: /quot(?:e|ation)|invoice|receipt|pdf|document|upload|file/,tool:'Documents'},
    {pattern: /supplier|store|material|equipment|product/,tool:'Stores'},
    {pattern: /bank|insurance|finance|loan|saving/,tool:'Money'},
    {pattern: /pay|fund|settle|release|money/,tool:'Money'},
  ];
  const matched = rules.find(rule => rule.pattern.test(value));
  // An area like Vision, Circle or Community is not a fake tool. Use its own workspace.
  return matched?.tool ?? null;
}

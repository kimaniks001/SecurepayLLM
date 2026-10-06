import { useEffect, useState } from 'react';
import type { CommunityGateway } from '../../api/securepay/community';
import type {
  CircleCoordinationPromptDto,
  CircleCoordinationResponseCode,
  CommunityObjectResponse,
} from '../../api/securepay/community/dto';

type CircleBoardLane = {
  key: 'CHECKPOINTS' | 'NEEDS' | 'DECISIONS' | 'OPPORTUNITIES' | 'NOTES';
  label: string;
  hint: string;
  objectTypes: CommunityObjectResponse['objectType'][];
};

const LANES: CircleBoardLane[] = [
  { key: 'CHECKPOINTS', label: 'Checkpoints', hint: 'Work that is ready, completed, or needs an internal look before formal review.', objectTypes: ['WORK_STORY'] },
  { key: 'NEEDS', label: 'Needs', hint: 'Skills, help, people or practical things the Circle still needs to sort out.', objectTypes: ['NEED'] },
  { key: 'DECISIONS', label: 'Questions & decisions', hint: 'Things the Circle needs to answer or agree before moving on.', objectTypes: ['QUESTION'] },
  { key: 'OPPORTUNITIES', label: 'Options', hint: 'Useful possibilities the Circle may choose to pursue.', objectTypes: ['OPPORTUNITY'] },
  { key: 'NOTES', label: 'Notes', hint: 'Shared context worth keeping visible while the Circle coordinates.', objectTypes: ['DISCUSSION'] },
];

const RESPONSE_LABEL: Record<CircleCoordinationResponseCode,string> = {
  OKAY:'Okay', ON_MY_WAY:'On my way', COMING_IN_20_MIN:'Coming in 20 min', HOLD:'Hold',
  NEED_DETAILS:'Need details', COUNT_ME_IN:'Count me in', I_CAN_HELP:'I can help', GOT_IT:'Got it',
  DONE:'Done', READY:'Ready', BLOCKED:'Blocked', COME_CHECK:'Come check',
  LOOKS_OK_FROM_PHOTOS:'Looks okay from photos', NOT_ME:'Not me', IM_DRIVING:"I'm driving",
  I_NEED_ONE:'I need one', SKIP:'Skip', TOO_HIGH:'Too high',
};

function newKey(prefix:string):string {
  return globalThis.crypto?.randomUUID?.() ?? `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function BoardCard({ object, onOpen }: { object: CommunityObjectResponse; onOpen: () => void }) {
  return (
    <button onClick={onOpen} className="w-full text-left rounded-xl border border-cream-200 bg-white px-3.5 py-3 hover:border-forest-300 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="text-[0.82rem] font-medium text-forest-800 leading-snug">{object.title}</div>
        {object.status !== 'ACTIVE' && <span className="shrink-0 text-[0.62rem] uppercase tracking-wide text-sand-500">{object.status.toLowerCase()}</span>}
      </div>
      <p className="text-[0.74rem] text-sand-600 mt-1 line-clamp-3">{object.body}</p>
      <div className="mt-2 flex items-center gap-2 flex-wrap text-[0.66rem] text-sand-500">
        {object.authorDisplayName && <span>{object.authorDisplayName}</span>}
        {object.locationLabel && <span>· {object.locationLabel}</span>}
      </div>
    </button>
  );
}

function CoordinationPanel({ circleId, gateway, active }: { circleId:string; gateway:CommunityGateway; active:boolean }) {
  const [prompts,setPrompts]=useState<CircleCoordinationPromptDto[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState<string|null>(null);
  const [composer,setComposer]=useState(false);
  const [text,setText]=useState('');
  const [submitting,setSubmitting]=useState(false);

  const load=async()=>{
    setLoading(true); setError(null);
    try { setPrompts(await gateway.coordination.mine(circleId)); }
    catch(e) { setError(e instanceof Error ? e.message : 'Coordination prompts could not be loaded.'); }
    finally { setLoading(false); }
  };

  useEffect(()=>{ void load(); },[circleId]);

  const create=async()=>{
    const prompt=text.trim();
    if(!prompt) return;
    setSubmitting(true); setError(null);
    try {
      await gateway.coordination.create(circleId,{
        promptText:prompt,
        contextType:'CIRCLE_BOARD',
        contextReference:circleId,
        allowedResponses:['OKAY','ON_MY_WAY','HOLD','NEED_DETAILS'],
        targetCanonicalKsNumbers:null,
        expiresAt:null,
      },newKey('circle-coordination'));
      setText(''); setComposer(false); await load();
    } catch(e) { setError(e instanceof Error ? e.message : 'Quick response could not be sent.'); }
    finally { setSubmitting(false); }
  };

  const respond=async(prompt:CircleCoordinationPromptDto,responseCode:CircleCoordinationResponseCode)=>{
    setError(null);
    try {
      const updated=await gateway.coordination.respond(circleId,prompt.id,responseCode,newKey('circle-response'),'IN_APP');
      setPrompts(items=>items.map(item=>item.id===updated.id?updated:item));
    } catch(e) { setError(e instanceof Error ? e.message : 'Response could not be recorded.'); }
  };

  return <section className="rounded-2xl border border-forest-100 bg-forest-50/30 p-3.5 space-y-3">
    <div className="flex items-start justify-between gap-3">
      <div>
        <h3 className="text-[0.78rem] font-semibold text-forest-800 uppercase tracking-wide">Needs a quick response</h3>
        <p className="text-[0.7rem] text-sand-600 mt-0.5">Walkie-talkie coordination. Your response updates Circle coordination only — never an Agreement milestone or Money.</p>
      </div>
      {active && <button onClick={()=>setComposer(v=>!v)} className="shrink-0 text-[0.74rem] font-medium text-forest-600">{composer?'Close':'+ Ask'}</button>}
    </div>

    {composer && <div className="rounded-xl border border-cream-200 bg-white p-3 space-y-2">
      <textarea value={text} onChange={e=>setText(e.target.value)} rows={2} placeholder="e.g. Walls done — interior designer, please check before we close out." className="w-full resize-none rounded-lg border border-cream-200 px-3 py-2 text-[0.8rem]" />
      <div className="flex items-center justify-between gap-3">
        <p className="text-[0.66rem] text-sand-500">Sent to current Circle members. Choices: Okay · On my way · Hold · Need details.</p>
        <button disabled={submitting||!text.trim()} onClick={()=>void create()} className="rounded-lg bg-forest-600 px-3 py-2 text-[0.72rem] font-medium text-cream-50 disabled:opacity-50">{submitting?'Sending…':'Ask'}</button>
      </div>
    </div>}

    {loading && <p className="text-[0.75rem] text-sand-500">Loading quick responses…</p>}
    {error && <p role="alert" className="text-[0.72rem] text-red-600">{error}</p>}
    {!loading && prompts.length===0 && <p className="text-[0.74rem] text-sand-500">Nothing needs a quick response right now.</p>}
    {prompts.map(prompt=><div key={prompt.id} className="rounded-xl border border-cream-200 bg-white px-3 py-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[0.8rem] font-medium text-forest-800">{prompt.promptText}</p>
        <span className="text-[0.62rem] uppercase tracking-wide text-sand-500">{prompt.status.toLowerCase()}</span>
      </div>
      {prompt.myResponse ? <p className="mt-2 text-[0.72rem] text-forest-600">You replied: {RESPONSE_LABEL[prompt.myResponse]}</p> :
        prompt.status==='OPEN' && <div className="mt-2 flex flex-wrap gap-1.5">
          {prompt.allowedResponses.map(code=><button key={code} onClick={()=>void respond(prompt,code)} className="rounded-full border border-forest-200 bg-forest-50 px-2.5 py-1.5 text-[0.68rem] font-medium text-forest-700 hover:bg-white">{RESPONSE_LABEL[code]}</button>)}
        </div>}
    </div>)}
  </section>;
}

/**
 * Circle Board combines two canonical Circle sources: persisted Community objects for the working
 * board and typed Circle coordination prompts for quick responses. Neither source grants Agreement
 * or Money authority.
 */
export function CircleBoard({
  circleId,
  gateway,
  objects,
  loading,
  active,
  onOpenObject,
  onAdd,
}: {
  circleId: string;
  gateway: CommunityGateway;
  objects: CommunityObjectResponse[];
  loading: boolean;
  active: boolean;
  onOpenObject: (id: string) => void;
  onAdd: () => void;
}) {
  if (loading) return <p className="text-[0.8rem] text-sand-500 py-4">Loading Circle Board…</p>;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-forest-100 bg-forest-50/40 px-4 py-3.5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-base text-forest-800 font-medium">Circle Board</h2>
            <p className="text-[0.76rem] text-sand-600 mt-1">The Circle's shared working view — what is ready, needed, unresolved and worth keeping in sight.</p>
          </div>
          {active && <button onClick={onAdd} className="shrink-0 rounded-xl bg-forest-600 px-3 py-2 text-[0.75rem] font-medium text-cream-50 hover:bg-forest-700">+ Add</button>}
        </div>
        <p className="text-[0.68rem] text-sand-500 mt-2">Board items coordinate the Circle. They do not accept an Agreement milestone, bind a member, or move money.</p>
      </div>

      <CoordinationPanel circleId={circleId} gateway={gateway} active={active} />

      {objects.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-cream-300 bg-white px-5 py-7 text-center">
          <p className="text-[0.84rem] font-medium text-forest-800">Nothing else needs organising yet.</p>
          <p className="text-[0.75rem] text-sand-500 mt-1">Add the first checkpoint, need, question, option or shared note.</p>
          {active && <button onClick={onAdd} className="mt-3 text-[0.78rem] font-medium text-forest-600 hover:text-forest-700">Add to Circle Board</button>}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {LANES.map(lane => {
            const laneObjects = objects.filter(object => lane.objectTypes.includes(object.objectType));
            return <section key={lane.key} className="rounded-2xl border border-cream-200 bg-cream-50/50 p-3">
              <div className="px-1 pb-2.5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-[0.76rem] font-semibold text-forest-800 uppercase tracking-wide">{lane.label}</h3>
                  <span className="text-[0.66rem] text-sand-500">{laneObjects.length}</span>
                </div>
                <p className="text-[0.68rem] text-sand-500 mt-0.5">{lane.hint}</p>
              </div>
              <div className="space-y-2">
                {laneObjects.length===0 ? <div className="rounded-xl border border-dashed border-cream-200 bg-white/70 px-3 py-3 text-[0.7rem] text-sand-500">Nothing here right now.</div>
                  : laneObjects.map(object=><BoardCard key={object.id} object={object} onOpen={()=>onOpenObject(object.id)} />)}
              </div>
            </section>;
          })}
        </div>
      )}
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Check, Coins, Library, Upload, WandSparkles } from 'lucide-react';
import type { InstituteGateway } from '../../api/securepay/institute';
import type {
  InstituteAccessMode, InstituteAssetKind, InstituteHostKind, InstituteKnowledgeSpaceDto,
  InstituteLearningAssetDto, InstituteProgramDto, InstituteSpaceVisibility,
} from '../../api/securepay/institute/dto';
import { InstituteKnowledgeProposal } from './InstituteKnowledgeProposal';
import { InstituteMasterOfferStudio } from './InstituteMasterOfferStudio';
import { InstituteSessionStudio } from './InstituteSessionStudio';

const ASSET_KINDS: { value: InstituteAssetKind; label: string }[] = [
  { value: 'ARTICLE', label: 'Article' },
  { value: 'LESSON', label: 'Lesson' },
  { value: 'GUIDE', label: 'Guide' },
  { value: 'PODCAST', label: 'Podcast' },
  { value: 'VIDEO', label: 'Video' },
  { value: 'CASE_STUDY', label: 'Case study' },
  { value: 'CHECKLIST', label: 'Checklist' },
  { value: 'TOOL', label: 'Tool / template' },
  { value: 'PRACTICAL_TASK', label: 'Practical task' },
];

const TAG_TYPES = new Set(['TOPIC','CAPABILITY','INTENT','LEVEL','FORMAT','CONTEXT','RISK','AUTHORITY','PROJECT']);

function tagsFrom(text: string) {
  return text.split(',').map(part => part.trim()).filter(Boolean).map(part => {
    const [rawPrefix, ...rest] = part.split(':');
    const prefix = rawPrefix.toUpperCase();
    if (rest.length > 0 && TAG_TYPES.has(prefix)) {
      return { type: prefix as 'TOPIC' | 'CAPABILITY' | 'INTENT' | 'LEVEL' | 'FORMAT' | 'CONTEXT' | 'RISK' | 'AUTHORITY' | 'PROJECT', value: rest.join(':').trim() };
    }
    return { type: 'TOPIC' as const, value: part };
  }).filter(tag => tag.value.length > 0);
}

export function InstituteTeachStudio({ gateway, preferredSpaceId }: { gateway: InstituteGateway; preferredSpaceId?: string | null }) {
  const [spaces, setSpaces] = useState<InstituteKnowledgeSpaceDto[]>([]);
  const [spacesLoading, setSpacesLoading] = useState(true);
  const [space, setSpace] = useState<InstituteKnowledgeSpaceDto | null>(null);
  const [asset, setAsset] = useState<InstituteLearningAssetDto | null>(null);
  const [spaceAssets, setSpaceAssets] = useState<InstituteLearningAssetDto[]>([]);
  const [assetsLoading, setAssetsLoading] = useState(false);
  const [program, setProgram] = useState<InstituteProgramDto | null>(null);
  const [storeOfferId, setStoreOfferId] = useState<string | null>(null);
  const [aiTags, setAiTags] = useState<string[]>([]);

  const [hostKind, setHostKind] = useState<Extract<InstituteHostKind, 'PERSONAL' | 'MASTER'>>('PERSONAL');
  const [spaceName, setSpaceName] = useState('My knowledge space');
  const [spacePurpose, setSpacePurpose] = useState('');
  const [visibility, setVisibility] = useState<Extract<InstituteSpaceVisibility, 'PUBLIC' | 'COMMUNITY' | 'PRIVATE'>>('COMMUNITY');

  const [kind, setKind] = useState<InstituteAssetKind>('GUIDE');
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [body, setBody] = useState('');
  const [tagText, setTagText] = useState('');
  const [sourceNote, setSourceNote] = useState('');

  const [programTitle, setProgramTitle] = useState('');
  const [programPurpose, setProgramPurpose] = useState('');
  const [accessMode, setAccessMode] = useState<InstituteAccessMode>('FREE');
  const [priceKes, setPriceKes] = useState('');

  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const parsedTags = useMemo(() => tagsFrom(tagText), [tagText]);

  useEffect(() => {
    let cancelled = false;
    setSpacesLoading(true);
    void gateway.mySpaces().then(found => {
      if (cancelled) return;
      setSpaces(found);
      if (preferredSpaceId) {
        const preferred = found.find(candidate => candidate.id === preferredSpaceId);
        if (preferred) setSpace(preferred);
      }
    }).catch(() => {
      if (!cancelled) setError('The Institute could not load your Knowledge Spaces just now.');
    }).finally(() => {
      if (!cancelled) setSpacesLoading(false);
    });
    return () => { cancelled = true; };
  }, [gateway, preferredSpaceId]);

  useEffect(() => {
    if (!space) {
      setSpaceAssets([]);
      return;
    }
    let cancelled = false;
    setAssetsLoading(true);
    void gateway.spaceAssets(space.id).then(found => {
      if (!cancelled) setSpaceAssets(found);
    }).catch(() => {
      if (!cancelled) setError('The Institute could not load material in this Knowledge Space.');
    }).finally(() => {
      if (!cancelled) setAssetsLoading(false);
    });
    return () => { cancelled = true; };
  }, [gateway, space?.id]);

  async function chooseAsset(chosen: InstituteLearningAssetDto) {
    if (busy) return;
    setBusy('load-asset'); setError(null); setNotice(null);
    try {
      const content = await gateway.assetContent(chosen.id);
      setAsset(chosen);
      setKind(chosen.kind);
      setTitle(chosen.title);
      setSummary(chosen.summary);
      setBody(content.body ?? '');
      setSourceNote(content.sourceNote ?? '');
      setTagText(chosen.tags.map(tag => `${tag.type.toLowerCase()}:${tag.value}`).join(', '));
      setProgram(null);
      setStoreOfferId(null);
      setAiTags([]);
      setNotice(chosen.status === 'DRAFT'
        ? 'Draft loaded for review. Saving a revision creates a new version and keeps the earlier version intact.'
        : 'Published material loaded for reference.');
    } catch {
      setError('The Institute could not open this material.');
    } finally { setBusy(null); }
  }

  function chooseSpace(chosen: InstituteKnowledgeSpaceDto | null) {
    setSpace(chosen);
    setAsset(null);
    setProgram(null);
    setStoreOfferId(null);
    setAiTags([]);
    setError(null);
    setNotice(null);
  }

  async function makeSpace() {
    if (!spaceName.trim() || !spacePurpose.trim() || busy) return;
    setBusy('space'); setError(null); setNotice(null);
    try {
      const created = await gateway.createSpace({
        hostKind, name: spaceName.trim(), purpose: spacePurpose.trim(), visibility,
      });
      setSpace(created);
      setSpaces(current => [created, ...current.filter(candidate => candidate.id !== created.id)]);
      setNotice(hostKind === 'MASTER'
        ? 'Master Knowledge Space created from your currently verified Master standing.'
        : 'Knowledge Space created. Your material remains attributable to you.');
    } catch {
      setError(hostKind === 'MASTER'
        ? 'SecurePay could not create a Master space. A current verified Master capability is required.'
        : 'SecurePay could not create the Knowledge Space. Please try again.');
    } finally { setBusy(null); }
  }

  async function saveMaterial() {
    if (!space || !title.trim() || !summary.trim() || !body.trim() || busy) return;
    setBusy('asset'); setError(null); setNotice(null);
    try {
      const created = await gateway.createAsset({
        spaceId: space.id, kind, title: title.trim(), summary: summary.trim(), body: body.trim(),
        sourceNote: sourceNote.trim() || null, tags: parsedTags, sources: [],
      });
      setAsset(created);
      setNotice('Draft saved with its tags and provenance. Review it before publishing.');
    } catch {
      setError('SecurePay could not save this material. Nothing has been published.');
    } finally { setBusy(null); }
  }

  async function reviseMaterial() {
    if (!asset || asset.status !== 'DRAFT' || !body.trim() || busy) return;
    setBusy('revise'); setError(null); setNotice(null);
    try {
      const revised = await gateway.reviseDraftAsset(asset.id, {
        body: body.trim(),
        mediaReference: null,
        sourceNote: sourceNote.trim() || null,
      });
      setAsset(revised);
      setSpaceAssets(current => current.map(item => item.id === revised.id ? revised : item));
      setNotice(`Draft revision saved as version ${revised.currentVersion}. Nothing has been published.`);
    } catch {
      setError('The Institute could not save this draft revision. The previous version is unchanged.');
    } finally { setBusy(null); }
  }

  async function aiIndexMaterial() {
    if (!asset || busy) return;
    setBusy('ai-index'); setError(null); setNotice(null);
    try {
      const indexed = await gateway.aiIndexAsset(asset.id);
      setAiTags(indexed.tags.map(tag => `${tag.type.toLowerCase()}:${tag.value}`));
      setNotice(indexed.tags.length > 0
        ? 'AI added retrieval tags without changing your original material.'
        : 'AI indexing completed without adding new routing tags.');
    } catch {
      setError('AI indexing is unavailable right now. Your source material and existing tags are unchanged.');
    } finally { setBusy(null); }
  }

  async function publishMaterial() {
    if (!asset || busy) return;
    setBusy('publish'); setError(null); setNotice(null);
    try {
      const published = await gateway.publishAsset(asset.id);
      setAsset(published);
      if (!programTitle.trim()) setProgramTitle(published.title);
      if (!programPurpose.trim()) setProgramPurpose(published.summary);
      setNotice('Published to this Knowledge Space. Publishing does not make it SecurePay doctrine or a qualification.');
    } catch {
      setError('SecurePay could not publish this material. The draft has been kept.');
    } finally { setBusy(null); }
  }

  async function packageProgram() {
    if (!space || !asset || asset.status !== 'PUBLISHED' || !programTitle.trim() || !programPurpose.trim() || busy) return;
    setBusy('program'); setError(null); setNotice(null);
    try {
      if (accessMode === 'PAID') {
        const kes = Number(priceKes);
        if (!Number.isFinite(kes) || kes <= 0) {
          setError('Enter a positive KES price for the paid programme.');
          return;
        }
        const packaged = await gateway.createPaidProgramPackage({
          spaceId: space.id,
          initialAssetId: asset.id,
          title: programTitle.trim(),
          purpose: programPurpose.trim(),
          priceMinor: Math.round(kes * 100),
        });
        setProgram(packaged.program);
        setStoreOfferId(packaged.storeOfferId);
        setNotice('Paid programme published with a real Store service offer. Agreement and Money still happen through normal SecurePay authority.');
      } else {
        let created = await gateway.createProgram({
          spaceId: space.id, title: programTitle.trim(), purpose: programPurpose.trim(), accessMode,
        });
        created = await gateway.addProgramStep(created.id, {
          ordinal: 0, kind: 'LEARN', title: asset.title, assetId: asset.id, evidenceRequired: false,
        });
        created = await gateway.publishProgram(created.id);
        setProgram(created);
        setStoreOfferId(null);
        setNotice('Programme published. A fixed programme is optional; the same material can still be retrieved dynamically by the Institute.');
      }
    } catch {
      setError('SecurePay could not package this programme. Existing published material has not been changed.');
    } finally { setBusy(null); }
  }

  return (
    <div className="space-y-6">
      {error && <div role="alert" className="rounded-xl border border-ember-200 bg-white px-4 py-3 text-sm text-ember-800">{error}</div>}
      {notice && <div className="rounded-xl border border-forest-100 bg-forest-50 px-4 py-3 text-sm text-forest-800">{notice}</div>}

      {!space && (
        <>
          <section className="rounded-2xl border border-cream-200 bg-white p-5 md:p-6 shadow-soft">
            <div className="flex items-center gap-2"><Library className="w-5 h-5 text-forest-600" /><h2 className="font-display text-xl text-forest-900">Your Knowledge Spaces</h2></div>
            <p className="mt-2 text-[0.82rem] text-sand-600">Return to knowledge you are building personally, as a verified Master, or from a real Project.</p>
            {spacesLoading ? <p role="status" className="mt-4 text-sm text-sand-500">Loading Knowledge Spaces…</p> : spaces.length === 0 ? (
              <p className="mt-4 text-sm text-sand-500">No Knowledge Spaces yet. Start one below, or create one from a Project.</p>
            ) : (
              <div className="mt-4 grid gap-2 md:grid-cols-2">
                {spaces.map(candidate => (
                  <button key={candidate.id} type="button" onClick={() => chooseSpace(candidate)} className="rounded-xl border border-cream-200 bg-cream-50/60 p-3 text-left hover:border-forest-300">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-medium text-forest-900">{candidate.name}</span>
                      <span className="text-[0.62rem] uppercase tracking-wide text-sand-500">{candidate.hostKind.toLowerCase()}</span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-[0.74rem] text-sand-600">{candidate.purpose}</p>
                    <p className="mt-2 text-[0.65rem] text-sand-500">{candidate.visibility.toLowerCase()}</p>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-cream-200 bg-white p-5 md:p-6 shadow-soft">
            <div className="flex items-center gap-2"><Library className="w-5 h-5 text-forest-600" /><h2 className="font-display text-xl text-forest-900">Start a Knowledge Space</h2></div>
            <p className="mt-2 text-[0.82rem] text-sand-600">A space keeps your material, sources and future programmes together. It is not a department or fixed subject category.</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="text-xs text-sand-600">Publish as
                <select value={hostKind} onChange={e => setHostKind(e.target.value as 'PERSONAL' | 'MASTER')} className="mt-1 w-full rounded-xl border border-cream-200 px-3 py-2.5 text-sm">
                  <option value="PERSONAL">Myself</option><option value="MASTER">Verified Master</option>
                </select>
              </label>
              <label className="text-xs text-sand-600">Who can discover it?
                <select value={visibility} onChange={e => setVisibility(e.target.value as typeof visibility)} className="mt-1 w-full rounded-xl border border-cream-200 px-3 py-2.5 text-sm">
                  <option value="PUBLIC">Public</option><option value="COMMUNITY">Trust Project Community</option><option value="PRIVATE">Private</option>
                </select>
              </label>
            </div>
            <input value={spaceName} onChange={e => setSpaceName(e.target.value)} placeholder="Knowledge Space name" className="mt-3 w-full rounded-xl border border-cream-200 px-3 py-2.5 text-sm" />
            <textarea value={spacePurpose} onChange={e => setSpacePurpose(e.target.value)} rows={3} placeholder="What knowledge do you want this space to preserve or teach?" className="mt-3 w-full rounded-xl border border-cream-200 px-3 py-2.5 text-sm" />
            <button onClick={() => void makeSpace()} disabled={busy !== null || !spacePurpose.trim()} className="mt-3 min-h-11 rounded-xl bg-forest-700 px-4 text-sm font-medium text-white disabled:opacity-50">Create Knowledge Space</button>
          </section>
        </>
      )}

      {space && (
        <>
          <section className="rounded-2xl border border-cream-200 bg-white p-5 md:p-6 shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <div><p className="text-[0.68rem] uppercase tracking-wide text-forest-600">Knowledge Space</p><h2 className="font-display text-xl text-forest-900">{space.name}</h2><p className="mt-1 text-[0.8rem] text-sand-600">{space.purpose}</p></div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-cream-50 px-2 py-1 text-[0.68rem] text-sand-600">{space.hostKind.toLowerCase()}</span>
                <button type="button" onClick={() => chooseSpace(null)} className="text-[0.72rem] text-forest-700 underline">Change space</button>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-cream-200 bg-white p-5 md:p-6 shadow-soft">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[0.68rem] uppercase tracking-wide text-sand-500">Material in this space</p>
                <h2 className="mt-1 font-display text-xl text-forest-900">Return to drafts and published knowledge</h2>
              </div>
              {assetsLoading && <span className="text-xs text-sand-500">Loading…</span>}
            </div>
            {!assetsLoading && spaceAssets.length === 0 ? (
              <p className="mt-3 text-sm text-sand-500">No material here yet.</p>
            ) : (
              <div className="mt-4 grid gap-2 md:grid-cols-2">
                {spaceAssets.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => void chooseAsset(item)}
                    className={`rounded-xl border p-3 text-left transition-colors ${asset?.id === item.id ? 'border-forest-300 bg-forest-50' : 'border-cream-200 bg-cream-50/60 hover:border-forest-200'}`}
                  >
                    <p className="text-sm font-medium text-forest-900">{item.title}</p>
                    <p className="mt-1 text-[0.68rem] text-sand-500">{item.kind.toLowerCase().replace(/_/g, ' ')} · {item.status.toLowerCase()} · v{item.currentVersion}</p>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-cream-200 bg-white p-5 md:p-6 shadow-soft">
            <div className="flex items-center gap-2"><Upload className="w-5 h-5 text-forest-600" /><h2 className="font-display text-xl text-forest-900">Add what you know</h2></div>
            <p className="mt-2 text-[0.82rem] text-sand-600">Keep the original material rich. Tags help the Institute find the right pieces later; they do not replace the source.</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <select value={kind} onChange={e => setKind(e.target.value as InstituteAssetKind)} className="rounded-xl border border-cream-200 px-3 py-2.5 text-sm">
                {ASSET_KINDS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              <input value={tagText} onChange={e => setTagText(e.target.value)} placeholder="plumbing, capability:diagnosis, risk:supervised" className="rounded-xl border border-cream-200 px-3 py-2.5 text-sm" />
            </div>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title" className="mt-3 w-full rounded-xl border border-cream-200 px-3 py-2.5 text-sm" />
            <input value={summary} onChange={e => setSummary(e.target.value)} placeholder="What will somebody get from this?" className="mt-3 w-full rounded-xl border border-cream-200 px-3 py-2.5 text-sm" />
            <textarea value={body} onChange={e => setBody(e.target.value)} rows={8} placeholder="Write or paste the material here. Audio/video/document support can use media references as those publishing tools are connected." className="mt-3 w-full rounded-xl border border-cream-200 px-3 py-2.5 text-sm" />
            <input value={sourceNote} onChange={e => setSourceNote(e.target.value)} placeholder="Optional provenance note — e.g. learned across 12 pump repairs" className="mt-3 w-full rounded-xl border border-cream-200 px-3 py-2.5 text-sm" />
            {!asset && <button onClick={() => void saveMaterial()} disabled={busy !== null || !title.trim() || !summary.trim() || !body.trim()} className="mt-3 min-h-11 rounded-xl bg-forest-700 px-4 text-sm font-medium text-white disabled:opacity-50">Save draft</button>}
            {asset && (
              <div className="mt-4 rounded-xl border border-cream-200 bg-cream-50 p-4">
                <div className="flex items-center gap-2"><BookOpen className="w-4 h-4 text-forest-600" /><span className="text-sm font-medium text-forest-900">{asset.title}</span></div>
                <p className="mt-1 text-xs text-sand-600">Status: {asset.status.toLowerCase()} · {asset.tags.length} tag{asset.tags.length === 1 ? '' : 's'}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button onClick={() => void aiIndexMaterial()} disabled={busy !== null} className="min-h-11 rounded-xl border border-cream-200 bg-white px-4 text-sm font-medium text-forest-800 disabled:opacity-50">
                    {busy === 'ai-index' ? 'Indexing…' : 'Suggest tags with AI'}
                  </button>
                  {asset.status === 'DRAFT' && <button onClick={() => void reviseMaterial()} disabled={busy !== null || !body.trim()} className="min-h-11 rounded-xl border border-cream-200 bg-white px-4 text-sm font-medium text-forest-800 disabled:opacity-50">{busy === 'revise' ? 'Saving…' : 'Save revision'}</button>}
                  {asset.status === 'DRAFT' && <button onClick={() => void publishMaterial()} disabled={busy !== null} className="min-h-11 rounded-xl border border-forest-200 px-4 text-sm font-medium text-forest-800">Publish material</button>}
                </div>
                {aiTags.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{aiTags.map(tag => <span key={tag} className="rounded-full bg-white border border-cream-200 px-2 py-1 text-[0.68rem] text-sand-600">{tag}</span>)}</div>}
                {asset.status === 'PUBLISHED' && <p className="mt-2 flex items-center gap-1.5 text-xs text-forest-700"><Check className="w-3.5 h-3.5" />Available to the Knowledge Fabric under this space's visibility.</p>}
              </div>
            )}
          </section>

          {asset?.status === 'PUBLISHED' && (
            <InstituteKnowledgeProposal gateway={gateway} asset={asset} />
          )}

          {asset?.status === 'PUBLISHED' && (
            <section className="rounded-2xl border border-cream-200 bg-white p-5 md:p-6 shadow-soft">
              <div className="flex items-center gap-2"><WandSparkles className="w-5 h-5 text-forest-600" /><h2 className="font-display text-xl text-forest-900">Package it — only if structure helps</h2></div>
              <p className="mt-2 text-[0.82rem] text-sand-600">the Institute can retrieve this material dynamically without a course. Create a programme when deliberate sequence, access or pricing adds value.</p>
              <input value={programTitle} onChange={e => setProgramTitle(e.target.value)} placeholder="Programme title" className="mt-4 w-full rounded-xl border border-cream-200 px-3 py-2.5 text-sm" />
              <textarea value={programPurpose} onChange={e => setProgramPurpose(e.target.value)} rows={3} placeholder="What will this programme help someone accomplish?" className="mt-3 w-full rounded-xl border border-cream-200 px-3 py-2.5 text-sm" />
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <select value={accessMode} onChange={e => setAccessMode(e.target.value as InstituteAccessMode)} className="rounded-xl border border-cream-200 px-3 py-2.5 text-sm">
                  <option value="FREE">Free</option><option value="SPONSORED">Sponsored</option><option value="INVITE_ONLY">Invite only</option><option value="PAID">Paid through Store</option>
                </select>
                {accessMode === 'PAID' && <label className="relative"><Coins className="absolute left-3 top-3 w-4 h-4 text-sand-400" /><input value={priceKes} onChange={e => setPriceKes(e.target.value)} inputMode="decimal" placeholder="Price in KES" className="w-full rounded-xl border border-cream-200 py-2.5 pl-9 pr-3 text-sm" /></label>}
              </div>
              {!program && <button onClick={() => void packageProgram()} disabled={busy !== null || !programTitle.trim() || !programPurpose.trim()} className="mt-3 min-h-11 rounded-xl bg-forest-700 px-4 text-sm font-medium text-white disabled:opacity-50">{accessMode === 'PAID' ? 'Publish programme + Store offer' : 'Publish programme'}</button>}
              {program && (
                <div className="mt-4 rounded-xl border border-forest-100 bg-forest-50 p-4">
                  <p className="text-sm font-medium text-forest-900">{program.title}</p>
                  <p className="mt-1 text-xs text-forest-700">{program.accessMode.toLowerCase()} · {program.status.toLowerCase()} · {program.steps.length} learning step{program.steps.length === 1 ? '' : 's'}</p>
                  {storeOfferId && <p className="mt-2 text-xs text-sand-600">Commercial authority: published Store offer {storeOfferId}. Buying it still follows SecurePay Agreement and Money rules.</p>}
                </div>
              )}
            </section>
          )}

          <InstituteSessionStudio gateway={gateway} spaceId={space.id} />

          <InstituteMasterOfferStudio gateway={gateway} enabled={space.hostKind === 'MASTER'} />
        </>
      )}
    </div>
  );
}

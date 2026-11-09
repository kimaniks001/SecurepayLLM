import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft, ArrowRight, Camera, CheckCircle2, CircleHelp, FileText, HandCoins,
  MessageCircle, Pencil, RotateCcw, ShieldCheck, ShoppingBag, Sparkles, X
} from 'lucide-react';
import {
  emptyMiniDraft, formatMiniAmount, miniDraftIssue, miniRestoreDraft, miniReviewSummary,
  miniStorableDraft, type MiniDraft, type MiniIntent, type MiniLanguage, type MiniScreen
} from './miniModel';
import { MiniCaptureTools } from './MiniCaptureTools';
import { MiniGuestChat } from './MiniGuestChat';
import { MiniFundingPreview } from './MiniFundingPreview';
import { miniMergeUserDescription, miniCaptureText, type MiniCaptureSource, type MiniCaptureKind } from './miniCapture';
import './mini.css';

type View = MiniScreen | 'choose' | 'funding';
const STORE_KEY = 'securepay-mini-phase1-local-draft-v1';
const words = {
  en: {
    hello: 'Hello. What can I help you do?', intro: 'Tell me in your own words, or choose what you need.',
    start: 'Write a little about it (optional)', startHint: 'For example: I want to sell something to a customer',
    next: 'Continue', choose: 'What would you like to do with this?', sell: 'Sell something',
    sellHint: 'At a counter or from your shop', pay: 'Pay someone', payHint: 'For goods or an obligation',
    collect: 'Collect money', collectHint: 'For a purpose or contribution',
    ask: 'Ask KS001', askHint: 'Get help with something else',
    begin: 'What are we working on?', sellTitle: 'Tell me what you are selling.',
    payTitle: 'What are you paying for?', collectTitle: 'What is the collection for?',
    describe: 'Describe it', descriptionHint: 'A short description is enough',
    amount: 'Amount in KSh', amountHint: 'Enter the agreed amount',
    optionalAmount: 'Amount in KSh (optional)', optionalAmountHint: 'Leave empty to let the contributor choose',
    person: 'Other person or KS Number (optional)', personHint: 'Only for this local draft. No invitation will be sent.',
    note: 'Anything the other person should know? (optional)', noteHint: 'Condition, collection, delivery or other terms',
    photo: 'Add a photo', photoHint: 'Photo stays on this device. It is not analysed or uploaded.',
    review: 'Review what we have', preview: 'Draft review', notSent: 'Not sent. Not an agreement.',
    reviewText: 'Check these details. When connected to SecurePay, each person will review the real agreement before any payment.',
    edit: 'Change details', save: 'Keep draft in this tab', saved: 'Your draft is ready',
    savedDetail: 'This note is kept in this browser tab only. Nobody has been invited and no money has moved.',
    savedUnavailable: 'Draft preview complete, but browser storage is unavailable. Your draft remains on this page until you leave.',
    newWork: 'Start another', openFull: 'Open full SecurePay', fullDisclaimer: 'This local draft does not transfer to the full workspace yet.',
    phase1: 'Experience preview', boundary: 'No invitation, payment or fund release happens here.',
    helpTitle: 'KS001 belongs here.', helpDetail: 'This Phase 1 preview tests the small, simple experience. The live KS001 conversation is not yet connected to this Mini, so I will not pretend to answer on its behalf.',
    helpAction: 'Use KS001 in SecurePay', back: 'Back', clear: 'Clear draft',
    resume: 'Continue previous draft', noImage: 'Only an image (up to 5 MB) can be previewed.',
    needDescription: 'What is this for?', needAmount: 'How much is it?', invalidAmount: 'Please enter a valid amount in shillings.',
    captured: 'Photo selected, not uploaded', remove: 'Remove photo', privacy: 'Local preview only',
    seller: 'What it is', value: 'Proposed amount', party: 'Person', terms: 'Extra details',
    discuss: 'Discuss this with KS001',
    testFunding: 'Explore funding options (simulation)',
    phase4: 'Funding simulation',
    extra: 'Quantity, person and other details (optional)', quantity: 'Quantity (optional)', unit: 'Unit (optional)', unitHint: 'pieces, kg, bags, hours…', invalidQuantity: 'Please check the quantity.', capturedSources: 'Details you reviewed', sourceCaution: 'Selected locally, not independently verified', noSourceSaved: 'Attachments stay only on this page and are not saved.',
  },
  sw: {
    hello: 'Habari. Nikusaidie na nini?', intro: 'Niambie kwa maneno yako, au chagua unachohitaji.',
    start: 'Eleza kidogo (si lazima)', startHint: 'Kwa mfano: Nataka kuuza kitu kwa mteja',
    next: 'Endelea', choose: 'Unataka kufanya nini?', sell: 'Uza kitu', sellHint: 'Dukani au kwa mteja',
    pay: 'Lipa mtu', payHint: 'Bidhaa au malipo mengine', collect: 'Kusanya pesa', collectHint: 'Mchango au malipo',
    ask: 'Uliza KS001', askHint: 'Msaada mwingine', begin: 'Tunafanya nini?',
    sellTitle: 'Unauza nini?', payTitle: 'Unalipia nini?', collectTitle: 'Mchango huu ni wa nini?',
    describe: 'Eleza', descriptionHint: 'Maelezo mafupi yanatosha',
    amount: 'Kiasi kwa KSh', amountHint: 'Weka kiasi mlichokubaliana',
    optionalAmount: 'Kiasi kwa KSh (si lazima)', optionalAmountHint: 'Acha wazi mchangiaji aamue',
    person: 'Mtu au KS Number (si lazima)', personHint: 'Ni rasimu tu. Hakuna mwaliko utatumwa.',
    note: 'Kuna jambo jingine la kujua? (si lazima)', noteHint: 'Hali ya bidhaa, mahali au masharti',
    photo: 'Ongeza picha', photoHint: 'Picha inabaki kwenye kifaa chako. Haichambuliwi wala kutumwa.',
    review: 'Kagua maelezo', preview: 'Kagua rasimu', notSent: 'Haijatumwa. Si makubaliano.',
    reviewText: 'Kagua maelezo haya. Kila mshiriki atakagua makubaliano halisi kabla ya malipo.',
    edit: 'Badili maelezo', save: 'Hifadhi rasimu kwenye tabo hii', saved: 'Rasimu yako iko tayari',
    savedDetail: 'Imehifadhiwa kwenye tabo hii tu. Hakuna aliyealikwa, na pesa hazijatumwa.',
    savedUnavailable: 'Rasimu ipo kwenye ukurasa huu tu kwa sababu hifadhi ya kivinjari haipatikani.',
    newWork: 'Anza nyingine', openFull: 'Fungua SecurePay', fullDisclaimer: 'Rasimu hii bado haihamishiwi kwenye SecurePay kamili.',
    phase1: 'Jaribio la uzoefu', boundary: 'Hakuna mwaliko, malipo au kutolewa kwa pesa hapa.',
    helpTitle: 'KS001 itakuwa hapa.', helpDetail: 'Hili ni jaribio la muonekano na urahisi. Mazungumzo halisi ya KS001 bado hayajaunganishwa hapa.',
    helpAction: 'Tumia KS001 kwenye SecurePay', back: 'Rudi', clear: 'Futa rasimu',
    resume: 'Endelea na rasimu iliyopita', noImage: 'Picha tu (hadi MB 5) inaweza kuonyeshwa.',
    needDescription: 'Ni ya nini?', needAmount: 'Kiasi gani?', invalidAmount: 'Weka kiasi sahihi kwa shilingi.',
    captured: 'Picha imechaguliwa, haijatumwa', remove: 'Ondoa picha', privacy: 'Jaribio la hapa tu',
    seller: 'Maelezo', value: 'Kiasi', party: 'Mtu', terms: 'Maelezo zaidi',
    discuss: 'Jadili na KS001',
    testFunding: 'Jaribu njia za malipo (majaribio)',
    phase4: 'Jaribio la malipo',
    extra: 'Idadi, mtu na maelezo mengine (si lazima)', quantity: 'Idadi (si lazima)', unit: 'Kipimo (si lazima)', unitHint: 'vipande, kilo, mifuko, saa…', invalidQuantity: 'Kagua idadi uliyoandika.', capturedSources: 'Maelezo uliyokagua', sourceCaution: 'Yamechaguliwa hapa tu; hayajathibitishwa', noSourceSaved: 'Viambatisho havijahifadhiwa.',
  },
} as const;

function readSavedMiniDraft(): MiniDraft | null {
  try {
    const raw = sessionStorage.getItem(STORE_KEY);
    return raw ? miniRestoreDraft(JSON.parse(raw) as unknown) : null;
  } catch {
    return null;
  }
}

export function MiniExperience() {
  const [lang, setLang] = useState<MiniLanguage>('en');
  const t = words[lang];
  const [screen, setScreen] = useState<View>('home');
  const [opening, setOpening] = useState('');
  const [discussDraft, setDiscussDraft] = useState<MiniDraft | null>(null);
  const [draft, setDraft] = useState<MiniDraft>(emptyMiniDraft());
  const [error, setError] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoName, setPhotoName] = useState('');
  const [sources, setSources] = useState<MiniCaptureSource[]>([]);
  const nextSourceId = useRef(0);
  const [hasSaved, setHasSaved] = useState(() => readSavedMiniDraft() !== null);
  const [persisted, setPersisted] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const imageInput = useRef<HTMLInputElement | null>(null);
  const firstField = useRef<HTMLTextAreaElement | null>(null);
  const nextBtn = useRef<HTMLButtonElement | null>(null);
  const amountField = useRef<HTMLInputElement | null>(null);
  const quantityField = useRef<HTMLInputElement | null>(null);
  const compact = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('embedded') === '1';

  useEffect(() => {
    if (screen === 'describe') firstField.current?.focus({ preventScroll: true });
  }, [screen]);
  useEffect(() => { document.documentElement.lang = lang === 'sw' ? 'sw' : 'en'; }, [lang]);
  // A new Mini task must start at its top, not retain the scroll position
  // from the longer review screen (also applies inside the owner iframe).
  useEffect(() => {
    window.scrollTo(0, 0);
    document.querySelector<HTMLElement>('.spm-frame')?.scrollTo(0, 0);
  }, [screen]);

  const begin = (intent: MiniIntent) => {
    setDraft({ ...emptyMiniDraft(intent), description: opening.trim().slice(0, 400) });
    setOpening('');
    setError('');
    setPhoto(null);
    setPhotoName('');
    setSources([]);
    setScreen('describe');
  };
  const update = (field: keyof MiniDraft, value: string) => {
    setDraft(current => ({ ...current, [field]: value }));
    setError('');
  };
  const reset = () => {
    try { sessionStorage.removeItem(STORE_KEY); } catch { /* storage denied */ }
    setHasSaved(false);
    setOpening('');
    setDiscussDraft(null);
    setPhoto(null);
    setPhotoName('');
    setSources([]);
    setError('');
    setDraft(emptyMiniDraft());
    setScreen('home');
  };
  const resume = () => {
    const previous = readSavedMiniDraft();
    if (!previous) { setHasSaved(false); return; }
    setDraft(previous);
    setError('');
    setPhoto(null);
    setPhotoName('');
    setSources([]);
    setScreen('describe');
  };
  const choosePhoto = (file?: File) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setError(t.noImage);
      if (imageInput.current) imageInput.current.value = '';
      return;
    }
    setImageLoading(true);
    const reader = new FileReader();
    reader.onload = () => {
      setPhoto(typeof reader.result === 'string' ? reader.result : null);
      setPhotoName(file.name);
      setImageLoading(false);
    };
    reader.onerror = () => { setImageLoading(false); setError(t.noImage); };
    reader.readAsDataURL(file);
  };
  const addCapturedSource = (kind: MiniCaptureKind, label: string, description?: string) => {
    nextSourceId.current += 1;
    const source: MiniCaptureSource = {
      id: String(nextSourceId.current), kind,
      label: miniCaptureText(label, 120),
      detail: description ? 'User-reviewed local text' : 'Reference only; contents not verified',
      confirmedByUser: true, authority: 'LOCAL_UNVERIFIED',
    };
    setSources(old => [...old, source].slice(-5));
    if (description?.trim()) {
      setDraft(old => ({ ...old, description: miniMergeUserDescription(old.description, description) }));
    }
    setError('');
  };
  const removeSource = (id: string) => setSources(old => old.filter(source => source.id !== id));
  const review = () => {
    const issue = miniDraftIssue(draft);
    if (issue) {
      setError(issue === 'description' ? t.needDescription : issue === 'amount' ? t.needAmount : issue === 'quantity' ? t.invalidQuantity : t.invalidAmount);
      if (issue === 'description') firstField.current?.focus();
      else if (issue === 'quantity') {
        quantityField.current?.closest('details')?.setAttribute('open', '');
        quantityField.current?.focus();
      } else amountField.current?.focus();
      return;
    }
    setScreen('review');
    setError('');
  };
  const keepDraft = () => {
    let saved = false;
    try {
      sessionStorage.setItem(STORE_KEY, JSON.stringify(miniStorableDraft(draft)));
      saved = true;
    } catch { /* user disabled browser storage */ }
    setHasSaved(saved);
    setPersisted(saved);
    setPhoto(null);
    setPhotoName('');
    setSources([]);
    setScreen('saved');
    nextBtn.current?.focus();
  };
  const summary = miniReviewSummary(draft);

  return <main className={'spm-root' + (compact ? ' spm-embedded' : '')}>
    <div className="spm-frame">
      <header className="spm-head">
        <div className="spm-brand"><div className="spm-mark" aria-hidden="true"><ShieldCheck size={21}/></div>
          <div><div className="spm-name">SecurePay <span>mini</span></div><div className="spm-brand-sub">Trust is the currency</div></div>
        </div>
        <div className="spm-head-actions">
          <button className="spm-lang" type="button" onClick={() => setLang(lang === 'en' ? 'sw' : 'en')}
            aria-label={lang === 'en' ? 'Badili kwa Kiswahili' : 'Switch to English'}>{lang === 'en' ? 'Kiswahili' : 'English'}</button>
          {screen !== 'home' && <button type="button" className="spm-icon-btn" aria-label={t.clear} onClick={reset}><X size={19}/></button>}
        </div>
      </header>

      <div className="spm-main" aria-live="polite">
        {screen === 'home' && <section className="spm-entrance">
          <div className="spm-persona"><Sparkles size={16}/><span>KS001</span><span className="spm-dot"/><span>{t.phase4}</span></div>
          <h1 className="spm-hero">{t.hello}</h1>
          <p className="spm-lead">{t.intro}</p>
          <label className="spm-label" htmlFor="spm-words">{t.start}</label>
          <div className="spm-composer">
            <textarea id="spm-words" maxLength={400} rows={3} value={opening} onChange={e => setOpening(e.target.value)}
              placeholder={t.startHint}/>
            <button aria-label={t.next} className="spm-send" type="button" disabled={!opening.trim()}
              onClick={() => setScreen('choose')}><ArrowRight size={20}/></button>
          </div>
          <div className="spm-alternative"><span>{lang === 'sw' ? 'Au chagua' : 'Or choose a starting point'}</span></div>
          <div className="spm-actions">
            <button type="button" className="spm-option" onClick={() => begin('sell')}>
              <span className="spm-option-icon"><ShoppingBag size={20}/></span>
              <span className="spm-option-text"><strong>{t.sell}</strong><small>{t.sellHint}</small></span><ArrowRight size={18}/></button>
            <button type="button" className="spm-option" onClick={() => begin('pay')}>
              <span className="spm-option-icon"><FileText size={20}/></span>
              <span className="spm-option-text"><strong>{t.pay}</strong><small>{t.payHint}</small></span><ArrowRight size={18}/></button>
            <button type="button" className="spm-option" onClick={() => begin('collect')}>
              <span className="spm-option-icon"><HandCoins size={20}/></span>
              <span className="spm-option-text"><strong>{t.collect}</strong><small>{t.collectHint}</small></span><ArrowRight size={18}/></button>
          </div>
          <div className="spm-foot-row">
            <button type="button" className="spm-text-btn" onClick={() => { setDiscussDraft(null); setScreen('help'); }}><MessageCircle size={17}/>{t.ask}</button>
            {hasSaved && <button type="button" className="spm-text-btn" onClick={resume}><RotateCcw size={17}/>{t.resume}</button>}
          </div>
        </section>}

        {screen === 'choose' && <section className="spm-content">
          <button type="button" className="spm-back" onClick={() => setScreen('home')}><ArrowLeft size={18}/>{t.back}</button>
          <div className="spm-quote">{opening.trim()}</div>
          <h1 className="spm-question">{t.choose}</h1>
          <div className="spm-actions">
            {([['sell', ShoppingBag, t.sell], ['pay', FileText, t.pay], ['collect', HandCoins, t.collect]] as const).map(([id, Icon, label]) =>
              <button className="spm-option" key={id} type="button" onClick={() => begin(id)}>
                <span className="spm-option-icon"><Icon size={20}/></span><strong className="spm-option-text">{label}</strong><ArrowRight size={18}/></button>)}
          </div>
        </section>}

        {screen === 'describe' && <section className="spm-content">
          <button type="button" className="spm-back" onClick={() => setScreen('home')}><ArrowLeft size={18}/>{t.back}</button>
          <div className="spm-persona"><Sparkles size={16}/><span>KS001</span><span className="spm-dot"/><span>{t.privacy}</span></div>
          <h1 className="spm-question">{draft.intent === 'sell' ? t.sellTitle : draft.intent === 'pay' ? t.payTitle : t.collectTitle}</h1>
          <label className="spm-label" htmlFor="spm-description">{t.describe}</label>
          <textarea className="spm-field spm-main-field" id="spm-description" ref={firstField} maxLength={400} rows={3}
            placeholder={t.descriptionHint} value={draft.description} onChange={e => update('description', e.target.value)}/>
          <label className="spm-label" htmlFor="spm-amount">{draft.intent === 'collect' ? t.optionalAmount : t.amount}</label>
          <input className="spm-field" id="spm-amount" ref={amountField} type="text" inputMode="decimal" maxLength={30}
            placeholder={draft.intent === 'collect' ? t.optionalAmountHint : t.amountHint}
            value={draft.amount} onChange={e => update('amount', e.target.value)}/>
          <details className="spm-extra">
            <summary>{t.extra}</summary>
            <div className="spm-quantity-row">
              <label className="spm-label" htmlFor="spm-quantity">{t.quantity}
                <input className="spm-field" id="spm-quantity" ref={quantityField} inputMode="decimal" maxLength={15}
                  value={draft.quantity} onChange={e => update('quantity', e.target.value)} placeholder="1"/>
              </label>
              <label className="spm-label" htmlFor="spm-unit">{t.unit}
                <input className="spm-field" id="spm-unit" maxLength={30}
                  value={draft.unit} onChange={e => update('unit', e.target.value)} placeholder={t.unitHint}/>
              </label>
            </div>
          <div className="spm-details">
            <label className="spm-label" htmlFor="spm-person">{t.person}</label>
            <input className="spm-field" id="spm-person" maxLength={80} placeholder={t.personHint}
              value={draft.counterparty} onChange={e => update('counterparty', e.target.value)}/>
            <label className="spm-label" htmlFor="spm-note">{t.note}</label>
            <textarea className="spm-field" id="spm-note" rows={2} maxLength={400}
              placeholder={t.noteHint} value={draft.note} onChange={e => update('note', e.target.value)}/>
          </div>
          </details>
          <div className="spm-photo-row">
            <input aria-label={t.photo} id="spm-photo-file" type="file" accept="image/png,image/jpeg,image/webp" capture="environment"
              ref={imageInput} onChange={e => choosePhoto(e.target.files?.[0])}/>
            <button type="button" className="spm-secondary spm-photo-button" disabled={imageLoading}
              onClick={() => imageInput.current?.click()}><Camera size={18}/>{imageLoading ? '…' : t.photo}</button>
            <span>{t.photoHint}</span>
          </div>
          {photo && <figure className="spm-photo-preview">
            <img src={photo} alt={photoName || t.captured}/>
            <figcaption>{t.captured}</figcaption>
            <button type="button" onClick={() => {setPhoto(null);setPhotoName('');if(imageInput.current)imageInput.current.value='';}}>{t.remove}</button>
          </figure>}
          <MiniCaptureTools language={lang} onCapture={addCapturedSource}/>
          {sources.length > 0 && <div className="spm-source-list" aria-label={t.capturedSources}>
            <strong>{t.capturedSources}</strong>
            {sources.map(source => <div key={source.id} className="spm-source-row">
              <span>{source.label}<small>{t.sourceCaution}</small></span>
              <button type="button" onClick={() => removeSource(source.id)} aria-label={'Remove ' + source.label}><X size={16}/></button>
            </div>)}
          </div>}
          {error && <p className="spm-error" role="alert">{error}</p>}
          <button type="button" className="spm-primary" onClick={review}>{t.review}<ArrowRight size={19}/></button>
        </section>}

        {screen === 'review' && <section className="spm-content">
          <button type="button" className="spm-back" onClick={() => setScreen('describe')}><ArrowLeft size={18}/>{t.edit}</button>
          <div className="spm-persona spm-neutral"><Pencil size={16}/>{t.preview}</div>
          <h1 className="spm-question">{t.preview}</h1>
          <div className="spm-draft">
            <div className="spm-draft-status"><CircleHelp size={18}/><span>{t.notSent}</span></div>
            <div className="spm-draft-title">{summary.description}</div>
            <div className="spm-draft-amount">{summary.amount === 'Amount not set' ? t.optionalAmountHint : summary.amount}</div>
            {summary.party && <div className="spm-draft-detail"><span>{t.party}</span><strong>{summary.party}</strong></div>}
            {summary.quantity && <div className="spm-draft-detail"><span>{t.quantity}</span><strong>{summary.quantity} {summary.unit || ''}</strong></div>}
            {summary.note && <div className="spm-draft-detail"><span>{t.terms}</span><strong>{summary.note}</strong></div>}
            {sources.length > 0 && <div className="spm-draft-detail">
              <span>{t.capturedSources}</span>
              {sources.map(source => <strong key={source.id}>{source.label} · {t.sourceCaution}</strong>)}
            </div>}
            {photo && <div className="spm-review-photo"><img src={photo} alt={t.captured}/><span>{t.captured}</span></div>}
          </div>
          <p className="spm-support-text">{t.reviewText} {t.noSourceSaved}</p>
          <button className="spm-secondary spm-guest-launch" type="button" onClick={() => { setDiscussDraft(draft); setScreen('help'); }}><MessageCircle size={17}/>{t.discuss}</button>
          <button className="spm-secondary spm-guest-launch" type="button" onClick={() => setScreen('funding')}><HandCoins size={17}/>{t.testFunding}</button>
          <button className="spm-primary" type="button" onClick={keepDraft}>{t.save}<CheckCircle2 size={19}/></button>
          <button className="spm-quiet-button" type="button" onClick={() => setScreen('describe')}><Pencil size={16}/>{t.edit}</button>
        </section>}

        {screen === 'saved' && <section className="spm-content spm-finish">
          <div className="spm-finish-icon"><CheckCircle2 size={28}/></div>
          <h1 className="spm-question">{t.saved}</h1>
          <p className="spm-lead">{persisted ? t.savedDetail : t.savedUnavailable}</p>
          <div className="spm-quote">{draft.description} · {miniReviewSummary(draft).amount}</div>
          <button ref={nextBtn} type="button" className="spm-primary" onClick={reset}>{t.newWork}<ArrowRight size={19}/></button>
          <a className="spm-quiet-link" href="https://securepay.ke/" target="_blank" rel="noopener noreferrer">{t.openFull}</a>
          <p className="spm-disclaimer">{t.fullDisclaimer}</p>
        </section>}

        {screen === 'funding' && <MiniFundingPreview draft={draft} language={lang} onBack={() => setScreen('review')}/>}
        {screen === 'help' && <MiniGuestChat draft={discussDraft} language={lang}
          onBack={() => setScreen(discussDraft ? 'review' : 'home')}/>} 
      </div>

      <footer className="spm-footer">
        <ShieldCheck size={16} aria-hidden="true"/>
        <span>{t.boundary}</span>
        <span className="spm-footer-dash">·</span><span>Phase 4</span>
      </footer>
    </div>
  </main>;
}

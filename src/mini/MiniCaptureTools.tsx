import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, AudioLines, Barcode, FilePlus2, Store, X, Check, Camera, AlertCircle } from 'lucide-react';
import { miniBarcodeValue, miniCaptureText, miniDocumentStatus, type MiniCaptureKind } from './miniCapture';

type Tool = 'document' | 'voice' | 'barcode' | 'store' | null;
type BrowserRecognition = {
  lang: string;
  interimResults: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
};
type RecognitionProvider = { SpeechRecognition?: new () => BrowserRecognition; webkitSpeechRecognition?: new () => BrowserRecognition };
type BarcodeProvider = { BarcodeDetector?: new (options: { formats: string[] }) => { detect(image: ImageBitmap): Promise<Array<{ rawValue: string }>> } };

export function MiniCaptureTools({ onCapture, language }: {
  onCapture: (kind: MiniCaptureKind, label: string, suggestedDescription?: string) => void;
  language: 'en' | 'sw';
}) {
  const [expanded, setExpanded] = useState(false);
  const [tool, setTool] = useState<Tool>(null);
  const [documentName, setDocumentName] = useState('');
  const [documentStatus, setDocumentStatus] = useState('');
  const [documentText, setDocumentText] = useState('');
  const [spoken, setSpoken] = useState('');
  const [listening, setListening] = useState(false);
  const [barcode, setBarcode] = useState('');
  const [storeText, setStoreText] = useState('');
  const [error, setError] = useState('');
  const speech = useRef<BrowserRecognition | null>(null);
  const docInput = useRef<HTMLInputElement | null>(null);
  const barcodeInput = useRef<HTMLInputElement | null>(null);
  const sw = language === 'sw';

  useEffect(() => () => {
    if (speech.current) {
      speech.current.onend = null;
      speech.current.onerror = null;
      speech.current.onresult = null;
      speech.current.stop();
    }
  }, []);

  const open = (newTool: Tool) => {
    if (listening) { speech.current?.stop(); setListening(false); }
    setTool(newTool);
    setError('');
    setExpanded(true);
  };
  const finish = (kind: MiniCaptureKind, label: string, description?: string) => {
    if (listening) { speech.current?.stop(); setListening(false); }
    onCapture(kind, label, description);
    setTool(null);
    setExpanded(false);
    setError('');
  };
  const useDocument = async (file?: File) => {
    if (!file) return;
    setDocumentName('');
    setDocumentText('');
    setError('');
    const status = miniDocumentStatus(file.name, file.size);
    if (status === 'too-large' || status === 'unsupported') {
      setDocumentStatus('');
      setError(sw ? 'Chagua PDF, DOCX au maandishi (hadi MB 10).' : 'Choose PDF, Word or text (up to 10 MB; text files up to 256 KB).');
      return;
    }
    setDocumentName(file.name.slice(0, 120));
    if (status === 'readable-text') {
      try {
        const content = await file.text();
        const snippet = miniCaptureText(content);
        setDocumentText(snippet);
        setDocumentStatus(sw ? 'Maandishi yamesomwa hapa; kagua kabla ya kutumia.' : 'Text read on this device. Review it before using.');
      } catch {
        setDocumentStatus(sw ? 'Faili haikusomeka. Ipo hapa tu.' : 'Could not read this file; only its name is available.');
      }
    } else {
      setDocumentStatus(sw ? 'Faili imechaguliwa; haijasomwa wala kutumwa.' : 'File selected, but its contents have NOT been read or uploaded.');
    }
  };
  const toggleVoice = () => {
    if (listening) {
      speech.current?.stop();
      setListening(false);
      return;
    }
    const provider = window as unknown as RecognitionProvider;
    const Speech = provider.SpeechRecognition ?? provider.webkitSpeechRecognition;
    if (!Speech) {
      setError(sw ? 'Kifaa hiki hakina huduma ya kuandika kwa sauti. Andika mwenyewe.' : 'Browser dictation is unavailable here. You can type instead.');
      return;
    }
    try {
      const recognition = new Speech();
      recognition.lang = sw ? 'sw-KE' : 'en-KE';
      recognition.interimResults = false;
      recognition.onresult = event => {
        const transcripts = Array.from(event.results, row => row[0]?.transcript ?? '').filter(Boolean);
        setSpoken(miniCaptureText(transcripts.join(' ')));
      };
      recognition.onerror = event => {
        setListening(false);
        setError(sw ? 'Sauti haikutambuliwa. Tafadhali andika.' : 'Dictation could not finish (' + event.error + '). You can type instead.');
      };
      recognition.onend = () => setListening(false);
      speech.current = recognition;
      setError('');
      setListening(true);
      recognition.start();
    } catch {
      setListening(false);
      setError(sw ? 'Sauti haipatikani sasa.' : 'Dictation is unavailable in this browser.');
    }
  };
  const scanImageBarcode = async (file?: File) => {
    if (!file) return;
    setError('');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setError(sw ? 'Chagua picha ya JPG, PNG au WebP hadi MB 5.' : 'Use a JPG, PNG or WebP image up to 5 MB.');
      return;
    }
    const Detector = (window as unknown as BarcodeProvider).BarcodeDetector;
    if (!Detector || typeof createImageBitmap !== 'function') {
      setError(sw ? 'Kisoma msimbo hakipatikani. Ingiza nambari mwenyewe.' : 'Barcode scanning is unavailable here. You can enter the code manually.');
      return;
    }
    try {
      const bitmap = await createImageBitmap(file);
      let codes: Array<{rawValue: string}>;
      try {
        codes = await new Detector({ formats: ['ean_13', 'ean_8', 'upc_a', 'code_128'] }).detect(bitmap);
      } finally {
        bitmap.close();
      }
      const code = codes.map(item => miniBarcodeValue(item.rawValue)).find(value => value !== null);
      if (code) setBarcode(code);
      else setError(sw ? 'Hakuna msimbo uliosomeka. Unaweza kuandika.' : 'No readable barcode found. You can enter the code.');
    } catch {
      setError(sw ? 'Msimbo haukusomeka. Ingiza nambari mwenyewe.' : 'Could not read barcode. Enter the code manually.');
    }
  };

  return <section className="spm-capture-tools" aria-label="More ways to prepare this trade">
    {!expanded && <button type="button" className="spm-capture-trigger" onClick={() => open(null)}>
      <FilePlus2 size={17}/>{sw ? 'Njia nyingine za kuongeza' : 'More ways to add details'}
    </button>}
    {expanded && <div className="spm-capture-card">
      <div className="spm-capture-head">
        <button className="spm-back" type="button" onClick={() => { if (listening) speech.current?.stop(); setTool(null); setExpanded(false); }}>
          <ArrowLeft size={17}/>{sw ? 'Rudi' : 'Back'}
        </button>
        {tool !== null && <button type="button" className="spm-icon-btn" aria-label="Choose another source" onClick={() => open(null)}><X size={17}/></button>}
      </div>
      {tool === null && <>
        <p className="spm-capture-intro">{sw ? 'Chagua unachotaka kuongeza. Hakuna kinachotumwa.' : 'Choose a source. Nothing is sent or charged.'}</p>
        <div className="spm-capture-list">
          <button type="button" onClick={() => open('document')}><FilePlus2 size={18}/>{sw ? 'Hati' : 'Document'}</button>
          <button type="button" onClick={() => open('voice')}><AudioLines size={18}/>{sw ? 'Sema' : 'Dictate'}</button>
          <button type="button" onClick={() => open('barcode')}><Barcode size={18}/>{sw ? 'Msimbo wa bidhaa' : 'Barcode'}</button>
          <button type="button" onClick={() => open('store')}><Store size={18}/>{sw ? 'Maelezo ya dukani' : 'Store item details'}</button>
        </div>
      </>}
      {tool === 'document' && <>
        <h2 className="spm-capture-title">{sw ? 'Chagua hati' : 'Choose a document'}</h2>
        <input type="file" ref={docInput} className="spm-file-hidden" accept=".txt,.md,.csv,.pdf,.doc,.docx,.odt,.rtf"
          aria-label="Choose document" onChange={e => void useDocument(e.target.files?.[0])}/>
        <button type="button" className="spm-secondary" onClick={() => docInput.current?.click()}><FilePlus2 size={17}/>{sw ? 'Chagua faili' : 'Select file'}</button>
        {documentName && <div className="spm-capture-selected"><strong>{documentName}</strong><small>{documentStatus}</small></div>}
        {documentText && <div className="spm-capture-snippet">{documentText}</div>}
        {documentName && <button type="button" className="spm-secondary spm-capture-use" onClick={() => finish('document', documentName, documentText || undefined)}>
          <Check size={17}/>{documentText ? (sw ? 'Tumia maandishi haya' : 'Use reviewed text') : (sw ? 'Weka rejea ya faili' : 'Keep file reference')}
        </button>}
        <p className="spm-capture-note">{sw ? 'Hati haijatumwa. PDF/Word haitasomwa katika jaribio hili.' : 'No file is uploaded. PDF/Word contents are not extracted in this preview. A file reference is not a verified document.'}</p>
      </>}
      {tool === 'voice' && <>
        <h2 className="spm-capture-title">{sw ? 'Eleza kwa sauti' : 'Say it aloud'}</h2>
        <button type="button" className="spm-secondary" aria-pressed={listening} onClick={toggleVoice}>
          <AudioLines size={17}/>{listening ? (sw ? 'Simamisha' : 'Stop') : (sw ? 'Anza kuzungumza' : 'Start dictation')}
        </button>
        {spoken && <>
          <label className="spm-label" htmlFor="spm-spoken-review">{sw ? 'Kagua maneno' : 'Review these words'}</label>
          <textarea id="spm-spoken-review" className="spm-field" value={spoken} maxLength={400} rows={3}
            onChange={e => setSpoken(e.target.value)}/>
          <button type="button" className="spm-secondary spm-capture-use" onClick={() => finish('voice','User-reviewed browser dictation', spoken)}><Check size={17}/>{sw ? 'Tumia maneno' : 'Use these words'}</button>
        </>}
        <p className="spm-capture-note">{sw ? 'Kivinjari chako kinaweza kutumia huduma yake kusoma sauti. Hakuna sauti inayotumwa SecurePay Mini.' : 'Your browser’s speech provider may process your voice. This Mini does not upload or store an audio recording.'}</p>
      </>}
      {tool === 'barcode' && <>
        <h2 className="spm-capture-title">{sw ? 'Msimbo wa bidhaa' : 'Product barcode'}</h2>
        <label className="spm-label" htmlFor="spm-barcode-value">{sw ? 'Andika au soma msimbo' : 'Enter or scan a printed code'}</label>
        <input id="spm-barcode-value" className="spm-field" autoComplete="off" value={barcode} maxLength={96}
          onChange={e => setBarcode(e.target.value)} placeholder="EAN, UPC or Code 128"/>
        <input type="file" accept="image/png,image/jpeg,image/webp" className="spm-file-hidden" ref={barcodeInput}
          aria-label="Choose photo containing barcode" onChange={e => void scanImageBarcode(e.target.files?.[0])}/>
        <button type="button" className="spm-secondary spm-capture-use" onClick={() => barcodeInput.current?.click()}><Camera size={17}/>{sw ? 'Soma kwenye picha' : 'Read from a photo'}</button>
        <button type="button" className="spm-secondary spm-capture-use" disabled={!miniBarcodeValue(barcode)}
          onClick={() => { const code=miniBarcodeValue(barcode); if (code) finish('barcode', 'Barcode: ' + code); }}>
          <Check size={17}/>{sw ? 'Tumia msimbo' : 'Keep barcode reference'}
        </button>
        <p className="spm-capture-note">{sw ? 'Msimbo hauonyeshi bei, ubora au bidhaa iliyothibitishwa.' : 'A barcode alone does not verify the item, its quantity, quality, stock or price.'}</p>
      </>}
      {tool === 'store' && <>
        <h2 className="spm-capture-title">{sw ? 'Maelezo ya bidhaa ya dukani' : 'Store item details'}</h2>
        <label className="spm-label" htmlFor="spm-store-source">{sw ? 'Bandika maelezo unayoyakagua' : 'Paste the item description you have checked'}</label>
        <textarea id="spm-store-source" className="spm-field" rows={3} maxLength={400}
          value={storeText} onChange={e => setStoreText(e.target.value)} placeholder={sw ? 'Bidhaa au huduma...' : 'Item or service details...'}/>
        <button type="button" className="spm-secondary spm-capture-use" disabled={!storeText.trim()}
          onClick={() => finish('store-note', 'Store item details pasted by user', storeText)}>
          <Check size={17}/>{sw ? 'Tumia maelezo' : 'Use reviewed details'}
        </button>
        <p className="spm-capture-note">{sw ? 'Haya ni maelezo uliyobandika. Mini haijaunganisha duka wala kukagua bei au stoo.' : 'Pasted details only. No live Store lookup, seller verification, stock check or price confirmation has happened.'}</p>
      </>}
      {error && <p className="spm-error" role="alert"><AlertCircle size={15}/>{error}</p>}
    </div>}
  </section>;
}

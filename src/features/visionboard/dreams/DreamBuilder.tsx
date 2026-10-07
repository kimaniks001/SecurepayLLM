import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft, ArrowRight, Circle, Copy, Eraser, FileText, Frame, Grip, Image as ImageIcon,
  Link as LinkIcon, Minus, MousePointer2, PenLine, Plus, Redo2, Save, Shapes, StickyNote,
  Trash2, Type, Undo2, ZoomIn, ZoomOut,
} from 'lucide-react';
import { Button } from '../../../components/dna/Button';
import { StatusNotice } from '../../../components/dna/StatusNotice';
import type { VisionDreamGateway } from '../../../api/securepay/visiondreams';
import type { VisionDreamDto } from '../../../api/securepay/visiondreams/dto';

type BoardObject =
  | { id: string; kind: 'note' | 'text' | 'checklist' | 'frame'; x: number; y: number; w: number; h: number; text: string; tone?: number }
  | { id: string; kind: 'shape'; x: number; y: number; w: number; h: number; shape: 'rect' | 'circle' }
  | { id: string; kind: 'arrow' | 'line'; x: number; y: number; w: number; h: number }
  | { id: string; kind: 'drawing'; x: number; y: number; w: number; h: number; points: Array<[number, number]> }
  | { id: string; kind: 'link'; x: number; y: number; w: number; h: number; text: string; url: string }
  | { id: string; kind: 'image' | 'document'; x: number; y: number; w: number; h: number; assetId: string; fileName: string; mimeType: string };

type BoardDoc = { v: 1; objects: BoardObject[] };

const MAX_BOARD_BYTES = 524_288;
const TONES = ['bg-amber-100', 'bg-rose-100', 'bg-sky-100', 'bg-emerald-100'];
const ADD_TOOLS = [
  ['Note', 'note', StickyNote], ['Text', 'text', Type], ['Draw', 'draw', PenLine], ['Arrow', 'arrow', ArrowRight],
  ['Shape', 'shape', Shapes], ['Link', 'link', LinkIcon], ['Checklist', 'checklist', Circle], ['Frame', 'frame', Frame], ['Line', 'line', Minus],
] as const;

function uid() {
  return (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2, 12));
}

function decode(content: string | null): BoardDoc {
  if (!content?.trim()) return { v: 1, objects: [] };
  try {
    const parsed = JSON.parse(content) as BoardDoc;
    if (parsed?.v === 1 && Array.isArray(parsed.objects)) return parsed;
  } catch {
    // Existing text-only Dreams become one editable note; original words are preserved.
  }
  return { v: 1, objects: [{ id: uid(), kind: 'note', x: 80, y: 80, w: 260, h: 150, text: content, tone: 0 }] };
}

function encode(doc: BoardDoc) { return JSON.stringify(doc); }
function bytes(value: string) { return new TextEncoder().encode(value).length; }
function nextTone(current = 0) { return (current + 1) % TONES.length; }

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read that file.'));
    reader.onload = () => {
      const value = String(reader.result ?? '');
      resolve(value.includes(',') ? value.slice(value.indexOf(',') + 1) : value);
    };
    reader.readAsDataURL(file);
  });
}

export function DreamBuilder({
  dream, gateway, onBack, onSaveTitle, onExploreKs001,
}: {
  dream: VisionDreamDto;
  gateway: VisionDreamGateway;
  onBack: () => void;
  onSaveTitle: (title: string, content: string, expectedVersion: number) => Promise<boolean>;
  onExploreKs001?: (draftText: string) => void;
}) {
  const legacyInitial = useMemo(() => decode(dream.content), [dream.dreamId]);
  const [title, setTitle] = useState(dream.title);
  const [doc, setDoc] = useState<BoardDoc>(legacyInitial);
  const [revision, setRevision] = useState(0);
  const [history, setHistory] = useState<BoardDoc[]>([]);
  const [future, setFuture] = useState<BoardDoc[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [tool, setTool] = useState<'select' | 'draw' | 'erase'>('select');
  const [zoom, setZoom] = useState(1);
  const [saveState, setSaveState] = useState<'loading' | 'idle' | 'saving' | 'saved' | 'error'>('loading');
  const [localError, setLocalError] = useState<string | null>(null);
  const [assetContent, setAssetContent] = useState<Record<string, string>>({});
  const canvasRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const drawRef = useRef<{ id: string; before: BoardDoc; points: Array<[number, number]> } | null>(null);

  useEffect(() => {
    let live = true;
    setSaveState('loading');
    void gateway.board(dream.dreamId).then(board => {
      if (!live) return;
      const authoritative = board.revision > 0 ? decode(board.documentJson) : legacyInitial;
      setDoc(authoritative);
      setRevision(board.revision);
      setHistory([]);
      setFuture([]);
      setSaveState('idle');
      setLocalError(null);
    }).catch(() => {
      if (!live) return;
      setDoc(legacyInitial);
      setRevision(0);
      setSaveState('idle');
      setLocalError('Visual board storage is not reachable yet. Your existing Dream is still available; do not rely on this board as saved until SecurePay confirms it.');
    });
    return () => { live = false; };
  }, [dream.dreamId, gateway, legacyInitial]);

  useEffect(() => {
    const ids = doc.objects.filter(o => o.kind === 'image')
      .map(o => (o as Extract<BoardObject, { kind: 'image' | 'document' }>).assetId)
      .filter(id => !assetContent[id]);
    if (!ids.length) return;
    let live = true;
    void Promise.all(ids.map(async id => {
      try {
        const asset = await gateway.asset(dream.dreamId, id);
        if (asset.base64Content && live) setAssetContent(current => ({ ...current, [id]: asset.base64Content! }));
      } catch {
        // The card remains on the board with its filename; missing bytes are not fabricated.
      }
    }));
    return () => { live = false; };
  }, [doc.objects, assetContent, gateway, dream.dreamId]);

  const commit = (next: BoardDoc) => {
    setHistory(h => [...h.slice(-39), doc]);
    setFuture([]);
    setDoc(next);
    setSaveState('idle');
  };

  const patchObject = (id: string, patch: Partial<BoardObject>) =>
    commit({ v: 1, objects: doc.objects.map(o => o.id === id ? ({ ...o, ...patch } as BoardObject) : o) });

  const add = (kind: 'note' | 'text' | 'checklist' | 'frame' | 'shape' | 'arrow' | 'line' | 'link') => {
    const base = { id: uid(), x: 120 + doc.objects.length * 12, y: 110 + doc.objects.length * 10 };
    let object: BoardObject;
    if (kind === 'note') object = { ...base, kind, w: 220, h: 150, text: 'New thought', tone: doc.objects.length % TONES.length };
    else if (kind === 'text') object = { ...base, kind, w: 260, h: 90, text: 'Type here' };
    else if (kind === 'checklist') object = { ...base, kind, w: 260, h: 150, text: '☐ First thing\n☐ Next thing' };
    else if (kind === 'frame') object = { ...base, kind, w: 360, h: 240, text: 'Area' };
    else if (kind === 'shape') object = { ...base, kind, w: 170, h: 110, shape: 'rect' };
    else if (kind === 'link') {
      const url = window.prompt('Paste a link')?.trim();
      if (!url) return;
      object = { ...base, kind, w: 280, h: 110, text: url, url };
    } else object = { ...base, kind, w: 190, h: 80 };
    commit({ v: 1, objects: [...doc.objects, object] });
    setSelected(object.id);
    setAddOpen(false);
    setTool('select');
  };

  const upload = async (file: File) => {
    if (file.size > 2_097_152) {
      setLocalError('This file is larger than the current 2 MB private Vision asset limit.');
      return;
    }
    setSaveState('saving');
    setLocalError(null);
    try {
      const base64Content = await fileToBase64(file);
      const asset = await gateway.uploadAsset(dream.dreamId, {
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        base64Content,
        idempotencyKey: uid(),
      });
      const kind: 'image' | 'document' = asset.mimeType.startsWith('image/') ? 'image' : 'document';
      const object: BoardObject = {
        id: uid(), kind, x: 140 + doc.objects.length * 10, y: 130 + doc.objects.length * 10,
        w: kind === 'image' ? 320 : 280, h: kind === 'image' ? 220 : 110,
        assetId: asset.assetId, fileName: asset.fileName, mimeType: asset.mimeType,
      };
      if (kind === 'image') setAssetContent(current => ({ ...current, [asset.assetId]: base64Content }));
      commit({ v: 1, objects: [...doc.objects, object] });
      setSelected(object.id);
    } catch (error) {
      setSaveState('error');
      setLocalError(error instanceof Error ? error.message : 'SecurePay could not save that private asset.');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const removeSelected = () => {
    if (!selected) return;
    const target = doc.objects.find(o => o.id === selected);
    commit({ v: 1, objects: doc.objects.filter(o => o.id !== selected) });
    setSelected(null);
    if (target && (target.kind === 'image' || target.kind === 'document')) {
      void gateway.deleteAsset(dream.dreamId, target.assetId).catch(() =>
        setLocalError('The board item was removed here, but SecurePay could not confirm private asset deletion. Retry before leaving.'));
    }
  };

  const duplicateSelected = () => {
    const found = doc.objects.find(o => o.id === selected);
    if (!found) return;
    const copy = { ...found, id: uid(), x: found.x + 24, y: found.y + 24 } as BoardObject;
    commit({ v: 1, objects: [...doc.objects, copy] });
    setSelected(copy.id);
  };

  const undo = () => {
    const prior = history[history.length - 1];
    if (!prior) return;
    setFuture(f => [doc, ...f].slice(0, 40));
    setHistory(h => h.slice(0, -1));
    setDoc(prior);
    setSaveState('idle');
  };

  const redo = () => {
    const next = future[0];
    if (!next) return;
    setHistory(h => [...h, doc].slice(-40));
    setFuture(f => f.slice(1));
    setDoc(next);
    setSaveState('idle');
  };

  const save = async () => {
    const payload = encode(doc);
    if (bytes(payload) > MAX_BOARD_BYTES) {
      setLocalError('This Dream has grown beyond the current 512 KB board limit. Nothing has been discarded. Remove some board detail before saving.');
      setSaveState('error');
      return;
    }
    setLocalError(null);
    setSaveState('saving');
    try {
      const saved = await gateway.saveBoard(dream.dreamId, {
        schemaVersion: 1, documentJson: payload, expectedRevision: revision, idempotencyKey: uid(),
      });
      setRevision(saved.revision);
      const titleOk = title === dream.title || await onSaveTitle(title, dream.content ?? '', dream.version);
      setSaveState(titleOk ? 'saved' : 'error');
      if (!titleOk) setLocalError('The board saved, but the Dream title did not. Refresh before editing the title again.');
    } catch (error) {
      setSaveState('error');
      setLocalError(error instanceof Error ? error.message : 'SecurePay could not confirm this board save.');
    }
  };

  const point = (event: React.PointerEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return [0, 0] as [number, number];
    return [(event.clientX - rect.left) / zoom, (event.clientY - rect.top) / zoom] as [number, number];
  };

  const startDraw = (event: React.PointerEvent) => {
    if (tool !== 'draw') return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const p = point(event);
    const id = uid();
    drawRef.current = { id, before: doc, points: [p] };
    setSelected(id);
  };

  const moveDraw = (event: React.PointerEvent) => {
    if (tool !== 'draw' || !drawRef.current) return;
    const p = point(event);
    const points = drawRef.current.points;
    const last = points[points.length - 1];
    if (Math.hypot(p[0] - last[0], p[1] - last[1]) < 4) return;
    drawRef.current.points = [...points, p].slice(-500);
    const drawing: BoardObject = { id: drawRef.current.id, kind: 'drawing', x: 0, y: 0, w: 1, h: 1, points: drawRef.current.points };
    setDoc(current => ({ v: 1, objects: [...current.objects.filter(o => o.id !== drawing.id), drawing] }));
    setSaveState('idle');
  };

  const endDraw = () => {
    const active = drawRef.current;
    if (!active) return;
    setHistory(h => [...h.slice(-39), active.before]);
    setFuture([]);
    drawRef.current = null;
  };

  const eraseAt = (event: React.PointerEvent) => {
    if (tool !== 'erase') return;
    const [x, y] = point(event);
    let best: { id: string; distance: number } | null = null;
    for (const o of doc.objects) {
      if (o.kind !== 'drawing') continue;
      for (const p of o.points) {
        const distance = Math.hypot(p[0] - x, p[1] - y);
        if (!best || distance < best.distance) best = { id: o.id, distance };
      }
    }
    if (best && best.distance < 28) commit({ v: 1, objects: doc.objects.filter(o => o.id !== best!.id) });
  };

  const objectClass = (o: BoardObject) => {
    const active = selected === o.id ? 'ring-2 ring-forest-500 ring-offset-2' : '';
    if (o.kind === 'note') return `${TONES[o.tone ?? 0]} border border-black/5 shadow-sm ${active}`;
    if (o.kind === 'frame') return `bg-transparent border-2 border-dashed border-forest-200 ${active}`;
    return `bg-white/95 border border-cream-200 shadow-sm ${active}`;
  };

  const beginDrag = (event: React.PointerEvent, o: BoardObject) => {
    if (tool !== 'select') return;
    event.stopPropagation();
    setSelected(o.id);
    const before = doc;
    const start = { x: event.clientX, y: event.clientY, ox: o.x, oy: o.y };
    const move = (e: PointerEvent) => {
      setDoc(current => ({ v: 1, objects: current.objects.map(item =>
        item.id === o.id ? ({ ...item, x: start.ox + (e.clientX - start.x) / zoom, y: start.oy + (e.clientY - start.y) / zoom } as BoardObject) : item) }));
      setSaveState('idle');
    };
    const up = () => {
      setHistory(h => [...h.slice(-39), before]);
      setFuture([]);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const selectedObject = doc.objects.find(o => o.id === selected) ?? null;
  const size = bytes(encode(doc));

  return <section className="space-y-3" aria-label="Dream Builder">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <button type="button" onClick={onBack} className="min-h-11 inline-flex items-center gap-2 text-sm text-forest-700">
        <ArrowLeft className="size-4" /> All Dreams
      </button>
      <div className="flex items-center gap-2 text-xs text-sand-500" aria-live="polite">
        <span className={saveState === 'saved' ? 'text-forest-700' : ''}>
          {saveState === 'loading' ? 'Opening…' : saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? `Saved · revision ${revision}` : saveState === 'error' ? 'Not saved' : 'Changes not saved'}
        </span>
        <Button onClick={() => void save()} disabled={saveState === 'loading' || saveState === 'saving' || dream.locked || dream.superseded}>
          <Save className="size-4" /> Save
        </Button>
      </div>
    </div>

    <div className="rounded-3xl border border-cream-200 bg-[#fbf7ec] overflow-hidden shadow-sm">
      <div className="border-b border-cream-200 bg-white/90 px-3 py-3 flex flex-wrap items-center gap-2">
        <input value={title} onChange={e => { setTitle(e.target.value); setSaveState('idle'); }} maxLength={200}
          className="min-h-11 flex-1 min-w-[220px] rounded-xl border border-transparent bg-transparent px-3 font-display text-xl text-forest-800 focus:border-forest-200 focus:outline-none"
          aria-label="Dream title" disabled={dream.locked || dream.superseded} />

        <div className="relative">
          <button type="button" onClick={() => setAddOpen(v => !v)}
            className="min-h-11 rounded-full bg-forest-700 px-4 text-sm font-medium text-white inline-flex items-center gap-2">
            <Plus className="size-4" /> Add
          </button>
          {addOpen && <div className="absolute z-30 right-0 mt-2 w-56 rounded-2xl border border-cream-200 bg-white p-2 shadow-xl">
            {ADD_TOOLS.map(([label, kind, Icon]) => <button key={kind} type="button"
              onClick={() => kind === 'draw' ? (setTool('draw'), setAddOpen(false)) : add(kind as Parameters<typeof add>[0])}
              className="w-full min-h-10 rounded-xl px-3 text-left text-sm text-forest-800 hover:bg-cream-100 inline-flex items-center gap-2">
              <Icon className="size-4" /> {label}
            </button>)}
            <button type="button" onClick={() => { setAddOpen(false); fileRef.current?.click(); }}
              className="w-full min-h-10 rounded-xl px-3 text-left text-sm text-forest-800 hover:bg-cream-100 inline-flex items-center gap-2">
              <ImageIcon className="size-4" /> Image or document
            </button>
          </div>}
          <input ref={fileRef} type="file" className="hidden"
            accept="image/jpeg,image/png,image/webp,application/pdf,text/plain,.docx,.xlsx"
            onChange={e => { const file = e.target.files?.[0]; if (file) void upload(file); }} />
        </div>

        <button type="button" title="Select and move" onClick={() => setTool('select')}
          className={`size-11 rounded-full border inline-grid place-items-center ${tool === 'select' ? 'border-forest-400 bg-forest-50 text-forest-700' : 'border-cream-200 text-sand-600'}`}><MousePointer2 className="size-4" /></button>
        <button type="button" title="Draw" onClick={() => setTool('draw')}
          className={`size-11 rounded-full border inline-grid place-items-center ${tool === 'draw' ? 'border-forest-400 bg-forest-50 text-forest-700' : 'border-cream-200 text-sand-600'}`}><PenLine className="size-4" /></button>
        <button type="button" title="Erase drawing" onClick={() => setTool('erase')}
          className={`size-11 rounded-full border inline-grid place-items-center ${tool === 'erase' ? 'border-forest-400 bg-forest-50 text-forest-700' : 'border-cream-200 text-sand-600'}`}><Eraser className="size-4" /></button>
        <button type="button" title="Undo" onClick={undo} disabled={!history.length} className="size-11 rounded-full border border-cream-200 inline-grid place-items-center disabled:opacity-40"><Undo2 className="size-4" /></button>
        <button type="button" title="Redo" onClick={redo} disabled={!future.length} className="size-11 rounded-full border border-cream-200 inline-grid place-items-center disabled:opacity-40"><Redo2 className="size-4" /></button>
      </div>

      {selectedObject && <div className="border-b border-cream-200 bg-cream-50 px-3 py-2 flex flex-wrap items-center gap-2 text-xs">
        <span className="text-sand-500 inline-flex items-center gap-1"><Grip className="size-3.5" /> Selected {selectedObject.kind}</span>
        {'text' in selectedObject && selectedObject.kind !== 'link' && <button type="button" onClick={() => {
          const next = window.prompt('Edit text', selectedObject.text);
          if (next !== null) patchObject(selectedObject.id, { text: next } as Partial<BoardObject>);
        }} className="min-h-9 rounded-full border border-cream-200 bg-white px-3 text-forest-700">Edit text</button>}
        {selectedObject.kind === 'note' && <button type="button" onClick={() => patchObject(selectedObject.id, { tone: nextTone(selectedObject.tone) } as Partial<BoardObject>)}
          className="min-h-9 rounded-full border border-cream-200 bg-white px-3 text-forest-700">Change colour</button>}
        <button type="button" onClick={duplicateSelected} className="min-h-9 rounded-full border border-cream-200 bg-white px-3 text-forest-700 inline-flex items-center gap-1"><Copy className="size-3.5" /> Duplicate</button>
        <button type="button" onClick={removeSelected} className="min-h-9 rounded-full border border-cream-200 bg-white px-3 text-ember-700 inline-flex items-center gap-1"><Trash2 className="size-3.5" /> Delete</button>
        {onExploreKs001 && 'text' in selectedObject && <button type="button" onClick={() => onExploreKs001(selectedObject.text)}
          className="min-h-9 rounded-full bg-forest-700 px-3 text-white">Ask KS001 about this</button>}
      </div>}

      {localError && <div className="p-3"><StatusNotice tone="warning" icon={false}>{localError}</StatusNotice></div>}
      {dream.superseded && <div className="p-3"><StatusNotice tone="warning" icon={false}>A newer Library version exists. This historical Dream stays readable but cannot be saved here.</StatusNotice></div>}
      {dream.locked && <div className="p-3"><StatusNotice tone="warning" icon={false}>This Dream is locked by existing Vision authority. Unlock or supersede it in the Vision Library before editing.</StatusNotice></div>}

      <div className="relative">
        <div ref={canvasRef}
          onPointerDown={event => {
            if (tool === 'draw') startDraw(event);
            else if (tool === 'erase') eraseAt(event);
            else setSelected(null);
          }}
          onPointerMove={moveDraw} onPointerUp={endDraw}
          className="relative h-[64vh] min-h-[480px] overflow-auto touch-none select-none"
          style={{ backgroundImage: 'radial-gradient(rgba(34,79,61,.12) 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
          <div className="relative min-w-[1200px] min-h-[900px] origin-top-left" style={{ transform: `scale(${zoom})` }}>
            <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible" aria-hidden="true">
              {doc.objects.map(o => {
                if (o.kind === 'arrow' || o.kind === 'line') return <line key={o.id} x1={o.x} y1={o.y} x2={o.x + o.w} y2={o.y + o.h}
                  stroke="#275b46" strokeWidth="3" markerEnd={o.kind === 'arrow' ? 'url(#arrowhead)' : undefined} />;
                if (o.kind === 'drawing') return <polyline key={o.id} points={o.points.map(p => p.join(',')).join(' ')} fill="none" stroke="#275b46" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />;
                return null;
              })}
              <defs><marker id="arrowhead" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#275b46" /></marker></defs>
            </svg>

            {doc.objects.map(o => {
              if (o.kind === 'arrow' || o.kind === 'line' || o.kind === 'drawing') return null;
              const style = { left: o.x, top: o.y, width: o.w, height: o.h };
              if (o.kind === 'shape') return <button key={o.id} type="button" onPointerDown={e => beginDrag(e, o)}
                onClick={e => { e.stopPropagation(); setSelected(o.id); }}
                className={`absolute ${objectClass(o)} ${o.shape === 'circle' ? 'rounded-full' : 'rounded-2xl'}`} style={style} aria-label="Shape" />;
              if (o.kind === 'image') {
                const body = assetContent[o.assetId];
                return <div key={o.id} onPointerDown={e => beginDrag(e, o)} onClick={e => { e.stopPropagation(); setSelected(o.id); }}
                  className={`absolute rounded-2xl overflow-hidden cursor-grab active:cursor-grabbing ${objectClass(o)}`} style={style}>
                  {body ? <img src={`data:${o.mimeType};base64,${body}`} alt={o.fileName} className="size-full object-cover" />
                    : <div className="size-full grid place-items-center p-4 text-center text-xs text-sand-500"><ImageIcon className="size-6 mb-2" />{o.fileName}</div>}
                </div>;
              }
              if (o.kind === 'document') return <div key={o.id} onPointerDown={e => beginDrag(e, o)}
                onClick={e => { e.stopPropagation(); setSelected(o.id); }}
                className={`absolute rounded-2xl p-4 cursor-grab active:cursor-grabbing ${objectClass(o)}`} style={style}>
                <FileText className="size-6 text-forest-600" /><div className="mt-2 text-sm text-forest-800 break-words">{o.fileName}</div><div className="mt-1 text-xs text-sand-500">{o.mimeType}</div>
              </div>;
              if (o.kind === 'link') return <div key={o.id} onPointerDown={e => beginDrag(e, o)}
                onClick={e => { e.stopPropagation(); setSelected(o.id); }}
                className={`absolute rounded-2xl p-4 cursor-grab active:cursor-grabbing ${objectClass(o)}`} style={style}>
                <LinkIcon className="size-4 text-forest-600" /><a href={o.url} target="_blank" rel="noreferrer" onPointerDown={e => e.stopPropagation()} className="mt-2 block text-sm text-forest-700 underline break-all">{o.text}</a>
              </div>;
              if (o.kind === 'note' || o.kind === 'text' || o.kind === 'checklist' || o.kind === 'frame') {
                return <div key={o.id} onPointerDown={e => beginDrag(e, o)} onClick={e => { e.stopPropagation(); setSelected(o.id); }}
                  className={`absolute rounded-2xl p-4 text-sm text-forest-900 whitespace-pre-wrap overflow-auto cursor-grab active:cursor-grabbing ${objectClass(o)}`} style={style}>
                  {o.kind === 'frame' && <div className="text-xs uppercase tracking-wide text-sand-500 mb-2">{o.text}</div>}
                  {o.kind !== 'frame' && o.text}
                </div>;
              }
              return null;
            })}
          </div>
        </div>

        <div className="absolute bottom-3 left-3 rounded-full border border-cream-200 bg-white/95 p-1 shadow-sm flex items-center gap-1">
          <button type="button" title="Zoom out" onClick={() => setZoom(z => Math.max(.6, +(z - .1).toFixed(1)))} className="size-10 rounded-full inline-grid place-items-center"><ZoomOut className="size-4" /></button>
          <span className="w-12 text-center text-xs text-sand-600">{Math.round(zoom * 100)}%</span>
          <button type="button" title="Zoom in" onClick={() => setZoom(z => Math.min(1.6, +(z + .1).toFixed(1)))} className="size-10 rounded-full inline-grid place-items-center"><ZoomIn className="size-4" /></button>
        </div>
      </div>
    </div>

    <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-sand-500">
      <p>Private by default. Board items are planning material—not Agreement terms, financial authority, or Store publication.</p>
      <p>{size.toLocaleString()} / {MAX_BOARD_BYTES.toLocaleString()} board bytes</p>
    </div>
  </section>;
}

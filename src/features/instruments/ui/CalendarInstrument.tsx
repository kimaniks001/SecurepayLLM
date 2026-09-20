import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  addDays, addMonths, ambiguousWeekday, fromIso, longDate, monthGrid, MONTHS, readDateText, toIso, todayIso, weekdayOf, WEEKDAYS,
  type InstrumentDraft, type WhenSpec,
} from '../model';
import { Field, FOCUS, INPUT } from './atoms';

const HEADS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/**
 * A real calendar: the visible month comes from the person's own clock, an already-recorded date
 * or an Agent-provided hint -- never from a constant. A bare weekday ("Friday") is AMBIGUOUS, so the
 * real Fridays are highlighted and the person chooses one; nothing is silently picked for them.
 *
 * Keyboard: arrows move by day/week, Home/End by week edge, PageUp/PageDown by month,
 * Enter/Space selects. One tab stop for the whole grid (roving tabindex).
 */
export function CalendarInstrument({ spec, draft, onChange, disabled, today = todayIso() }: {
  spec: WhenSpec; draft: Extract<InstrumentDraft, { kind: 'when' | 'when-range' }>; onChange: (draft: InstrumentDraft) => void; disabled: boolean; today?: string;
}) {
  const weekday = useMemo(() => ambiguousWeekday(spec.currentText), [spec.currentText]);
  const selected = draft.kind === 'when' ? draft.date : draft.start;
  const anchor = selected ?? spec.hintDate ?? readDateText(spec.currentText, today) ?? today;
  const anchorParts = fromIso(anchor) ?? fromIso(today)!;
  const [view, setView] = useState({ year: anchorParts.year, month0: anchorParts.month0 });
  const [focusIso, setFocusIso] = useState<string>(selected ?? (fromIso(anchor) ? anchor : today));
  const grid = useRef<HTMLDivElement>(null);
  const keyboardMoved = useRef(false);
  const weeks = useMemo(() => monthGrid(view.year, view.month0), [view.year, view.month0]);

  // If the roving focus target is not in the visible month, fall back to its first day so there is always one tab stop.
  const focusable = fromIso(focusIso) && fromIso(focusIso)!.year === view.year && fromIso(focusIso)!.month0 === view.month0 ? focusIso : toIso(view.year, view.month0, 1);

  useEffect(() => {
    if (keyboardMoved.current) { grid.current?.querySelector<HTMLElement>(`[data-iso="${focusIso}"]`)?.focus(); keyboardMoved.current = false; }
  }, [focusIso, view]);

  const choose = (iso: string) => {
    if (disabled) return;
    setFocusIso(iso);
    if (draft.kind === 'when') { onChange({ ...draft, date: iso }); return; }
    if (draft.kind === 'when-range') {
      if (!draft.start || draft.end) onChange({ ...draft, start: iso, end: null });
      else if (iso < draft.start) onChange({ ...draft, start: iso, end: draft.start });
      else onChange({ ...draft, end: iso });
    }
  };
  const goto = (iso: string) => {
    const parts = fromIso(iso)!;
    keyboardMoved.current = true;
    setView({ year: parts.year, month0: parts.month0 });
    setFocusIso(iso);
  };
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const current = focusable;
    const p = fromIso(current)!;
    let next: string | null = null;
    switch (event.key) {
      case 'ArrowLeft': next = addDays(current, -1); break;
      case 'ArrowRight': next = addDays(current, 1); break;
      case 'ArrowUp': next = addDays(current, -7); break;
      case 'ArrowDown': next = addDays(current, 7); break;
      case 'Home': next = addDays(current, -((weekdayOf(current) + 6) % 7)); break;
      case 'End': next = addDays(current, 6 - ((weekdayOf(current) + 6) % 7)); break;
      case 'PageUp': case 'PageDown': {
        const target = addMonths(p.year, p.month0, event.key === 'PageUp' ? -1 : 1);
        next = toIso(target.year, target.month0, Math.min(p.day, new Date(Date.UTC(target.year, target.month0 + 1, 0)).getUTCDate()));
        break;
      }
    }
    if (next) { event.preventDefault(); goto(next); }
  };
  const shift = (delta: number) => setView(addMonths(view.year, view.month0, delta));
  const inRange = (iso: string) => draft.kind === 'when-range' && !!draft.start && !!draft.end && iso > draft.start && iso < draft.end;
  const isEdge = (iso: string) => (draft.kind === 'when' ? draft.date === iso : draft.start === iso || draft.end === iso);

  return <div className="space-y-4">
    {spec.currentText && !weekday && <p className="text-[0.85rem] text-sand-600">SecurePay currently understands <span className="font-medium text-forest-800">{spec.currentText}</span>.</p>}
    {weekday !== null && <p className="text-[0.85rem] text-sand-600">You said “{spec.currentText}”. The {WEEKDAYS[weekday]}s are marked — choose the one you mean.</p>}
    <div>
      <div className="flex items-center justify-between pb-2">
        <button type="button" onClick={() => shift(-1)} aria-label="Previous month" className={`h-11 w-11 -ml-2 rounded-xl flex items-center justify-center text-forest-700 hover:bg-cream-100 ${FOCUS}`}><ChevronLeft className="w-5 h-5" aria-hidden="true" /></button>
        <div id="instrument-month" aria-live="polite" className="font-display text-[1.05rem] text-forest-800">{MONTHS[view.month0]} {view.year}</div>
        <button type="button" onClick={() => shift(1)} aria-label="Next month" className={`h-11 w-11 -mr-2 rounded-xl flex items-center justify-center text-forest-700 hover:bg-cream-100 ${FOCUS}`}><ChevronRight className="w-5 h-5" aria-hidden="true" /></button>
      </div>
      <div ref={grid} role="grid" aria-labelledby="instrument-month" onKeyDown={onKeyDown}>
        <div role="row" className="grid grid-cols-7">{HEADS.map(head => <div key={head} role="columnheader" className="pb-1 text-center text-[0.68rem] font-medium uppercase tracking-wide text-sand-400">{head}</div>)}</div>
        {weeks.map((week, row) => <div role="row" key={row} className="grid grid-cols-7">
          {week.map((cell, col) => {
            if (!cell) return <div role="gridcell" key={col} className="h-11" />;
            const edge = isEdge(cell.iso);
            const between = inRange(cell.iso);
            const candidateDay = weekday !== null && weekdayOf(cell.iso) === weekday;
            const isToday = cell.iso === today;
            return <div role="gridcell" key={col} className={`h-11 flex items-center justify-center ${between ? 'bg-forest-50' : ''}`}>
              <button type="button" data-iso={cell.iso} tabIndex={cell.iso === focusable ? 0 : -1} disabled={disabled}
                onClick={() => choose(cell.iso)} onFocus={() => setFocusIso(cell.iso)}
                aria-label={`${longDate(cell.iso)}${isToday ? ', today' : ''}${candidateDay ? `, a ${WEEKDAYS[weekday!]}` : ''}`} aria-pressed={edge}
                className={`relative h-10 w-10 rounded-full text-[0.9rem] tabular-nums transition-colors ${FOCUS} ${
                  edge ? 'bg-forest-600 text-cream-50 font-medium'
                    : candidateDay ? 'text-forest-800 font-medium ring-1 ring-inset ring-forest-300 hover:bg-forest-50'
                    : 'text-forest-800 hover:bg-cream-100'}`}>
                {cell.day}
                {isToday && !edge && <span aria-hidden="true" className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-ember-500" />}
              </button>
            </div>;
          })}
        </div>)}
      </div>
    </div>
    <p role="status" className="min-h-[1.25rem] text-[0.85rem] text-forest-700">
      {draft.kind === 'when' && (draft.date ? longDate(draft.date) : 'Choose a day.')}
      {draft.kind === 'when-range' && (draft.start && draft.end ? `${longDate(draft.start)} → ${longDate(draft.end)}` : draft.start ? `From ${longDate(draft.start)} — now choose the last day.` : 'Choose the first day.')}
    </p>
    {draft.kind === 'when' && <Field label="Time (optional)" htmlFor="instrument-time" hint="Kept as part of what you say to KS001 — SecurePay does not store a separate time yet.">
      <input id="instrument-time" type="time" value={draft.time} disabled={disabled} onChange={event => onChange({ ...draft, time: event.target.value })} className={`${INPUT} w-40`} />
    </Field>}
  </div>;
}

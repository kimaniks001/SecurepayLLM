import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { addDays, addMonths, fromIso, longDate, monthGrid, MONTHS, toIso, todayIso, weekdayOf, type InstrumentDraft, type WhenSpec } from '../model';
import { FOCUS } from './atoms';

const HEADS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/**
 * A real calendar for ONE date: the visible month comes from the person's own clock or an
 * Agent-provided ISO hint -- never from a constant. Nothing is pre-selected. There is no time field
 * and no range: SecurePay formation stores a single ISO date and nothing else, so anything more
 * could be selected here but not read back (see verify.ts / the Phase 1 doc).
 *
 * Keyboard: arrows move by day/week, Home/End by week edge, PageUp/PageDown by month,
 * Enter/Space selects. One tab stop for the whole grid (roving tabindex).
 */
export function CalendarInstrument({ spec, draft, onChange, disabled, today = todayIso() }: {
  spec: WhenSpec; draft: Extract<InstrumentDraft, { kind: 'when' }>; onChange: (draft: InstrumentDraft) => void; disabled: boolean; today?: string;
}) {
  const selected = draft.date;
  const anchor = selected ?? (spec.hintDate && fromIso(spec.hintDate) ? spec.hintDate : today);
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
    onChange({ ...draft, date: iso });
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
  const isEdge = (iso: string) => draft.date === iso;

  return <div className="space-y-4">
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
            const isToday = cell.iso === today;
            return <div role="gridcell" key={col} className="h-11 flex items-center justify-center">
              <button type="button" data-iso={cell.iso} tabIndex={cell.iso === focusable ? 0 : -1} disabled={disabled}
                onClick={() => choose(cell.iso)} onFocus={() => setFocusIso(cell.iso)}
                aria-label={`${longDate(cell.iso)}${isToday ? ', today' : ''}`} aria-pressed={edge}
                className={`relative h-10 w-10 rounded-full text-[0.9rem] tabular-nums transition-colors ${FOCUS} ${
                  edge ? 'bg-forest-600 text-cream-50 font-medium' : 'text-forest-800 hover:bg-cream-100'}`}>
                {cell.day}
                {isToday && !edge && <span aria-hidden="true" className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-ember-500" />}
              </button>
            </div>;
          })}
        </div>)}
      </div>
    </div>
    <p role="status" className="min-h-[1.25rem] text-[0.85rem] text-forest-700">{draft.date ? longDate(draft.date) : 'Choose a day.'}</p>
  </div>;
}

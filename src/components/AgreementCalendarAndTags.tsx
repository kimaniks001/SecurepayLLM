import { useState } from 'react';
import { Calendar, Plus, Tag, X } from 'lucide-react';
import type { CalendarEventView } from '../features/workspace/view';

export interface ConflictView { firstEventId: string; secondEventId: string; label: string; isViolation: boolean }
export interface TagView { id: string; label: string }

interface AgreementCalendarAndTagsProps {
  events: CalendarEventView[];
  conflicts: ConflictView[];
  tags: TagView[];
  onAddTag: (label: string) => void;
  onRemoveTag: (tagId: string) => void;
}

/**
 * KSCalendar for one Agreement + its personal tags. Events are exactly what the backend already
 * computed (explicit ones it stored, plus milestone due dates it derived live) — this component
 * never invents a date or reorders anything by urgency. Conflicts are always shown as warnings,
 * distinguishing "possible conflict" from "Agreement condition cannot be satisfied" (locked
 * doctrine) — never as a block on anything the person can still do.
 */
export function AgreementCalendarAndTags({ events, conflicts, tags, onAddTag, onRemoveTag }: AgreementCalendarAndTagsProps) {
  const [draftTag, setDraftTag] = useState('');

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-cream-200 bg-white px-5 py-4 animate-quiet-in">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="w-4 h-4 text-forest-600" />
          <span className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide">Upcoming</span>
        </div>
        {events.length === 0 ? (
          <p className="text-[0.8rem] text-sand-500">Nothing scheduled yet.</p>
        ) : (
          <div className="space-y-2">
            {events.map(event => (
              <div key={event.id} className="flex items-center gap-3 rounded-xl border border-cream-100 px-3 py-2.5">
                <div className="text-center w-12 shrink-0">
                  <div className="text-[0.72rem] font-medium text-forest-700">{event.dateLabel}</div>
                  {event.timeLabel && <div className="text-[0.68rem] text-sand-400">{event.timeLabel}</div>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[0.825rem] font-medium text-forest-800 truncate">{event.title}</div>
                  <div className="text-[0.7rem] text-sand-500">{event.eventTypeLabel}{event.isDerived ? ' · from this Agreement' : ''}</div>
                </div>
              </div>
            ))}
          </div>
        )}
        {conflicts.length > 0 && (
          <div className="mt-3 pt-3 border-t border-cream-100 space-y-1.5">
            {conflicts.map((c, i) => (
              <div key={i} role="status" className={`text-[0.75rem] rounded-lg px-2.5 py-1.5 ${c.isViolation ? 'bg-red-50 text-red-700' : 'bg-ember-50 text-ember-700'}`}>
                {c.label}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-cream-200 bg-white px-5 py-4 animate-quiet-in">
        <div className="flex items-center gap-2 mb-3">
          <Tag className="w-4 h-4 text-forest-600" />
          <span className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide">Your tags</span>
        </div>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {tags.map(tag => (
            <span key={tag.id} className="inline-flex items-center gap-1 text-[0.7rem] text-sand-600 bg-cream-100 border border-cream-200 rounded-full pl-2 pr-1 py-0.5">
              <Tag className="w-2.5 h-2.5" />
              {tag.label}
              <button onClick={() => onRemoveTag(tag.id)} aria-label={`Remove tag ${tag.label}`} className="ml-0.5 rounded-full hover:bg-cream-200 p-0.5">
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}
          {tags.length === 0 && <span className="text-[0.78rem] text-sand-400">No tags yet — only you see these.</span>}
        </div>
        <form
          onSubmit={e => { e.preventDefault(); const label = draftTag.trim(); if (label) { onAddTag(label); setDraftTag(''); } }}
          className="flex items-center gap-2"
        >
          <input
            value={draftTag}
            onChange={e => setDraftTag(e.target.value)}
            placeholder="e.g. Home, Client Work"
            className="flex-1 text-[0.8rem] rounded-lg border border-cream-200 px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-forest-400"
            maxLength={64}
          />
          <button type="submit" className="flex items-center gap-1 text-[0.78rem] font-medium text-forest-600 hover:text-forest-700 px-2.5 py-1.5 rounded-lg hover:bg-forest-50">
            <Plus className="w-3.5 h-3.5" />
            Add
          </button>
        </form>
      </div>
    </div>
  );
}

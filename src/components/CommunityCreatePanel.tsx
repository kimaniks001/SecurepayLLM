import { ArrowLeft } from 'lucide-react';
import type { CommunityObjectType } from '../types';

interface ComposeOption { value: CommunityObjectType; label: string }

interface CommunityCreatePanelProps {
  options: ComposeOption[];
  objectType: CommunityObjectType | null;
  title: string;
  body: string;
  locationLabel: string;
  submitting: boolean;
  error: string | null;
  onSelectType: (type: CommunityObjectType) => void;
  onTitleChange: (value: string) => void;
  onBodyChange: (value: string) => void;
  onLocationChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

const bodyPrompt: Partial<Record<CommunityObjectType, string>> = {
  question: 'What would you like to ask?',
  need: 'What do you need? Anything important someone should know?',
  opportunity: 'What is the opportunity, and who are you looking for?',
  work_story: 'Tell the story of the work you did.',
  discussion: 'What would you like to discuss?',
};

/**
 * Phase 6 (Community Life) Slice 1 -- the real, backend-backed Community composer
 * (`CommunityObjectController#create`), separate from the pre-existing fixture-only
 * `CommunityComposer` (App.tsx's demo path, hardcoded "James Kimani"/fake AI type-detection --
 * left untouched so fixture mode stays byte-identical). A real, simple form, not an enterprise
 * form (Section 7): the same three fields for every type, only the body prompt changes.
 */
export function CommunityCreatePanel({
  options, objectType, title, body, locationLabel, submitting, error,
  onSelectType, onTitleChange, onBodyChange, onLocationChange, onSubmit, onCancel,
}: CommunityCreatePanelProps) {
  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="px-4 md:px-6 py-3 border-b border-cream-200/60 bg-cream-50">
        <button onClick={onCancel} className="flex items-center gap-1.5 text-[0.8rem] text-sand-500 hover:text-forest-600 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />
          Community
        </button>
      </div>
      <div className="max-w-2xl mx-auto px-4 md:px-6 py-5 space-y-4">
        <h1 className="font-display text-lg text-forest-800 font-medium">What would you like to share?</h1>

        <div className="grid grid-cols-2 gap-2">
          {options.map(option => (
            <button
              key={option.value}
              onClick={() => onSelectType(option.value)}
              aria-pressed={objectType === option.value}
              className={`rounded-xl border px-3 py-2.5 text-left text-[0.8rem] font-medium transition-colors ${
                objectType === option.value
                  ? 'border-forest-400 bg-forest-50 text-forest-700'
                  : 'border-cream-200 bg-white text-forest-700 hover:border-forest-300'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {objectType && (
          <div className="space-y-3 animate-quiet-in">
            <div>
              <label className="block text-[0.72rem] font-medium text-sand-500 mb-1">Title</label>
              <input
                type="text"
                value={title}
                onChange={e => onTitleChange(e.target.value)}
                placeholder="A short, clear title"
                className="w-full rounded-xl border border-cream-200 bg-white px-3 py-2.5 text-[0.875rem] text-forest-800 placeholder:text-sand-400 focus:outline-none focus:border-forest-300"
              />
            </div>
            <div>
              <label className="block text-[0.72rem] font-medium text-sand-500 mb-1">{bodyPrompt[objectType]}</label>
              <textarea
                value={body}
                onChange={e => onBodyChange(e.target.value)}
                rows={4}
                className="w-full rounded-xl border border-cream-200 bg-white px-3 py-2.5 text-[0.875rem] text-forest-800 placeholder:text-sand-400 focus:outline-none focus:border-forest-300"
              />
            </div>
            <div>
              <label className="block text-[0.72rem] font-medium text-sand-500 mb-1">Where (optional)</label>
              <input
                type="text"
                value={locationLabel}
                onChange={e => onLocationChange(e.target.value)}
                placeholder="e.g. Ruiru, Othaya, Westlands"
                className="w-full rounded-xl border border-cream-200 bg-white px-3 py-2.5 text-[0.875rem] text-forest-800 placeholder:text-sand-400 focus:outline-none focus:border-forest-300"
              />
            </div>

            {error && <p role="alert" className="text-[0.78rem] text-red-600">{error}</p>}

            <button
              onClick={onSubmit}
              disabled={submitting}
              className="w-full rounded-xl bg-forest-600 text-cream-50 text-[0.875rem] font-medium py-3 hover:bg-forest-700 transition-colors disabled:opacity-60"
            >
              {submitting ? 'Sharing…' : 'Share with the community'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

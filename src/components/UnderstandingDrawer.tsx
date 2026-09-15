import { useRef, useEffect, useState } from 'react';
import { ChevronDown, Circle, Check, HelpCircle } from 'lucide-react';
import type { Understanding, UnderstandingField, UnderstandingState } from '../types';

interface UnderstandingDrawerProps {
  understanding: Understanding;
  expanded: boolean;
  onToggle: () => void;
}

function StateIcon({ state }: { state: UnderstandingState }) {
  if (state === 'understood') return <Check className="w-3.5 h-3.5 text-forest-500" />;
  if (state === 'candidate') return <Circle className="w-3 h-3 text-ember-400 fill-ember-300" />;
  return <HelpCircle className="w-3.5 h-3.5 text-sand-400" />;
}

function stateClasses(state: UnderstandingState) {
  if (state === 'understood') return 'text-forest-700';
  if (state === 'candidate') return 'text-forest-700';
  return 'text-sand-400';
}

function FieldRow({ field, isNew }: { field: UnderstandingField; isNew: boolean }) {
  return (
    <div className={`flex items-start gap-2.5 py-2.5 border-b border-cream-100 last:border-0 ${isNew ? 'animate-fact-settle' : ''}`}>
      <div className="pt-0.5 shrink-0">
        <StateIcon state={field.state} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide">{field.label}</div>
        <div className={`text-[0.875rem] mt-0.5 whitespace-pre-line transition-fact ${stateClasses(field.state)}`}>
          {field.value}
        </div>
      </div>
    </div>
  );
}

export function UnderstandingDrawer({ understanding, expanded, onToggle }: UnderstandingDrawerProps) {
  const allFields = [
    understanding.job,
    understanding.scope,
    understanding.location,
    understanding.people,
    understanding.price,
    understanding.timing,
    understanding.materials,
  ];

  const meaningfulFields = allFields.filter((f) => f.value && f.value.length > 0);
  const understoodCount = allFields.filter((f) => f.state === 'understood').length;

  // Track previous values to detect changes
  const prevValuesRef = useRef<Record<string, string>>({});
  const [changedKeys, setChangedKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    const currentValues: Record<string, string> = {
      job: understanding.job.value,
      scope: understanding.scope.value,
      location: understanding.location.value,
      people: understanding.people.value,
      price: understanding.price.value,
      timing: understanding.timing.value,
      materials: understanding.materials.value,
    };

    const changed = new Set<string>();
    (Object.keys(currentValues) as string[]).forEach((key) => {
      const prev = prevValuesRef.current[key];
      const curr = currentValues[key];
      if (curr && (!prev || prev !== curr)) {
        changed.add(key);
      }
    });

    if (changed.size > 0) {
      setChangedKeys(changed);
      prevValuesRef.current = currentValues;
      const timer = setTimeout(() => setChangedKeys(new Set()), 800);
      return () => clearTimeout(timer);
    }
    prevValuesRef.current = currentValues;
  }, [understanding]);

  const fieldKeys = ['job', 'scope', 'location', 'people', 'price', 'timing', 'materials'];

  return (
    <div className="rounded-2xl border border-cream-200 bg-white shadow-card overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-cream-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-forest-50 flex items-center justify-center">
            <span className="text-[0.65rem] font-medium text-forest-600">{understoodCount}</span>
          </div>
          <span className="text-[0.825rem] font-medium text-forest-700">What SecurePay understands</span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-sand-400 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      {expanded && (
        <div className="px-4 pb-3 animate-fade-in-down">
          {meaningfulFields.length > 0 ? (
            meaningfulFields.map((field, i) => (
              <FieldRow
                key={i}
                field={field}
                isNew={changedKeys.has(fieldKeys[i])}
              />
            ))
          ) : (
            <p className="text-[0.825rem] text-sand-400 py-2 text-center">
              Nothing yet. Start talking and I'll pick things up.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

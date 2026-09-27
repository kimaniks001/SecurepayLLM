import type { ChoiceButtonsResponse } from '../types';

interface ChoiceButtonsProps {
  data: ChoiceButtonsResponse;
  onChoice: (value: string) => void;
}

export function ChoiceButtons({ data, onChoice }: ChoiceButtonsProps) {
  return (
    <div className="flex flex-wrap gap-2 animate-quiet-in">
      {data.choices.map((choice, i) => (
        <button
          key={i}
          onClick={() => onChoice(choice.value)}
          type="button"
          className={`inline-flex min-h-11 items-center text-[0.825rem] font-medium rounded-full px-4 py-2 transition-all duration-200 active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-300 focus-visible:ring-offset-2 ${
            i === 0
              ? 'bg-forest-600 text-cream-50 hover:bg-forest-700 shadow-soft'
              : 'bg-white text-forest-700 border border-cream-200 hover:border-forest-300 hover:bg-cream-50 shadow-soft'
          }`}
        >
          {choice.label}
        </button>
      ))}
    </div>
  );
}

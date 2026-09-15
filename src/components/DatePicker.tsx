import { useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import type { DatePickerResponse } from '../types';

interface DatePickerCardProps {
  data: DatePickerResponse;
  onSelect?: (date: string) => void;
}

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export function DatePickerCard({ data, onSelect }: DatePickerCardProps) {
  const [viewYear, setViewYear] = useState(2026);
  const [viewMonth, setViewMonth] = useState(9); // October 2026
  const [selected, setSelected] = useState<number | null>(null);

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);

  const handleSelect = (day: number) => {
    setSelected(day);
    const dateStr = `${monthNames[viewMonth]} ${day}, ${viewYear}`;
    onSelect?.(dateStr);
  };

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  };

  return (
    <div className="rounded-2xl border border-cream-200 bg-white shadow-card overflow-hidden animate-fade-in-up">
      <div className="px-4 py-3 border-b border-cream-100 flex items-center gap-2">
        <Calendar className="w-4 h-4 text-forest-500" />
        <span className="text-[0.825rem] font-medium text-forest-700">{data.label}</span>
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <button onClick={prevMonth} className="w-8 h-8 rounded-lg hover:bg-cream-100 flex items-center justify-center text-sand-500 transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-display text-sm text-forest-800">
            {monthNames[viewMonth]} {viewYear}
          </span>
          <button onClick={nextMonth} className="w-8 h-8 rounded-lg hover:bg-cream-100 flex items-center justify-center text-sand-500 transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 mb-1">
          {dayNames.map((d, i) => (
            <div key={i} className="text-center text-[0.65rem] text-sand-400 font-medium py-1">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`e${i}`} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const isSelected = selected === day;
            return (
              <button
                key={day}
                onClick={() => handleSelect(day)}
                className={`aspect-square rounded-lg text-[0.8rem] transition-all ${
                  isSelected
                    ? 'bg-forest-600 text-cream-50 font-medium shadow-soft'
                    : 'text-forest-700 hover:bg-forest-50'
                }`}
              >
                {day}
              </button>
            );
          })}
        </div>
        {selected && (
          <div className="mt-3 flex items-center gap-2 text-[0.8rem] text-forest-600 animate-fade-in">
            <Check className="w-3.5 h-3.5" />
            <span>Selected: {monthNames[viewMonth]} {selected}, {viewYear}</span>
          </div>
        )}
      </div>
    </div>
  );
}

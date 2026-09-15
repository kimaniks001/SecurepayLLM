import { Bell } from 'lucide-react';
import type { NotificationResponse } from '../types';

interface NotificationCardProps {
  data: NotificationResponse;
}

export function NotificationCard({ data }: NotificationCardProps) {
  return (
    <div className="rounded-xl border border-forest-200 bg-forest-50/60 px-4 py-3 flex items-start gap-2.5 animate-quiet-in">
      <div className="pt-0.5 shrink-0">
        <Bell className="w-4 h-4 text-forest-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[0.825rem] text-forest-800 leading-relaxed">{data.text}</p>
        <div className="flex items-center gap-2 mt-1 text-[0.7rem] text-sand-500">
          <span>{data.source}</span>
          <span>·</span>
          <span>{data.time}</span>
        </div>
      </div>
    </div>
  );
}

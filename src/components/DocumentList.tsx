import { FileText, FileCheck } from 'lucide-react';
import type { DocumentListResponse } from '../types';

interface DocumentListCardProps {
  data: DocumentListResponse;
}

export function DocumentListCard({ data }: DocumentListCardProps) {
  return (
    <div className="rounded-2xl border border-cream-200 bg-white shadow-card overflow-hidden">
      <div className="px-4 py-3 bg-forest-50 border-b border-forest-100 flex items-center gap-2 animate-reveal-stagger" style={{ animationDelay: '0.1s' }}>
        <FileText className="w-4 h-4 text-forest-600" />
        <span className="text-[0.75rem] font-medium text-forest-700 uppercase tracking-wide">Documents</span>
      </div>
      <div className="divide-y divide-cream-100">
        {data.documents.map((doc, i) => (
          <div key={i} className="px-4 py-3 flex items-start gap-3 animate-reveal-stagger" style={{ animationDelay: `${0.15 + i * 0.1}s` }}>
            <div className="w-9 h-9 rounded-lg bg-forest-50 flex items-center justify-center shrink-0">
              <FileCheck className="w-4 h-4 text-forest-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[0.825rem] font-medium text-forest-800 truncate">{doc.filename}</div>
              <div className="flex items-center gap-2 mt-0.5 text-[0.7rem] text-sand-500">
                <span>{doc.type}</span>
                <span>·</span>
                <span>{doc.source}</span>
                <span>·</span>
                <span>{doc.date}</span>
              </div>
              {doc.linkedTo && (
                <div className="text-[0.7rem] text-forest-600 mt-0.5">Linked to: {doc.linkedTo}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

import { FileText, Image, FileCheck } from 'lucide-react';
import type { AgreementDocument } from '../types';

interface AgreementDocumentsProps {
  documents: AgreementDocument[];
}

const typeIcon: Record<string, typeof FileText> = {
  Quotation: FileText,
  Photo: Image,
  'Agreement record': FileCheck,
  Charter: FileText,
  Photos: Image,
};

export function AgreementDocuments({ documents }: AgreementDocumentsProps) {
  if (documents.length === 0) {
    return (
      <div className="rounded-2xl border border-cream-200 bg-white px-5 py-6 text-center animate-quiet-in">
        <p className="text-[0.85rem] text-sand-500">No documents connected to this agreement.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-cream-200 bg-white px-5 py-4 animate-quiet-in">
      <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-3">Documents</div>
      <div className="space-y-2">
        {documents.map((doc) => {
          const Icon = typeIcon[doc.type] || FileText;
          return (
            <div key={doc.id} className="flex items-center gap-3 rounded-xl border border-cream-100 px-3 py-2.5 hover:border-cream-300 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-cream-100 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-sand-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[0.825rem] font-medium text-forest-800 truncate">{doc.filename}</div>
                <div className="text-[0.72rem] text-sand-500">{doc.type} · {doc.source} · {doc.date}</div>
              </div>
              <button className="text-[0.75rem] font-medium text-forest-600 hover:text-forest-700 shrink-0">Open</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

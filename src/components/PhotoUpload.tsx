import { useState, type ChangeEvent } from 'react';
import { Upload, X, ImageIcon } from 'lucide-react';
import type { PhotoUploadResponse, PhotoResponse } from '../types';

interface PhotoUploadControlProps {
  data: PhotoUploadResponse;
  onUpload?: (url: string) => void;
  onSkip?: () => void;
}

export function PhotoUploadControl({ data, onUpload, onSkip }: PhotoUploadControlProps) {
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFile = (file: File) => {
    const url = URL.createObjectURL(file);
    setPreview(url);
    onUpload?.(url);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  if (preview) {
    return (
      <div className="rounded-2xl border border-cream-200 bg-white shadow-card overflow-hidden animate-fade-in-up">
        <div className="relative">
          <img src={preview} alt="Uploaded" className="w-full h-48 object-cover" />
          <button
            onClick={() => setPreview(null)}
            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-forest-900/60 backdrop-blur-sm text-cream-50 flex items-center justify-center hover:bg-forest-900/80 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-4 py-2.5 bg-cream-50 border-t border-cream-100 flex items-center gap-2">
          <ImageIcon className="w-3.5 h-3.5 text-forest-400" />
          <span className="text-[0.8rem] text-sand-600">Photo received</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border-2 border-dashed border-cream-300 bg-white overflow-hidden transition-all duration-300 hover:border-forest-300">
      <label
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file) handleFile(file);
        }}
        className={`block cursor-pointer transition-all ${dragging ? 'bg-forest-50 scale-[1.01]' : ''}`}
      >
        <input type="file" accept="image/*" className="hidden" onChange={handleChange} />
        <div className="flex flex-col items-center justify-center py-7 px-4 text-center">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${dragging ? 'bg-forest-100' : 'bg-cream-100'}`}>
            <Upload className={`w-5 h-5 ${dragging ? 'text-forest-500' : 'text-sand-500'}`} />
          </div>
          <p className="mt-3 text-[0.875rem] font-medium text-forest-700">{data.label}</p>
          <p className="mt-1 text-[0.75rem] text-sand-500">Drag a photo here or tap to browse · {data.acceptedTypes}</p>
        </div>
      </label>
      {data.skipLabel && (
        <button
          onClick={onSkip}
          className="w-full px-4 py-2.5 border-t border-cream-100 text-[0.8rem] text-sand-500 hover:text-forest-600 hover:bg-cream-50 transition-colors"
        >
          {data.skipLabel}
        </button>
      )}
    </div>
  );
}

interface PhotoDisplayProps {
  data: PhotoResponse;
}

export function PhotoDisplay({ data }: PhotoDisplayProps) {
  return (
    <div className="rounded-2xl border border-cream-200 bg-white shadow-card overflow-hidden animate-fade-in-up">
      <img src={data.url} alt={data.caption || 'Photo'} className="w-full h-56 object-cover" />
      {data.caption && (
        <div className="px-4 py-2.5 bg-cream-50 border-t border-cream-100 flex items-center gap-2">
          <ImageIcon className="w-3.5 h-3.5 text-forest-400" />
          <span className="text-[0.8rem] text-sand-600">{data.caption}</span>
        </div>
      )}
    </div>
  );
}

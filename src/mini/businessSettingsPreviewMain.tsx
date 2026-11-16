import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BusinessPreviewExperience } from '../features/business/BusinessPreviewExperience';
import '../index.css';

const node = document.getElementById('business-settings-root');
if (!node) throw new Error('Business settings preview root is missing');

createRoot(node).render(
  <StrictMode>
    <div className="border-b border-[#dae7dc] bg-[#f0f6ed] px-4 py-3">
      <div className="mx-auto flex max-w-[1450px] items-center justify-between gap-3 text-xs">
        <a className="font-semibold text-[#245d43] underline underline-offset-2" href="/mini.html?miniBusinessPreview=1">← Return to SecurePay Mini</a>
        <span className="text-[#617865]">Business Settings · Read-only preview</span>
      </div>
    </div>
    <BusinessPreviewExperience />
  </StrictMode>
);

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MiniExperience } from './MiniExperience';

const root = document.getElementById('mini-root');
if (!root) throw new Error('SecurePay Mini entry element missing');
createRoot(root).render(<StrictMode><MiniExperience /></StrictMode>);

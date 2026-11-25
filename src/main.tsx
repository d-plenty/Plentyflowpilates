import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/space-grotesk/700.css';
import './ui/app.css';
import { App } from './ui/App';
import { boot } from './lib/store';

const root = createRoot(document.getElementById('root')!);
void boot().then(() => root.render(<StrictMode><App /></StrictMode>)).catch((e: unknown) => {
  document.getElementById('root')!.textContent = `Plenty Flow couldn't open its data: ${e instanceof Error ? e.message : String(e)}`;
});

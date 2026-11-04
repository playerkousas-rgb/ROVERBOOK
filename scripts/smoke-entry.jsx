// Smoke test entry — bundled by scripts/smoke.mjs and rendered inside jsdom.
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from '../web/src/App.jsx';
import { ToastProvider } from '../web/src/ui.jsx';
import { STORE_KEY } from '@shared/book.js';

export function seed(book) {
  localStorage.setItem(STORE_KEY, JSON.stringify(book));
}

export function reset() {
  localStorage.clear();
}

export function stored() {
  const raw = localStorage.getItem(STORE_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function renderPath(pathname, opts = {}) {
  window.history.replaceState({}, '', pathname);
  document.body.innerHTML = '<div id="test-root"></div>';
  const host = document.getElementById('test-root');
  const root = createRoot(host);
  root.render(
    <ToastProvider>
      <App />
    </ToastProvider>,
  );
  await new Promise((r) => setTimeout(r, opts.wait ?? 450));
  if (opts.interact) {
    await opts.interact(document, window);
    await new Promise((r) => setTimeout(r, opts.after ?? 400));
  }
  const html = host.innerHTML;
  root.unmount();
  return html;
}

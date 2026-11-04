// Smoke test entry — bundled by scripts/smoke.mjs and rendered inside jsdom.
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from '../web/src/App.jsx';
import { ToastProvider } from '../web/src/ui.jsx';

export async function renderPath(path) {
  window.history.replaceState({}, '', path);
  document.body.innerHTML = '<div id="test-root"></div>';
  const host = document.getElementById('test-root');
  const root = createRoot(host);
  root.render(
    <ToastProvider>
      <App />
    </ToastProvider>,
  );
  await new Promise((r) => setTimeout(r, 700));
  const html = host.innerHTML;
  root.unmount();
  return html;
}

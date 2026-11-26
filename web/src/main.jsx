import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { ToastProvider } from './ui.jsx';
import { registerPwa } from './pwa.js';
import './styles.css';

// 被「指定入口白名單」（store_gate_v1.0.js）攔截時，唔可以啟動紀錄冊主程式，
// 亦唔可以註冊 Service Worker／安裝成主畫面圖示 —— 否則會先閃一閃紀錄冊，
// 或者裝出一個永遠打不開嘅圖示。閘腳本本身 fail-open（載入唔到就唔會設 flag）。
if (!document.documentElement.hasAttribute('data-store-gated')) {
  registerPwa();

  createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <ToastProvider>
        <App />
      </ToastProvider>
    </React.StrictMode>,
  );
}

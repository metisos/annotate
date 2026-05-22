import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { crx, defineManifest } from '@crxjs/vite-plugin';

const manifest = defineManifest({
  manifest_version: 3,
  name: 'Annotate',
  version: '0.1.1',
  description: 'Clip, annotate, and share moments from any media on the web.',
  permissions: ['sidePanel', 'storage', 'activeTab', 'scripting'],
  // Capture injects extractFromPage via chrome.scripting.executeScript into the
  // active tab (YouTube, news articles, etc). The side panel opens via
  // openPanelOnActionClick and the user clicks "Clip" inside the panel, so
  // activeTab is never granted for that flow — we need a declared host pattern
  // for any site the user wants to clip. annotate.metisos.co is listed
  // separately for credentialed /api/* fetches.
  host_permissions: ['https://annotate.metisos.co/*', 'https://*/*'],
  action: { default_title: 'Annotate' },
  side_panel: { default_path: 'src/sidepanel/index.html' },
  background: { service_worker: 'src/background/service-worker.ts', type: 'module' },
  icons: {
    16: 'icons/icon-16.png',
    32: 'icons/icon-32.png',
    48: 'icons/icon-48.png',
    128: 'icons/icon-128.png',
  },
});

export default defineConfig({
  plugins: [react(), crx({ manifest })],
  server: { port: 5173, strictPort: true },
  build: { sourcemap: true, outDir: 'dist' },
});

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router';
import './index.css';
import { useData } from './lib/data';
import { t } from './lib/i18n';
import { Gallery } from './pages/Gallery';
import { Viewer } from './pages/Viewer';

function App() {
  const state = useData();
  if (state.status === 'error') {
    return (
      <main className="status-page">
        <p role="alert">{t('app.loadError')}</p>
      </main>
    );
  }
  if (state.status === 'loading') {
    return (
      <main className="status-page" aria-busy="true">
        <p>{t('app.loading')}</p>
      </main>
    );
  }
  const { gallery, config } = state.data;
  return (
    <Routes>
      <Route path="/" element={<Gallery gallery={gallery} config={config} />} />
      <Route path="/kep/:id" element={<Viewer gallery={gallery} config={config} />} />
      <Route path="*" element={<Gallery gallery={gallery} config={config} />} />
    </Routes>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);

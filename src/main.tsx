import { StrictMode, useEffect, useRef, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router';
import './index.css';
import { useConfig, useData } from './lib/data';
import { t } from './lib/i18n';
import { authLinkType, useSession } from './lib/supabase';
import { Gallery } from './pages/Gallery';
import { Viewer } from './pages/Viewer';
import { AccountSetup } from './pages/teacher/AccountSetup';
import { ForgotPassword } from './pages/teacher/ForgotPassword';
import { Login } from './pages/teacher/Login';
import { MyProjects } from './pages/teacher/MyProjects';
import { NewPassword } from './pages/teacher/NewPassword';
import { Editor } from './pages/teacher/Editor';
import { ProfilePlaceholder } from './pages/teacher/Placeholders';

function StatusPage({ error }: { error?: boolean }) {
  return error ? (
    <main className="status-page">
      <p role="alert">{t('app.loadError')}</p>
    </main>
  ) : (
    <main className="status-page" aria-busy="true">
      <p>{t('app.loading')}</p>
    </main>
  );
}

/** Gyerek oldal: galéria és kép nézet. */
function KidApp() {
  const state = useData();
  if (state.status !== 'ready') return <StatusPage error={state.status === 'error'} />;
  const { gallery, config } = state.data;
  return (
    <Routes>
      <Route path="/kep/:id" element={<Viewer gallery={gallery} config={config} />} />
      <Route path="*" element={<Gallery gallery={gallery} config={config} />} />
    </Routes>
  );
}

function RequireAuth({ children }: { children: ReactNode }) {
  const session = useSession();
  if (session === undefined) return <StatusPage />;
  return session ? children : <Navigate to="/belepes" replace />;
}

/** A meghívó levél linkje a főoldalra jön; innen a Fiók beállítására, a jelszó-visszaállítóé az Új jelszóra. */
function AuthLinkRedirect() {
  const navigate = useNavigate();
  // Csak induláskor: a navigate minden oldalváltáskor új függvény, és különben visszadobna ide.
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    if (authLinkType === 'invite') navigate('/fiok-beallitasa', { replace: true });
    else if (authLinkType === 'recovery') navigate('/uj-jelszo', { replace: true });
  }, [navigate]);
  return null;
}

function App() {
  const config = useConfig();
  if (!config) return <StatusPage />;
  return (
    <>
      <AuthLinkRedirect />
      <Routes>
        <Route path="/belepes" element={<Login config={config} />} />
        <Route path="/elfelejtett-jelszo" element={<ForgotPassword />} />
        <Route path="/uj-jelszo" element={<NewPassword config={config} />} />
        <Route path="/fiok-beallitasa" element={<AccountSetup config={config} />} />
        <Route
          path="/projektjeim"
          element={
            <RequireAuth>
              <MyProjects config={config} />
            </RequireAuth>
          }
        />
        <Route
          path="/szerkeszto/:id"
          element={
            <RequireAuth>
              <Editor config={config} />
            </RequireAuth>
          }
        />
        <Route
          path="/profil"
          element={
            <RequireAuth>
              <ProfilePlaceholder />
            </RequireAuth>
          }
        />
        <Route path="*" element={<KidApp />} />
      </Routes>
    </>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '') || '/'}>
      <App />
    </BrowserRouter>
  </StrictMode>,
);

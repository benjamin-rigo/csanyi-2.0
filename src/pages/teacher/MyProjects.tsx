import { useEffect } from 'react';
import { Button } from '@heroui/react';
import { Logo } from '../../components/SiteHeader';
import { t } from '../../lib/i18n';
import { supabase } from '../../lib/supabase';

/** Helykitöltő: a Projektjeim képernyő (8) a következő lépésben készül. */
export function MyProjects() {
  useEffect(() => {
    document.title = t('teacher.projects.documentTitle');
  }, []);
  return (
    <div className="auth-page">
      <header className="site-header">
        <Logo />
        <Button variant="outline" onPress={() => void supabase.auth.signOut()}>
          {t('teacher.projects.signOut')}
        </Button>
      </header>
      <main className="auth-main">
        <h1>{t('teacher.projects.title')}</h1>
        <p>{t('teacher.projects.comingSoon')}</p>
      </main>
    </div>
  );
}

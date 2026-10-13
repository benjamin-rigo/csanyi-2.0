import { useEffect, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router';
import { Avatar, Button } from '@heroui/react';
import { t } from '../lib/i18n';
import { useIsAdmin } from '../lib/admin';
import { useProfile } from '../lib/teacher';
import { Icon } from './Icon';
import { ButtonLink, Logo } from './SiteHeader';

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

/** Pedagógus oldal: bal oldalsáv + tartalomfelület (döntésnapló). */
export function TeacherLayout({ documentTitle, children }: { documentTitle: string; children: ReactNode }) {
  const profile = useProfile();
  const isAdmin = useIsAdmin();
  const { pathname } = useLocation();
  // Telefonon a menü lenyitható (a gomb csak ott látszik); oldalváltáskor becsukódik.
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPath, setMenuPath] = useState(pathname);
  if (menuPath !== pathname) {
    setMenuPath(pathname);
    setMenuOpen(false);
  }
  // Az aktuális oldal kiemelve, és a felolvasó is bemondja.
  const current = (path: string) =>
    pathname.startsWith(path) ? ({ variant: 'secondary', 'aria-current': 'page' } as const) : ({ variant: 'ghost' } as const);

  useEffect(() => {
    document.title = documentTitle;
  }, [documentTitle]);

  return (
    <div className="teacher-page">
      <aside className={`teacher-sidebar${menuOpen ? ' is-open' : ''}`} aria-label={t('teacher.sidebarLabel')}>
        <div className="teacher-logo">
          <Logo />
          <Button
            variant="secondary"
            className="teacher-menu-button"
            aria-expanded={menuOpen}
            aria-controls="teacher-menu"
            onPress={() => setMenuOpen((o) => !o)}
          >
            <Icon name={menuOpen ? 'close' : 'menu'} size={16} />
            {t('teacher.menu')}
          </Button>
        </div>
        <div id="teacher-menu" className="teacher-menu">
          <nav aria-label={t('teacher.navLabel')} className="teacher-nav">
            <ButtonLink href="/projektjeim" {...current('/projektjeim')} className="button--full-width teacher-nav-link">
              <Icon name="image" />
              <span className="nav-text">{t('teacher.nav.projects')}</span>
            </ButtonLink>
            {isAdmin && (
              <ButtonLink href="/galeria-kezelese" {...current('/galeria-kezelese')} className="button--full-width teacher-nav-link">
                <Icon name="shield" />
                <span className="nav-text">{t('teacher.nav.admin')}</span>
              </ButtonLink>
            )}
            <a
              href={import.meta.env.BASE_URL}
              target="_blank"
              rel="noreferrer"
              className="button button--ghost button--full-width teacher-nav-link"
            >
              <Icon name="globe" />
              <span className="nav-text">
                {t('teacher.nav.gallery')}
                <span className="sr-only"> {t('teacher.nav.newTab')}</span>
              </span>
              <Icon name="external" size={16} />
            </a>
          </nav>
          <ButtonLink href="/profil" {...current('/profil')} className="button--full-width teacher-nav-link teacher-profile">
            <Avatar size="sm">
              <Avatar.Fallback>{initials(profile?.name || profile?.email || '')}</Avatar.Fallback>
            </Avatar>
            <span className="nav-text teacher-profile-text">
              <span className="teacher-profile-name">{profile?.name || profile?.email}</span>
              <span className="teacher-profile-sub">{t('teacher.profileLink')}</span>
            </span>
          </ButtonLink>
        </div>
      </aside>
      <div className="teacher-content">
        <main className="teacher-main">{children}</main>
      </div>
    </div>
  );
}

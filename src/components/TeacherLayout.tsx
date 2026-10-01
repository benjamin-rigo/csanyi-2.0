import { useEffect, type ReactNode } from 'react';
import { useLocation } from 'react-router';
import { Avatar } from '@heroui/react';
import { t } from '../lib/i18n';
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
  const { pathname } = useLocation();
  // Az aktuális oldal kiemelve, és a felolvasó is bemondja.
  const current = (path: string) =>
    pathname.startsWith(path) ? ({ variant: 'secondary', 'aria-current': 'page' } as const) : ({ variant: 'ghost' } as const);

  useEffect(() => {
    document.title = documentTitle;
  }, [documentTitle]);

  return (
    <div className="teacher-page">
      <aside className="teacher-sidebar" aria-label={t('teacher.sidebarLabel')}>
        <div className="teacher-logo">
          <Logo />
        </div>
        <nav aria-label={t('teacher.navLabel')} className="teacher-nav">
          <ButtonLink href="/projektjeim" {...current('/projektjeim')} className="button--full-width teacher-nav-link">
            <Icon name="image" />
            <span className="nav-text">{t('teacher.nav.projects')}</span>
          </ButtonLink>
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
      </aside>
      <div className="teacher-content">
        <main className="teacher-main">{children}</main>
      </div>
    </div>
  );
}

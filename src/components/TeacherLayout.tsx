import { useEffect, type ReactNode } from 'react';
import { Link, NavLink } from 'react-router';
import { t } from '../lib/i18n';
import { useProfile } from '../lib/teacher';
import { Icon } from './Icon';
import { Logo } from './SiteHeader';

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

/** Pedagógus oldal: bal oldalsáv + fehér tartalomfelület (döntésnapló). */
export function TeacherLayout({ documentTitle, children }: { documentTitle: string; children: ReactNode }) {
  const profile = useProfile();

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
          <NavLink to="/projektjeim" className="teacher-nav-link">
            <Icon name="image" />
            <span>{t('teacher.nav.projects')}</span>
          </NavLink>
          <Link to="/" target="_blank" className="teacher-nav-link">
            <Icon name="globe" />
            <span>
              {t('teacher.nav.gallery')}
              <span className="sr-only"> {t('teacher.nav.newTab')}</span>
            </span>
            <Icon name="external" size={16} />
          </Link>
        </nav>
        <NavLink to="/profil" className="teacher-profile">
          <span className="teacher-avatar" aria-hidden="true">
            {initials(profile?.name || profile?.email || '')}
          </span>
          <span className="teacher-profile-text">
            <span className="teacher-profile-name">{profile?.name || profile?.email}</span>
            <span className="teacher-profile-sub">{t('teacher.profileLink')}</span>
          </span>
        </NavLink>
      </aside>
      <div className="teacher-content">
        <main className="teacher-main">{children}</main>
      </div>
    </div>
  );
}

import { Link } from 'react-router';
import type { Config } from '../lib/data';
import { t } from '../lib/i18n';
import { Icon } from './Icon';

export function SiteHeader({ config }: { config: Config }) {
  return (
    <header className="site-header">
      <Link to="/" className="logo">
        <span className="logo-mark" aria-hidden="true">
          <Icon name="music" />
        </span>
        {t('app.name')}
      </Link>
      <nav aria-label={t('nav.label')} className="site-nav">
        <a href={config.links.help} className="button button--ghost">
          {t('nav.help')}
        </a>
        <a href={config.links.teachers} className="button button--outline">
          {t('nav.teachers')}
        </a>
      </nav>
    </header>
  );
}

export function SiteFooter({ config }: { config: Config }) {
  return (
    <footer className="site-footer">
      <span>{t('footer.teacherContact', { email: config.contactEmail })}</span>
      <nav aria-label={t('footer.legalLabel')} className="legal">
        <a href={config.links.accessibility}>{t('footer.accessibility')}</a>
        <a href={config.links.privacy}>{t('footer.privacy')}</a>
        <a href={config.links.terms}>{t('footer.terms')}</a>
      </nav>
    </footer>
  );
}

import type { ReactNode } from 'react';
import { Link } from 'react-router';
import type { Config } from '../lib/data';
import { t } from '../lib/i18n';
import { Icon } from './Icon';

/** A config.json linkjei: a „/”-rel kezdődők az alkalmazáson belüliek (a router adja hozzá az alapcímet). */
export function ConfigLink({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  if (href.startsWith('/')) {
    return (
      <Link to={href} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} className={className}>
      {children}
    </a>
  );
}

export function Logo() {
  return (
    <Link to="/" className="logo">
      <span className="logo-mark" aria-hidden="true">
        <Icon name="music" />
      </span>
      {t('app.name')}
    </Link>
  );
}

export function SiteHeader({ config }: { config: Config }) {
  return (
    <header className="site-header">
      <Logo />
      <nav aria-label={t('nav.label')} className="site-nav">
        <ConfigLink href={config.links.help} className="button button--ghost">
          {t('nav.help')}
        </ConfigLink>
        <ConfigLink href={config.links.teachers} className="button button--outline">
          {t('nav.teachers')}
        </ConfigLink>
      </nav>
    </header>
  );
}

export function SiteFooter({ config }: { config: Config }) {
  return (
    <footer className="site-footer">
      <span>{t('footer.teacherContact', { email: config.contactEmail })}</span>
      <nav aria-label={t('footer.legalLabel')} className="legal">
        <ConfigLink href={config.links.accessibility}>{t('footer.accessibility')}</ConfigLink>
        <ConfigLink href={config.links.privacy}>{t('footer.privacy')}</ConfigLink>
        <ConfigLink href={config.links.terms}>{t('footer.terms')}</ConfigLink>
      </nav>
    </footer>
  );
}

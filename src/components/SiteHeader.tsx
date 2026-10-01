import type { ReactNode } from 'react';
import { Link } from '@heroui/react';
import { buttonVariants } from '@heroui/styles';
import { Link as AriaLink } from 'react-aria-components';
import type { Config } from '../lib/data';
import { t } from '../lib/i18n';
import { Icon } from './Icon';

type ButtonLook = 'primary' | 'secondary' | 'tertiary' | 'outline' | 'ghost';

/** Gombnak látszó link (HeroUI gombstílus), a config.json linkjeihez is: a „/”-rel kezdődőket a router kezeli. */
export function ButtonLink({
  href,
  variant = 'ghost',
  className,
  children,
  ...rest
}: {
  href: string;
  variant?: ButtonLook;
  className?: string;
  children: ReactNode;
  'aria-current'?: 'page';
}) {
  return (
    <AriaLink href={href} className={buttonVariants({ variant, className })} {...rest}>
      {children}
    </AriaLink>
  );
}

export function Logo() {
  return (
    <AriaLink href="/" className="logo">
      <span className="logo-mark" aria-hidden="true">
        <Icon name="music" />
      </span>
      {t('app.name')}
    </AriaLink>
  );
}

export function SiteHeader({ config }: { config: Config }) {
  return (
    <header className="site-header">
      <Logo />
      <nav aria-label={t('nav.label')} className="site-nav">
        <ButtonLink href={config.links.help}>{t('nav.help')}</ButtonLink>
        <ButtonLink href={config.links.teachers} variant="outline">
          {t('nav.teachers')}
        </ButtonLink>
      </nav>
    </header>
  );
}

export function SiteFooter({ config }: { config: Config }) {
  return (
    <footer className="site-footer">
      <span>{t('footer.teacherContact', { email: config.contactEmail })}</span>
      <nav aria-label={t('footer.legalLabel')} className="legal">
        <Link href={config.links.accessibility}>{t('footer.accessibility')}</Link>
        <Link href={config.links.privacy}>{t('footer.privacy')}</Link>
        <Link href={config.links.terms}>{t('footer.terms')}</Link>
      </nav>
    </footer>
  );
}

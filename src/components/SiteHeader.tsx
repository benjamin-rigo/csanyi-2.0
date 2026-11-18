import { useId, type ReactNode } from 'react';
import { Link } from '@heroui/react';
import { buttonVariants } from '@heroui/styles';
import { Link as AriaLink } from 'react-aria-components';
import type { Config } from '../lib/data';
import { t } from '../lib/i18n';

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

/** A Színhang jele (döntésnapló): ecsetvonás, ami hanghullám, a szín és a hang találkozása. */
export function LogoMark() {
  const id = useId();
  return (
    <svg className="logo-mark" viewBox="0 0 40 40" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={id} x1="0" x2="1">
          <stop offset="0" stopColor="var(--brand-coral)" />
          <stop offset="0.5" stopColor="var(--brand-sun)" />
          <stop offset="1" stopColor="var(--brand-mint)" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="12" fill="var(--accent)" />
      <path
        d="M7 21c3-9 6-9 8 0s5 9 8 0 5-9 8 0 3 4 3 4"
        fill="none"
        stroke={`url(#${id})`}
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo() {
  return (
    <AriaLink href="/" className="logo">
      <LogoMark />
      {t('app.name')}
    </AriaLink>
  );
}

export function SiteHeader({ config }: { config: Config }) {
  return (
    <header className="site-header">
      <Logo />
      <nav aria-label={t('nav.label')} className="site-nav">
        <ButtonLink href={config.links.help} className="nav-help">
          {t('nav.help')}
        </ButtonLink>
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
        <Link href={config.links.help}>{t('nav.help')}</Link>
        <Link href={config.links.accessibility}>{t('footer.accessibility')}</Link>
        <Link href={config.links.privacy}>{t('footer.privacy')}</Link>
        <Link href={config.links.terms}>{t('footer.terms')}</Link>
      </nav>
    </footer>
  );
}

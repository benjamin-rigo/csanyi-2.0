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

/**
 * A Színhang jele (döntésnapló): egy színes hanghullám a türkiz alapon, a szélek felé elhalkulva, mint egy hangjel.
 * A hullám előre kiszámolt szinuszgörbe, a színe korall, napsárga és égkék átmenet.
 */
const LOGO_WAVE = 'M6.0 20.0 L6.5 20.13 L7.0 20.52 L7.5 21.12 L8.0 21.81 L8.5 22.43 L9.0 22.83 L9.5 22.87 L10.0 22.45 L10.5 21.55 L11.0 20.21 L11.5 18.55 L12.0 16.75 L12.5 15.03 L13.0 13.64 L13.5 12.77 L14.0 12.6 L14.5 13.22 L15.0 14.61 L15.5 16.69 L16.0 19.26 L16.5 22.06 L17.0 24.8 L17.5 27.17 L18.0 28.9 L18.5 29.79 L19.0 29.72 L19.5 28.68 L20.0 26.78 L20.5 24.2 L21.0 21.24 L21.5 18.19 L22.0 15.38 L22.5 13.1 L23.0 11.57 L23.5 10.93 L24.0 11.2 L24.5 12.32 L25.0 14.11 L25.5 16.34 L26.0 18.74 L26.5 21.04 L27.0 22.99 L27.5 24.42 L28.0 25.23 L28.5 25.38 L29.0 24.96 L29.5 24.08 L30.0 22.94 L30.5 21.72 L31.0 20.61 L31.5 19.75 L32.0 19.23 L32.5 19.07 L33.0 19.23 L33.5 19.59 L34.0 20.0';

export function LogoMark() {
  const id = useId();
  return (
    <svg className="logo-mark" viewBox="0 0 40 40" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={id} x1="0" x2="1">
          <stop offset="0" stopColor="var(--brand-coral)" />
          <stop offset="0.5" stopColor="var(--brand-sun)" />
          <stop offset="1" stopColor="var(--brand-sky)" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="12" fill="var(--accent)" />
      <path d={LOGO_WAVE} fill="none" stroke={`url(#${id})`} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
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

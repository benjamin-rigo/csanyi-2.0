import type { ReactNode } from 'react';
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
 * A Színhang jele (döntésnapló): három színes hanghullám a türkiz alapon, a szélek felé elhalkulva, mint egy hangjel.
 * A hullámok előre kiszámolt szinuszgörbék (eltérő amplitúdó, frekvencia és fázis).
 */
const LOGO_WAVES: { d: string; color: string }[] = [
  { d: 'M6.0 20.0 L6.5 20.06 L7.0 20.28 L7.5 20.66 L8.0 21.16 L8.5 21.74 L9.0 22.32 L9.5 22.84 L10.0 23.22 L10.5 23.38 L11.0 23.28 L11.5 22.89 L12.0 22.18 L12.5 21.19 L13.0 19.95 L13.5 18.54 L14.0 17.04 L14.5 15.55 L15.0 14.19 L15.5 13.05 L16.0 12.24 L16.5 11.82 L17.0 11.84 L17.5 12.32 L18.0 13.25 L18.5 14.59 L19.0 16.25 L19.5 18.14 L20.0 20.15 L20.5 22.15 L21.0 24.02 L21.5 25.64 L22.0 26.93 L22.5 27.8 L23.0 28.22 L23.5 28.18 L24.0 27.7 L24.5 26.83 L25.0 25.66 L25.5 24.26 L26.0 22.76 L26.5 21.26 L27.0 19.85 L27.5 18.63 L28.0 17.66 L28.5 16.99 L29.0 16.63 L29.5 16.56 L30.0 16.76 L30.5 17.16 L31.0 17.69 L31.5 18.29 L32.0 18.87 L32.5 19.37 L33.0 19.74 L33.5 19.95 L34.0 20.0', color: 'var(--brand-coral)' },
  { d: 'M6.0 20.0 L6.5 20.16 L7.0 20.26 L7.5 20.24 L8.0 20.05 L8.5 19.69 L9.0 19.18 L9.5 18.56 L10.0 17.9 L10.5 17.26 L11.0 16.74 L11.5 16.4 L12.0 16.32 L12.5 16.54 L13.0 17.08 L13.5 17.93 L14.0 19.05 L14.5 20.37 L15.0 21.79 L15.5 23.2 L16.0 24.5 L16.5 25.57 L17.0 26.32 L17.5 26.67 L18.0 26.59 L18.5 26.05 L19.0 25.1 L19.5 23.8 L20.0 22.23 L20.5 20.52 L21.0 18.79 L21.5 17.16 L22.0 15.76 L22.5 14.67 L23.0 13.97 L23.5 13.7 L24.0 13.86 L24.5 14.41 L25.0 15.28 L25.5 16.4 L26.0 17.66 L26.5 18.94 L27.0 20.16 L27.5 21.2 L28.0 22.02 L28.5 22.56 L29.0 22.82 L29.5 22.81 L30.0 22.57 L30.5 22.16 L31.0 21.66 L31.5 21.13 L32.0 20.66 L32.5 20.29 L33.0 20.05 L33.5 19.97 L34.0 20.0', color: 'var(--brand-sun)' },
  { d: 'M6.0 20.0 L6.5 19.85 L7.0 19.64 L7.5 19.44 L8.0 19.31 L8.5 19.3 L9.0 19.44 L9.5 19.75 L10.0 20.21 L10.5 20.8 L11.0 21.45 L11.5 22.1 L12.0 22.66 L12.5 23.06 L13.0 23.24 L13.5 23.13 L14.0 22.73 L14.5 22.05 L15.0 21.11 L15.5 20.0 L16.0 18.8 L16.5 17.62 L17.0 16.57 L17.5 15.75 L18.0 15.24 L18.5 15.1 L19.0 15.35 L19.5 15.97 L20.0 16.91 L20.5 18.1 L21.0 19.42 L21.5 20.78 L22.0 22.04 L22.5 23.1 L23.0 23.88 L23.5 24.33 L24.0 24.41 L24.5 24.14 L25.0 23.57 L25.5 22.76 L26.0 21.81 L26.5 20.81 L27.0 19.86 L27.5 19.04 L28.0 18.42 L28.5 18.02 L29.0 17.87 L29.5 17.93 L30.0 18.18 L30.5 18.54 L31.0 18.96 L31.5 19.37 L32.0 19.72 L32.5 19.96 L33.0 20.07 L33.5 20.07 L34.0 20.0', color: 'var(--brand-sky)' },
];

export function LogoMark() {
  return (
    <svg className="logo-mark" viewBox="0 0 40 40" aria-hidden="true" focusable="false">
      <rect width="40" height="40" rx="12" fill="var(--accent)" />
      {LOGO_WAVES.map((w) => (
        <path key={w.color} d={w.d} fill="none" stroke={w.color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      ))}
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

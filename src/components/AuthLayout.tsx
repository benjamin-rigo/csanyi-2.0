import { useEffect, type ReactNode } from 'react';
import { Link } from 'react-router';
import { t } from '../lib/i18n';
import { Icon } from './Icon';
import { Logo } from './SiteHeader';

/** Belépési oldalak (6, 6b, 6c, 7): logó, vissza a galériába, középen egy kártya. */
export function AuthLayout({
  documentTitle,
  title,
  subtitle,
  children,
  footnote,
}: {
  documentTitle: string;
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  footnote?: ReactNode;
}) {
  useEffect(() => {
    document.title = documentTitle;
  }, [documentTitle]);

  return (
    <div className="auth-page">
      <header className="site-header">
        <Logo />
      </header>
      <main className="auth-main">
        <nav aria-label={t('auth.breadcrumbLabel')}>
          <Link to="/" className="breadcrumb">
            <Icon name="back" size={16} />
            {t('auth.backToGallery')}
          </Link>
        </nav>
        <div className="auth-center">
          <section className="auth-card" aria-labelledby="auth-title">
            <div className="auth-heading">
              <h1 id="auth-title">{title}</h1>
              {subtitle && <p>{subtitle}</p>}
            </div>
            {children}
          </section>
          {footnote && <p className="auth-footnote">{footnote}</p>}
        </div>
      </main>
    </div>
  );
}

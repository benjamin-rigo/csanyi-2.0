import { useEffect, type ReactNode } from 'react';
import { Card, Link } from '@heroui/react';
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
          <Link href="/" className="back-link text-sm">
            <Icon name="back" size={16} />
            {t('auth.backToGallery')}
          </Link>
        </nav>
        <div className="auth-center">
          <Card className="auth-card">
            <Card.Header>
              <h1 className="auth-title">{title}</h1>
              {subtitle && <Card.Description>{subtitle}</Card.Description>}
            </Card.Header>
            <Card.Content className="auth-content">{children}</Card.Content>
          </Card>
          {footnote && <p className="auth-footnote">{footnote}</p>}
        </div>
      </main>
    </div>
  );
}

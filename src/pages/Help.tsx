import { useEffect } from 'react';
import { Card, Link } from '@heroui/react';
import type { Config } from '../lib/data';
import { t, tList } from '../lib/i18n';
import { SiteFooter, SiteHeader } from '../components/SiteHeader';

type Topic = { title: string; items: string[] };
type Section = { id: string; title: string; lead: string; topics: Topic[] };

/** Súgó: a gyerek oldal és a pedagógus oldal használata, szakaszonként egy kártyán. */
export function Help({ config }: { config: Config }) {
  useEffect(() => {
    document.title = t('help.documentTitle');
  }, []);

  return (
    <div className="kid-page">
      <SiteHeader config={config} />
      <main className="kid-main help-main">
        <div className="help-intro">
          <h1>{t('help.title')}</h1>
          <p>{t('help.intro')}</p>
        </div>

        {tList<Section>('help.sections').map((section) => (
          <Card key={section.id} className="help-card" render={(props) => <section {...props} aria-labelledby={section.id} />}>
            <Card.Header>
              <Card.Title render={(props) => <h2 {...props} id={section.id} />}>{section.title}</Card.Title>
              <Card.Description>{section.lead}</Card.Description>
            </Card.Header>
            <Card.Content className="help-topics">
              {section.topics.map((topic) => (
                <div key={topic.title} className="help-topic">
                  <h3>{topic.title}</h3>
                  <ul>
                    {topic.items.map((item) => (
                      <li key={item}>{item.replace('{email}', config.contactEmail)}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </Card.Content>
          </Card>
        ))}

        <p className="help-contact">
          {t('help.contact')} <Link href={`mailto:${config.contactEmail}`}>{config.contactEmail}</Link>
        </p>
      </main>
      <SiteFooter config={config} />
    </div>
  );
}

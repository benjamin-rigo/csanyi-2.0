import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { ToggleButton, ToggleButtonGroup } from '@heroui/react';
import type { Key } from 'react-aria-components';
import { ALL_CATEGORY, type Config, type Gallery as GalleryData, type Project } from '../lib/data';
import { t } from '../lib/i18n';
import { unlock } from '../lib/audio';
import { Icon } from '../components/Icon';
import { SiteFooter, SiteHeader } from '../components/SiteHeader';

export function Gallery({ gallery, config }: { gallery: GalleryData; config: Config }) {
  const [category, setCategory] = useState<string>(ALL_CATEGORY);
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    document.title = t('gallery.documentTitle');
  }, []);

  const projects = useMemo(
    () => (category === ALL_CATEGORY ? gallery.projects : gallery.projects.filter((p) => p.categories.includes(category))),
    [category, gallery.projects],
  );

  function select(keys: Set<Key>) {
    const next = String([...keys][0] ?? ALL_CATEGORY);
    setCategory(next);
    const label = gallery.categories.find((c) => c.id === next)?.label ?? '';
    const count = next === ALL_CATEGORY ? gallery.projects.length : gallery.projects.filter((p) => p.categories.includes(next)).length;
    // A fókusz a kategórián marad, a felolvasó csak bemondja az eredményt.
    setAnnouncement(t('gallery.categoryAnnounce', { category: label, count }));
  }

  return (
    <div className="kid-page">
      <SiteHeader config={config} />
      <main className="kid-main">
        <div className="gallery-intro">
          <h1>{t('gallery.title')}</h1>
          <p>{t('gallery.intro')}</p>
        </div>

        <div className="gallery-toolbar">
          <ToggleButtonGroup
            aria-label={t('gallery.categoriesLabel')}
            selectionMode="single"
            disallowEmptySelection
            selectedKeys={new Set([category])}
            onSelectionChange={select}
            isDetached
            className="category-group"
          >
            {gallery.categories.map((c) => (
              <ToggleButton key={c.id} id={c.id} className="category">
                {c.icon && <Icon name={c.icon} />}
                {c.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          <span className="count" aria-hidden="true">
            {t('gallery.count', { count: projects.length })}
          </span>
        </div>
        <p className="sr-only" role="status" aria-live="polite">
          {announcement}
        </p>

        {projects.length > 0 ? (
          <ul className="gcard-grid" aria-label={t('gallery.listLabel')}>
            {projects.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </ul>
        ) : (
          <p className="empty">{t('gallery.empty')}</p>
        )}
      </main>
      <SiteFooter config={config} />
    </div>
  );
}

function ProjectCard({ project }: { project: Project }) {
  const descId = `desc-${project.id}`;
  return (
    <li className="gcard">
      <div className="gcard-image">
        <img src={project.image.src} alt="" width={project.image.width} height={project.image.height} loading="lazy" />
      </div>
      <div className="gcard-body">
        <h2 className="gcard-title">
          <Link
            to={`/kep/${project.id}`}
            className="gcard-link"
            aria-describedby={descId}
            // Felolvasóval a kép nézetben már nincs koppintás: a hangot itt oldjuk fel.
            onClick={() => void unlock()}
          >
            {project.title}
          </Link>
        </h2>
        <p id={descId} className="gcard-desc">
          <span className="sr-only">{t('gallery.authorPrefix', { author: project.author })} </span>
          {project.shortDescription}
        </p>
        <p className="gcard-meta" aria-hidden="true">
          {project.author} · {t('gallery.fieldCount', { count: project.fields.length })}
        </p>
      </div>
    </li>
  );
}

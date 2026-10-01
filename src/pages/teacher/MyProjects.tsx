import { useState } from 'react';
import { Button, Card, Chip, EmptyState } from '@heroui/react';
import { Link as AriaLink } from 'react-aria-components';
import { Icon } from '../../components/Icon';
import { NewProjectModal } from '../../components/NewProjectModal';
import { TeacherLayout } from '../../components/TeacherLayout';
import { assetUrl, type Config } from '../../lib/data';
import { t } from '../../lib/i18n';
import { useSession } from '../../lib/supabase';
import { useMyProjects, type ProjectSummary } from '../../lib/teacher';

function timeAgo(iso: string): string {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return t('teacher.time.now');
  if (minutes < 60) return t('teacher.time.minutes', { n: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('teacher.time.hours', { n: hours });
  const days = Math.floor(hours / 24);
  if (days < 7) return t('teacher.time.days', { n: days });
  return new Date(iso).toLocaleDateString('hu-HU', { year: 'numeric', month: 'short', day: 'numeric' });
}

/** Projektjeim (8). Az „Első lépések” kártya és az Új projekt zárolása az onboardinggal jön. */
export function MyProjects({ config }: { config: Config }) {
  const session = useSession();
  const [projects] = useMyProjects();
  const [creating, setCreating] = useState(false);

  return (
    <TeacherLayout documentTitle={t('teacher.projects.documentTitle')}>
      <div className="page-head">
        <div className="page-heading">
          <h1>{t('teacher.projects.title')}</h1>
          <p>{t('teacher.projects.subtitle')}</p>
        </div>
        <Button variant="secondary" size="lg" onPress={() => setCreating(true)}>
          <Icon name="plus" />
          {t('teacher.projects.newProject')}
        </Button>
      </div>

      {projects.status === 'error' && <p role="alert">{t('teacher.projects.loadError')}</p>}
      {projects.status === 'ready' &&
        (projects.data.length === 0 ? (
          <EmptyState className="projects-empty">
            <p>{t('teacher.projects.empty')}</p>
            <Button onPress={() => setCreating(true)}>
              <Icon name="plus" />
              {t('teacher.projects.newProject')}
            </Button>
          </EmptyState>
        ) : (
          <ul className="project-grid" aria-label={t('teacher.projects.listLabel')}>
            {projects.data.map((p) => (
              <ProjectTile key={p.id} project={p} />
            ))}
          </ul>
        ))}

      {session && (
        <NewProjectModal isOpen={creating} onOpenChange={setCreating} userId={session.user.id} maxMb={config.upload.imageMaxMb} />
      )}
    </TeacherLayout>
  );
}

function ProjectTile({ project }: { project: ProjectSummary }) {
  const title = project.title || t('teacher.projects.untitled');
  return (
    <li>
      <Card className="project-card">
        <div className="project-thumb">{project.imagePath && <img src={assetUrl(project.imagePath)} alt="" loading="lazy" />}</div>
        <Card.Header>
          <Card.Title render={(props) => <h2 {...props} />}>
            {/* Az egész kártya egy link a szerkesztőbe. */}
            <AriaLink href={`/szerkeszto/${project.id}`} className="card-link" aria-label={t('teacher.projects.editLabel', { title })}>
              {title}
            </AriaLink>
          </Card.Title>
          <Card.Description>
            {t('teacher.projects.fieldCount', { count: project.fieldCount })} · {timeAgo(project.updatedAt)}
          </Card.Description>
        </Card.Header>
        <Card.Footer className="chips">
          <Chip size="sm">{t(`teacher.projects.visibility.${project.visibility}`)}</Chip>
          {project.isSample && (
            <Chip size="sm" color="warning" variant="soft">
              {t('teacher.projects.sample')}
            </Chip>
          )}
        </Card.Footer>
      </Card>
    </li>
  );
}

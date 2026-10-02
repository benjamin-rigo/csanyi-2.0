import { useEffect, useState } from 'react';
import { Button, Card, Chip, EmptyState, ProgressBar } from '@heroui/react';
import { Link as AriaLink } from 'react-aria-components';
import { Icon } from '../../components/Icon';
import { NewProjectModal } from '../../components/NewProjectModal';
import { ButtonLink } from '../../components/SiteHeader';
import { loadProject } from '../../lib/editor';
import { practiceSteps, useOnboarding } from '../../lib/onboarding';
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
  const [onboarding] = useOnboarding();
  const [practiceDone, setPracticeDone] = useState(0);
  // Az Új projekt az Első lépések után aktív (döntésnapló); addig letiltva, mellette az ok.
  const locked = !onboarding?.done;

  // A kártya haladása a gyakorló projekt állapotából.
  const practiceId = onboarding?.practiceProjectId;
  const userId = session?.user.id;
  useEffect(() => {
    if (!practiceId || !userId) return;
    let alive = true;
    void loadProject(practiceId, userId).then((p) => alive && p && setPracticeDone(practiceSteps(p, false).filter(Boolean).length));
    return () => {
      alive = false;
    };
  }, [practiceId, userId]);

  return (
    <TeacherLayout documentTitle={t('teacher.projects.documentTitle')}>
      <div className="page-head">
        <div className="page-heading">
          <h1>{t('teacher.projects.title')}</h1>
          <p>{t('teacher.projects.subtitle')}</p>
        </div>
        <div className="new-project-action">
          <Button
            variant="secondary"
            size="lg"
            onPress={() => setCreating(true)}
            isDisabled={locked}
            aria-describedby={locked ? 'new-locked' : undefined}
          >
            <Icon name="plus" />
            {t('teacher.projects.newProject')}
          </Button>
          {locked && (
            <span id="new-locked" className="panel-help">
              {t('teacher.onboarding.newProjectLocked')}
            </span>
          )}
        </div>
      </div>

      {onboarding && !onboarding.done && (
        <Card variant="secondary" className="onboarding-card">
          <div className="onboarding-card-text">
            <div className="onboarding-head-row">
              <Chip size="sm" variant="primary">
                {t('teacher.onboarding.cardBadge')}
              </Chip>
              <span className="panel-help">
                {t('teacher.onboarding.cardProgress', { done: practiceDone, total: config.onboarding.steps })}
              </span>
            </div>
            <Card.Title render={(props) => <h2 {...props} />}>{t('teacher.onboarding.cardTitle')}</Card.Title>
            <Card.Description>{t('teacher.onboarding.cardText')}</Card.Description>
            <ProgressBar
              aria-label={t('teacher.onboarding.progressLabel')}
              value={(practiceDone / config.onboarding.steps) * 100}
              size="sm"
            >
              <ProgressBar.Track>
                <ProgressBar.Fill />
              </ProgressBar.Track>
            </ProgressBar>
          </div>
          <ButtonLink href={practiceId ? `/szerkeszto/${practiceId}` : '/minta'} variant="primary" className="button--lg">
            {practiceId ? t('teacher.onboarding.cardContinue') : t('teacher.onboarding.cardStart')}
            <Icon name="forward" size={16} />
          </ButtonLink>
        </Card>
      )}

      {projects.status === 'error' && <p role="alert">{t('teacher.projects.loadError')}</p>}
      {projects.status === 'ready' &&
        (projects.data.length === 0 ? (
          <EmptyState className="projects-empty">
            <p>{locked ? t('teacher.onboarding.newProjectLocked') : t('teacher.projects.empty')}</p>
            {!locked && (
              <Button onPress={() => setCreating(true)}>
                <Icon name="plus" />
                {t('teacher.projects.newProject')}
              </Button>
            )}
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
          {project.isPractice && (
            <Chip size="sm" color="warning" variant="soft">
              {t('teacher.projects.sample')}
            </Chip>
          )}
        </Card.Footer>
      </Card>
    </li>
  );
}

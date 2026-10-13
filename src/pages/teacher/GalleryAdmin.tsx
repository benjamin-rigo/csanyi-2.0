import { useEffect, useState, type ReactNode } from 'react';
import { Alert, Button, Card, Chip, Description, EmptyState, Label, Link, Modal, Tag, TagGroup, TextArea, TextField } from '@heroui/react';
import { Icon } from '../../components/Icon';
import { TeacherLayout } from '../../components/TeacherLayout';
import { removeFromGallery, restoreToGallery, setCategoriesAsAdmin, useAdminGallery, useIsAdmin, type AdminProject } from '../../lib/admin';
import { assetUrl } from '../../lib/data';
import { loadCategories, type CategoryOption } from '../../lib/editor';
import { t } from '../../lib/i18n';

type Dialog = { kind: 'remove' | 'categories'; project: AdminProject } | null;

/** Galéria kezelése (admin): a galéria képei és a levett képek; levétel okkal, visszatétel, kategóriák javítása. */
export function GalleryAdmin() {
  const isAdmin = useIsAdmin();
  const [projects, reload] = useAdminGallery();
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [reason, setReason] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    void loadCategories()
      .then(setCategories)
      .catch(() => undefined);
  }, []);

  const label = (id: string) => categories.find((c) => c.id === id)?.label ?? id;
  const title = (p: AdminProject) => p.title || t('teacher.projects.untitled');

  function open(kind: 'remove' | 'categories', project: AdminProject) {
    setError('');
    setReason('');
    setPicked(project.categories);
    setDialog({ kind, project });
  }

  async function run(action: () => Promise<void>, done: string, failed: string) {
    setPending(true);
    setError('');
    try {
      await action();
      setDialog(null);
      setStatus(done);
      reload();
    } catch {
      setError(failed);
    } finally {
      setPending(false);
    }
  }

  if (isAdmin === false) {
    return (
      <TeacherLayout documentTitle={t('admin.documentTitle')}>
        <div className="page-heading">
          <h1>{t('admin.title')}</h1>
          <p>{t('admin.notAdmin')}</p>
        </div>
      </TeacherLayout>
    );
  }

  const list = projects.status === 'ready' ? projects.data : [];
  const live = list.filter((p) => p.visibility === 'gallery');
  const removed = list.filter((p) => p.visibility !== 'gallery');

  return (
    <TeacherLayout documentTitle={t('admin.documentTitle')}>
      <div className="page-heading">
        <h1>{t('admin.title')}</h1>
        <p>{t('admin.subtitle')}</p>
      </div>
      {projects.status === 'error' && <p role="alert">{t('admin.loadError')}</p>}

      {projects.status === 'ready' && (
        <>
          <section className="admin-section" aria-labelledby="admin-live">
            <h2 id="admin-live">{t('admin.liveTitle', { count: live.length })}</h2>
            {live.length === 0 ? (
              <EmptyState>
                <p>{t('admin.liveEmpty')}</p>
              </EmptyState>
            ) : (
              <ul className="project-grid">
                {live.map((p) => (
                  <AdminTile key={p.id} project={p} title={title(p)} label={label}>
                    <Button size="sm" variant="secondary" onPress={() => open('categories', p)}>
                      {t('admin.categories')}
                    </Button>
                    <Button size="sm" variant="danger-soft" onPress={() => open('remove', p)}>
                      {t('admin.remove')}
                    </Button>
                  </AdminTile>
                ))}
              </ul>
            )}
          </section>

          {removed.length > 0 && (
            <section className="admin-section" aria-labelledby="admin-removed">
              <h2 id="admin-removed">{t('admin.removedTitle', { count: removed.length })}</h2>
              <p className="panel-help">{t('admin.removedHelp')}</p>
              <ul className="project-grid">
                {removed.map((p) => (
                  <AdminTile key={p.id} project={p} title={title(p)} label={label} note={p.moderationNote}>
                    <Button
                      size="sm"
                      variant="secondary"
                      onPress={() =>
                        void run(
                          () => restoreToGallery(p.id),
                          t('admin.restored', { title: title(p) }),
                          t('admin.restoreError', { title: title(p) }),
                        )
                      }
                    >
                      {t('admin.restore')}
                    </Button>
                  </AdminTile>
                ))}
              </ul>
              {error && !dialog && (
                <p role="alert" className="field-error-text">
                  {error}
                </p>
              )}
            </section>
          )}
        </>
      )}

      <p className="sr-only" role="status">
        {status}
      </p>

      <Modal>
        <Modal.Backdrop isOpen={dialog !== null} onOpenChange={(o) => !o && setDialog(null)}>
          <Modal.Container size="sm">
            <Modal.Dialog role={dialog?.kind === 'remove' ? 'alertdialog' : 'dialog'}>
              {dialog?.kind === 'remove' && (
                <>
                  <Modal.Header>
                    <div className="modal-heading">
                      <Modal.Heading>{t('admin.removeTitle', { title: title(dialog.project) })}</Modal.Heading>
                      <p>{t('admin.removeText')}</p>
                    </div>
                  </Modal.Header>
                  <Modal.Body>
                    <TextField value={reason} onChange={setReason} fullWidth>
                      <Label>{t('admin.reason')}</Label>
                      <TextArea rows={3} />
                      <Description>{t('admin.reasonHelp')}</Description>
                    </TextField>
                    {error && <ErrorAlert message={error} />}
                  </Modal.Body>
                  <Modal.Footer>
                    <Button variant="secondary" slot="close">
                      {t('admin.cancel')}
                    </Button>
                    <Button
                      variant="danger"
                      isPending={pending}
                      onPress={() =>
                        void run(
                          () => removeFromGallery(dialog.project.id, reason),
                          t('admin.removed', { title: title(dialog.project) }),
                          t('admin.actionError'),
                        )
                      }
                    >
                      {t('admin.removeConfirm')}
                    </Button>
                  </Modal.Footer>
                </>
              )}
              {dialog?.kind === 'categories' && (
                <>
                  <Modal.Header>
                    <Modal.Heading>{t('admin.categoriesTitle', { title: title(dialog.project) })}</Modal.Heading>
                  </Modal.Header>
                  <Modal.Body>
                    <TagGroup
                      selectionMode="multiple"
                      selectedKeys={new Set(picked)}
                      onSelectionChange={(keys) => setPicked([...keys].map(String))}
                    >
                      <Label>{t('teacher.editor.project.themes')}</Label>
                      <TagGroup.List>
                        {categories.map((c) => (
                          <Tag key={c.id} id={c.id} textValue={c.label}>
                            {c.icon && <Icon name={c.icon} size={14} />}
                            {c.label}
                          </Tag>
                        ))}
                      </TagGroup.List>
                    </TagGroup>
                    {error && <ErrorAlert message={error} />}
                  </Modal.Body>
                  <Modal.Footer>
                    <Button variant="secondary" slot="close">
                      {t('admin.cancel')}
                    </Button>
                    <Button
                      isPending={pending}
                      onPress={() =>
                        void run(
                          () => setCategoriesAsAdmin(dialog.project.id, picked),
                          t('admin.categoriesSaved', { title: title(dialog.project) }),
                          t('admin.actionError'),
                        )
                      }
                    >
                      {t('admin.save')}
                    </Button>
                  </Modal.Footer>
                </>
              )}
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </TeacherLayout>
  );
}

function ErrorAlert({ message }: { message: string }) {
  return (
    <Alert status="danger" role="alert">
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Title>{message}</Alert.Title>
      </Alert.Content>
    </Alert>
  );
}

function AdminTile({
  project,
  title,
  label,
  note,
  children,
}: {
  project: AdminProject;
  title: string;
  label: (id: string) => string;
  note?: string | null;
  children: ReactNode;
}) {
  return (
    <li>
      <Card className="project-card">
        <div className="project-thumb">{project.imagePath && <img src={assetUrl(project.imagePath)} alt="" loading="lazy" />}</div>
        <Card.Header>
          <Card.Title render={(props) => <h3 {...props} />}>
            <Link href={`/kep/${project.id}`} target="_blank" rel="noreferrer">
              {title}
              <span className="sr-only"> {t('teacher.nav.newTab')}</span>
            </Link>
          </Card.Title>
          <Card.Description>
            {project.ownerName || project.ownerEmail
              ? t('admin.owner', { name: project.ownerName || project.ownerEmail || '' })
              : t('admin.sample')}
            {' · '}
            {t('teacher.projects.fieldCount', { count: project.fieldCount })}
          </Card.Description>
          {note && <p className="panel-help">{t('admin.reasonShown', { reason: note })}</p>}
        </Card.Header>
        {project.categories.length > 0 && (
          <div className="chips">
            {project.categories.map((c) => (
              <Chip key={c} size="sm">
                {label(c)}
              </Chip>
            ))}
          </div>
        )}
        <Card.Footer className="admin-actions">{children}</Card.Footer>
      </Card>
    </li>
  );
}

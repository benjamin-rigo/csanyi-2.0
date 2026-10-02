import { useState, type FormEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { Alert, Button, Description, FieldError, Form, Input, Label, Modal, Separator, TextField } from '@heroui/react';
import { FormError } from '../../components/AuthFields';
import { TeacherLayout } from '../../components/TeacherLayout';
import { t } from '../../lib/i18n';
import { supabase, useSession } from '../../lib/supabase';
import { deleteAccount, inviteTeacher, updateProfileName, useInvitations, useProfile, type AccountError } from '../../lib/teacher';

/** A Profil szakaszai: balra cím és magyarázat, jobbra a műveletek (terv). */
function Section({ id, title, help, children }: { id: string; title: string; help: string; children: ReactNode }) {
  return (
    <section className="profile-section" aria-labelledby={id}>
      <div className="profile-section-text">
        <h2 id={id}>{title}</h2>
        <p>{help}</p>
      </div>
      <div className="profile-section-body">{children}</div>
    </section>
  );
}

/** Profil (14): adatok, kolléga meghívása, első lépések, kijelentkezés, fiók törlése. */
export function Profile() {
  const navigate = useNavigate();
  const session = useSession();
  const profile = useProfile();
  const [invitations, reloadInvitations] = useInvitations();

  const [typedName, setName] = useState<string | null>(null);
  const name = typedName ?? profile?.name ?? '';
  const [nameState, setNameState] = useState<'idle' | 'saving' | 'saved' | 'error' | 'empty'>('idle');

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteState, setInviteState] = useState<{ sent?: string; error?: AccountError; pending?: boolean }>({});

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function saveName(e: FormEvent) {
    e.preventDefault();
    if (!session) return;
    if (!name.trim()) return setNameState('empty');
    setNameState('saving');
    try {
      await updateProfileName(session.user.id, name);
      setNameState('saved');
    } catch {
      setNameState('error');
    }
  }

  async function invite(e: FormEvent) {
    e.preventDefault();
    const email = inviteEmail.trim();
    setInviteState({ pending: true });
    const error = await inviteTeacher(email);
    if (error) return setInviteState({ error });
    setInviteState({ sent: email });
    setInviteEmail('');
    reloadInvitations();
  }

  async function removeAccount() {
    setDeleting(true);
    const error = await deleteAccount();
    if (error) {
      setDeleting(false);
      setDeleteError(true);
      return;
    }
    // Előbb a galériára, különben a kijelentkezés miatt a védett oldal a belépésre irányítana.
    navigate('/', { replace: true });
    await supabase.auth.signOut();
  }

  return (
    <TeacherLayout documentTitle={t('teacher.profile.documentTitle')}>
      <div className="page-heading">
        <h1>{t('teacher.profile.title')}</h1>
        <p>{t('teacher.profile.subtitle')}</p>
      </div>

      <div className="profile-sections">
        <Section id="profile-data" title={t('teacher.profile.dataTitle')} help={t('teacher.profile.dataHelp')}>
          <Form className="profile-form" onSubmit={saveName} validationBehavior="aria">
            <TextField
              value={name}
              onChange={(v) => {
                setName(v);
                setNameState('idle');
              }}
              isInvalid={nameState === 'empty'}
              autoComplete="name"
              fullWidth
            >
              <Label>{t('teacher.profile.name')}</Label>
              <Input />
              <FieldError>{t('teacher.profile.nameRequired')}</FieldError>
            </TextField>
            {/* Letiltva a helyén, mellette az ok (döntésnapló): a cím módosításához megerősítő levél kell. */}
            <TextField value={profile?.email ?? ''} isDisabled fullWidth>
              <Label>{t('teacher.profile.email')}</Label>
              <Input />
              <Description>{t('teacher.profile.emailLocked')}</Description>
            </TextField>
            <div className="profile-actions">
              <Button type="submit" isPending={nameState === 'saving'}>
                {t('teacher.profile.save')}
              </Button>
              <span role="status" className="profile-status">
                {nameState === 'saved' && t('teacher.profile.saved')}
              </span>
            </div>
            {nameState === 'error' && <FormError message={t('teacher.profile.saveError')} />}
          </Form>
        </Section>

        <Separator />

        <Section id="profile-invite" title={t('teacher.profile.inviteTitle')} help={t('teacher.profile.inviteHelp')}>
          <Form className="profile-form" onSubmit={invite} validationBehavior="aria">
            <TextField
              type="email"
              value={inviteEmail}
              onChange={(v) => {
                setInviteEmail(v);
                setInviteState({});
              }}
              isInvalid={inviteState.error === 'invalid_email'}
              fullWidth
            >
              <Label>{t('teacher.profile.inviteEmail')}</Label>
              <Input placeholder={t('auth.emailPlaceholder')} />
              <FieldError>{t('teacher.profile.inviteErrors.invalid_email')}</FieldError>
            </TextField>
            <div className="profile-actions">
              <Button type="submit" variant="secondary" isPending={inviteState.pending}>
                {t('teacher.profile.inviteSend')}
              </Button>
            </div>
            <div role="status">
              {inviteState.sent && (
                <Alert status="success">
                  <Alert.Indicator />
                  <Alert.Content>
                    <Alert.Description>{t('teacher.profile.inviteSent', { email: inviteState.sent })}</Alert.Description>
                  </Alert.Content>
                </Alert>
              )}
            </div>
            {inviteState.error && inviteState.error !== 'invalid_email' && (
              <FormError message={t(`teacher.profile.inviteErrors.${inviteState.error}`)} />
            )}
            <p className="panel-help">{t('teacher.profile.smtpNote')}</p>
          </Form>
          {invitations.length > 0 && (
            <div className="profile-invited">
              <h3>{t('teacher.profile.invitedTitle')}</h3>
              <ul>
                {invitations.map((i) => (
                  <li key={i.id}>
                    <span>{i.email}</span>
                    <span className="panel-help">{new Date(i.createdAt).toLocaleDateString('hu-HU')}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Section>

        <Separator />

        <Section id="profile-onboarding" title={t('teacher.profile.onboardingTitle')} help={t('teacher.profile.onboardingHelp')}>
          <div className="profile-actions">
            <Button variant="secondary" onPress={() => navigate('/minta')}>
              {t('teacher.profile.onboardingButton')}
            </Button>
          </div>
        </Section>

        <Separator />

        <Section id="profile-signout" title={t('teacher.profile.signOutTitle')} help={t('teacher.profile.signOutHelp')}>
          <div className="profile-actions">
            <Button variant="secondary" onPress={() => void supabase.auth.signOut()}>
              {t('teacher.profile.signOut')}
            </Button>
          </div>
        </Section>

        <Separator />

        <Section id="profile-delete" title={t('teacher.profile.deleteTitle')} help={t('teacher.profile.deleteHelp')}>
          <div className="profile-actions">
            <Button variant="danger-soft" onPress={() => setConfirmDelete(true)}>
              {t('teacher.profile.deleteButton')}
            </Button>
          </div>
          {deleteError && <FormError message={t('teacher.profile.deleteError')} />}
        </Section>
      </div>

      <Modal>
        <Modal.Backdrop isOpen={confirmDelete} onOpenChange={setConfirmDelete}>
          <Modal.Container size="sm">
            <Modal.Dialog role="alertdialog">
              <Modal.Header>
                <div className="modal-heading">
                  <Modal.Heading>{t('teacher.profile.deleteConfirmTitle')}</Modal.Heading>
                  <p>{t('teacher.profile.deleteConfirmText')}</p>
                </div>
              </Modal.Header>
              <Modal.Footer>
                <Button variant="secondary" slot="close">
                  {t('teacher.profile.cancel')}
                </Button>
                <Button
                  variant="danger"
                  isPending={deleting}
                  onPress={() => {
                    setConfirmDelete(false);
                    void removeAccount();
                  }}
                >
                  {t('teacher.profile.deleteConfirm')}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </TeacherLayout>
  );
}

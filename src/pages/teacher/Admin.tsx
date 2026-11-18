import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { Button, Chip, Description, EmptyState, Label, Modal, Tabs, TextArea, TextField } from '@heroui/react';
import { TeacherLayout } from '../../components/TeacherLayout';
import {
  deleteAccountAsAdmin,
  resolveAccessRequest,
  useAccessRequests,
  useAdminAccounts,
  useIsAdmin,
  type AccessRequest,
  type AdminAccount,
} from '../../lib/admin';
import { t } from '../../lib/i18n';
import { useSession } from '../../lib/supabase';
import { inviteTeacher } from '../../lib/teacher';
import { ErrorAlert, GalleryAdminPanel } from './GalleryAdmin';

type Tab = 'accounts' | 'gallery';

/** Admin (döntésnapló, 2026-11-18): Fiókok és Galéria fül, csak adminnak. A fül az URL-ben van (?ful=galeria). */
export function Admin() {
  const isAdmin = useIsAdmin();
  const [params, setParams] = useSearchParams();
  const tab: Tab = params.get('ful') === 'galeria' ? 'gallery' : 'accounts';

  return (
    <TeacherLayout documentTitle={t('admin.documentTitle')}>
      <div className="page-heading">
        <h1>{t('admin.title')}</h1>
        {isAdmin === false && <p>{t('admin.notAdmin')}</p>}
      </div>
      {isAdmin && (
        <Tabs
          className="admin-tabs"
          selectedKey={tab}
          onSelectionChange={(key) => setParams(key === 'gallery' ? { ful: 'galeria' } : {}, { replace: true })}
        >
          <Tabs.ListContainer>
            <Tabs.List aria-label={t('admin.tabsLabel')}>
              <Tabs.Tab id="accounts">
                {t('admin.tabs.accounts')}
                <Tabs.Indicator />
              </Tabs.Tab>
              <Tabs.Tab id="gallery">
                {t('admin.tabs.gallery')}
                <Tabs.Indicator />
              </Tabs.Tab>
            </Tabs.List>
          </Tabs.ListContainer>
          <Tabs.Panel id="accounts">
            <AccountsPanel />
          </Tabs.Panel>
          <Tabs.Panel id="gallery">
            <GalleryAdminPanel />
          </Tabs.Panel>
        </Tabs>
      )}
    </TeacherLayout>
  );
}

function AccountsPanel() {
  const session = useSession();
  const [accounts, reload] = useAdminAccounts();
  const [target, setTarget] = useState<AdminAccount | null>(null);
  const [reason, setReason] = useState('');
  const [reasonMissing, setReasonMissing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  const label = (a: AdminAccount) => a.name || a.email;

  async function remove(account: AdminAccount, why: string) {
    setBusy(account.id);
    setError('');
    try {
      await deleteAccountAsAdmin(account.id, why);
      setTarget(null);
      setStatus(t(account.pending ? 'admin.accounts.revoked' : 'admin.accounts.deleted', { name: label(account) }));
      reload();
    } catch {
      setError(t('admin.actionError'));
    } finally {
      setBusy(null);
    }
  }

  function openDelete(account: AdminAccount) {
    setReason('');
    setReasonMissing(false);
    setError('');
    setTarget(account);
  }

  function confirmDelete() {
    if (!target) return;
    if (!reason.trim()) return setReasonMissing(true);
    void remove(target, reason.trim());
  }

  if (accounts.status === 'loading') return null;
  if (accounts.status === 'error') return <p role="alert">{t('admin.accounts.loadError')}</p>;

  const pending = accounts.data.filter((a) => a.pending);
  const active = accounts.data.filter((a) => !a.pending);
  const date = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('hu-HU') : t('admin.accounts.never'));

  const row = (a: AdminAccount) => {
    const self = a.id === session?.user.id;
    return (
      <li key={a.id} className="account-row">
        <div className="account-text">
          <span className="account-name">
            {a.name || a.email}
            {a.isAdmin && (
              <Chip size="sm" color="accent" variant="soft">
                {t('admin.accounts.adminChip')}
              </Chip>
            )}
            {self && <Chip size="sm">{t('admin.accounts.youChip')}</Chip>}
          </span>
          {a.name && <span className="account-email">{a.email}</span>}
          <span className="panel-help">
            {a.pending
              ? t('admin.accounts.pendingMeta', { date: date(a.createdAt), by: a.invitedBy ?? t('admin.accounts.unknown') })
              : t('admin.accounts.activeMeta', {
                  created: date(a.createdAt),
                  last: date(a.lastSignInAt),
                  count: a.projectCount,
                })}
            {!a.pending && a.invitedBy && ` · ${t('admin.accounts.invitedBy', { by: a.invitedBy })}`}
          </span>
        </div>
        {!a.isAdmin && !self && (
          <Button
            variant={a.pending ? 'ghost' : 'danger-soft'}
            isPending={busy === a.id}
            aria-label={t(a.pending ? 'admin.accounts.revokeLabel' : 'admin.accounts.deleteLabel', { name: label(a) })}
            onPress={() => (a.pending ? void remove(a, '') : openDelete(a))}
          >
            {t(a.pending ? 'admin.accounts.revoke' : 'admin.accounts.delete')}
          </Button>
        )}
      </li>
    );
  };

  return (
    <>
      <p className="admin-intro">{t('admin.accounts.intro')}</p>
      {error && !target && <ErrorAlert message={error} />}

      <RequestsSection onInvited={reload} onStatus={setStatus} />

      <section className="admin-section" aria-labelledby="admin-active">
        <h2 id="admin-active">{t('admin.accounts.activeTitle', { count: active.length })}</h2>
        <ul className="account-list">{active.map(row)}</ul>
      </section>

      <section className="admin-section" aria-labelledby="admin-pending">
        <h2 id="admin-pending">{t('admin.accounts.pendingTitle', { count: pending.length })}</h2>
        {pending.length === 0 ? (
          <EmptyState>
            <p>{t('admin.accounts.pendingEmpty')}</p>
          </EmptyState>
        ) : (
          <ul className="account-list">{pending.map(row)}</ul>
        )}
      </section>

      <p className="sr-only" role="status">
        {status}
      </p>

      <Modal>
        <Modal.Backdrop isOpen={target !== null} onOpenChange={(o) => !o && setTarget(null)}>
          <Modal.Container size="sm">
            <Modal.Dialog role="alertdialog">
              {target && (
                <>
                  <Modal.Header>
                    <div className="modal-heading">
                      <Modal.Heading>{t('admin.accounts.deleteTitle', { name: label(target) })}</Modal.Heading>
                      <p>{t('admin.accounts.deleteText', { count: target.projectCount })}</p>
                    </div>
                  </Modal.Header>
                  <Modal.Body>
                    <TextField
                      value={reason}
                      onChange={(v) => {
                        setReason(v);
                        setReasonMissing(false);
                      }}
                      isRequired
                      isInvalid={reasonMissing}
                      fullWidth
                    >
                      <Label>{t('admin.accounts.reason')}</Label>
                      <TextArea rows={3} />
                      <Description>{t('admin.accounts.reasonHelp')}</Description>
                    </TextField>
                    {reasonMissing && (
                      <p className="field-error-text" role="alert">
                        {t('admin.accounts.reasonMissing')}
                      </p>
                    )}
                    {error && <ErrorAlert message={error} />}
                  </Modal.Body>
                  <Modal.Footer>
                    <Button variant="outline" slot="close">
                      {t('admin.cancel')}
                    </Button>
                    <Button variant="danger" isPending={busy === target.id} onPress={confirmDelete}>
                      {t('admin.accounts.deleteConfirm')}
                    </Button>
                  </Modal.Footer>
                </>
              )}
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </>
  );
}

/** Hozzáférési kérések: meghívás (a teacher-account függvényen át, mint a Profilból) vagy elutasítás; utána a kérés törlődik. */
function RequestsSection({ onInvited, onStatus }: { onInvited: () => void; onStatus: (message: string) => void }) {
  const [requests, reload] = useAccessRequests();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function handle(r: AccessRequest, invite: boolean) {
    setBusy(r.id);
    setError('');
    try {
      if (invite) {
        const failed = await inviteTeacher(r.email);
        if (failed) return setError(t(`teacher.profile.inviteErrors.${failed}`));
      }
      await resolveAccessRequest(r.id);
      onStatus(
        invite
          ? t('admin.accounts.invited', { email: r.email })
          : t(r.hasAccount ? 'admin.accounts.closed' : 'admin.accounts.declined', { name: r.name }),
      );
      reload();
      if (invite) onInvited();
    } catch {
      setError(t('admin.actionError'));
    } finally {
      setBusy(null);
    }
  }

  if (requests.status === 'loading') return null;
  const count = requests.status === 'ready' ? requests.data.length : 0;
  const date = (iso: string) => new Date(iso).toLocaleDateString('hu-HU');

  return (
    <section className="admin-section" aria-labelledby="admin-requests">
      <h2 id="admin-requests">{t('admin.accounts.requestsTitle', { count })}</h2>
      {error && <ErrorAlert message={error} />}
      {requests.status === 'error' ? (
        <p role="alert">{t('admin.accounts.requestsLoadError')}</p>
      ) : count === 0 ? (
        <EmptyState>
          <p>{t('admin.accounts.requestsEmpty')}</p>
        </EmptyState>
      ) : (
        <ul className="account-list">
          {requests.data.map((r) => (
            <li key={r.id} className="account-row">
              <div className="account-text">
                <span className="account-name">
                  {r.name}
                  {r.hasAccount && <Chip size="sm">{t('admin.accounts.hasAccountChip')}</Chip>}
                </span>
                <span className="account-email">{r.email}</span>
                <span className="panel-help">{t('admin.accounts.requestMeta', { school: r.school, date: date(r.createdAt) })}</span>
                {r.message && <p className="request-message">{r.message}</p>}
              </div>
              <div className="admin-actions">
                {r.hasAccount ? (
                  <Button
                    variant="ghost"
                    isPending={busy === r.id}
                    aria-label={t('admin.accounts.closeLabel', { name: r.name })}
                    onPress={() => void handle(r, false)}
                  >
                    {t('admin.accounts.close')}
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      isDisabled={busy === r.id}
                      aria-label={t('admin.accounts.declineLabel', { name: r.name })}
                      onPress={() => void handle(r, false)}
                    >
                      {t('admin.accounts.decline')}
                    </Button>
                    <Button
                      variant="outline"
                      isPending={busy === r.id}
                      aria-label={t('admin.accounts.inviteLabel', { name: r.name })}
                      onPress={() => void handle(r, true)}
                    >
                      {t('admin.accounts.invite')}
                    </Button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

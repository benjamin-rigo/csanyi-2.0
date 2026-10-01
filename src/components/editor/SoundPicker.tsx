import { useEffect, useState, type FormEvent } from 'react';
import { Button, Description, FieldError, Form, Input, Label, Modal, Tabs, TextField } from '@heroui/react';
import { DropZone, FileTrigger, type DropZoneProps, type FileDropItem } from 'react-aria-components';
import { AUDIO_TYPES, uploadSound, type EditorSound } from '../../lib/editor';
import { t } from '../../lib/i18n';
import { FormError } from '../AuthFields';
import { Icon } from '../Icon';
import { LibraryTab } from './LibraryTab';
import { PlayButton, stopPreview } from './SoundCard';

type DropEvent = Parameters<NonNullable<DropZoneProps['onDrop']>>[0];
type Errors = { file?: string; name?: string; form?: string };

/** Hang kiválasztása (12): Freesound könyvtár (CC0) vagy saját feltöltés. */
export function SoundPicker({
  isOpen,
  onOpenChange,
  target,
  initialQuery,
  userId,
  maxMb,
  onPick,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  target: string;
  /** A keresés ezzel indul (a hangmező neve). */
  initialQuery: string;
  userId: string;
  maxMb: number;
  onPick: (sound: EditorSound) => void;
}) {
  const [picked, setPicked] = useState<{ file: File; url: string } | null>(null);
  const [name, setName] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [pending, setPending] = useState(false);
  const [tab, setTab] = useState<'library' | 'own'>('library');

  useEffect(() => () => void (picked && URL.revokeObjectURL(picked.url)), [picked]);

  function fileError(f: File): string | undefined {
    if (!AUDIO_TYPES.includes(f.type.split(';')[0])) return t('teacher.editor.picker.errors.fileType');
    if (f.size > maxMb * 1024 * 1024) return t('teacher.editor.picker.errors.fileSize', { mb: maxMb });
  }

  function pick(f: File | undefined) {
    if (!f) return;
    const error = fileError(f);
    setErrors((e) => ({ ...e, file: error }));
    if (error) return;
    setPicked({ file: f, url: URL.createObjectURL(f) });
    if (!name) setName(f.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '));
  }

  async function onDrop(e: DropEvent) {
    const item = e.items.find((i): i is FileDropItem => i.kind === 'file');
    if (item) pick(await item.getFile());
  }

  function close(open: boolean) {
    stopPreview();
    if (!open) {
      setTab('library');
      setPicked(null);
      setName('');
      setErrors({});
    }
    onOpenChange(open);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const next: Errors = {
      file: picked ? undefined : t('teacher.editor.picker.errors.fileRequired'),
      name: name.trim() ? undefined : t('teacher.editor.picker.errors.nameRequired'),
    };
    setErrors(next);
    if (next.file || next.name || !picked) {
      requestAnimationFrame(() =>
        document.querySelector<HTMLElement>('.sound-picker [aria-invalid="true"], .sound-picker .dropzone-browse')?.focus(),
      );
      return;
    }
    setPending(true);
    try {
      const sound = await uploadSound(userId, picked.file, name.trim());
      onPick(sound);
      close(false);
    } catch {
      setErrors({ form: t('teacher.editor.picker.errors.generic') });
    } finally {
      setPending(false);
    }
  }

  return (
    <Modal>
      <Modal.Backdrop isOpen={isOpen} onOpenChange={close}>
        <Modal.Container size="lg">
          <Modal.Dialog className="sound-picker">
            <Modal.Header>
              <div className="modal-heading">
                <Modal.Heading>{t('teacher.editor.picker.title')}</Modal.Heading>
                <p>{target}</p>
              </div>
              <Modal.CloseTrigger aria-label={t('teacher.editor.picker.close')} />
            </Modal.Header>
            <Form onSubmit={submit} validationBehavior="aria">
              <Modal.Body>
                <Tabs selectedKey={tab} onSelectionChange={(k) => setTab(k as 'library' | 'own')}>
                  <Tabs.ListContainer>
                    <Tabs.List aria-label={t('teacher.editor.picker.tabsLabel')}>
                      <Tabs.Tab id="library">
                        {t('teacher.editor.picker.library')}
                        <Tabs.Indicator />
                      </Tabs.Tab>
                      <Tabs.Tab id="own">
                        {t('teacher.editor.picker.own')}
                        <Tabs.Indicator />
                      </Tabs.Tab>
                    </Tabs.List>
                  </Tabs.ListContainer>
                  <Tabs.Panel id="library">
                    <LibraryTab
                      initialQuery={initialQuery}
                      userId={userId}
                      onPick={(sound) => {
                        onPick(sound);
                        close(false);
                      }}
                    />
                  </Tabs.Panel>
                  <Tabs.Panel id="own" className="picker-panel">
                    <div className="dropzone-field">
                      <DropZone
                        className="dropzone"
                        getDropOperation={(types) => (AUDIO_TYPES.some((type) => types.has(type)) ? 'copy' : 'cancel')}
                        onDrop={onDrop}
                        aria-label={t('teacher.editor.picker.drop')}
                      >
                        {picked ? (
                          <PlayButton src={picked.url} title={name || picked.file.name} />
                        ) : (
                          <>
                            <Icon name="upload" size={20} />
                            <p>
                              <strong>{t('teacher.editor.picker.drop')}</strong>
                              {t('teacher.editor.picker.or')}
                            </p>
                          </>
                        )}
                        <FileTrigger acceptedFileTypes={AUDIO_TYPES} onSelect={(files) => pick(files?.[0])}>
                          <Button variant="outline" className="dropzone-browse" aria-describedby="sound-help sound-error">
                            {picked ? t('teacher.editor.picker.change') : t('teacher.editor.picker.browse')}
                          </Button>
                        </FileTrigger>
                        <p id="sound-help" className="dropzone-help">
                          {picked ? picked.file.name : t('teacher.editor.picker.fileHelp', { mb: maxMb })}
                        </p>
                      </DropZone>
                      <p id="sound-error" className="field-error-text" role={errors.file ? 'alert' : undefined}>
                        {errors.file}
                      </p>
                    </div>
                    <TextField
                      name="soundName"
                      value={name}
                      onChange={(v) => {
                        setName(v);
                        setErrors((e) => ({ ...e, name: undefined }));
                      }}
                      isInvalid={Boolean(errors.name)}
                      fullWidth
                    >
                      <Label>{t('teacher.editor.picker.nameLabel')}</Label>
                      <Input />
                      <Description>{t('teacher.editor.picker.nameHelp')}</Description>
                      <FieldError>{errors.name}</FieldError>
                    </TextField>
                    {errors.form && <FormError message={errors.form} />}
                  </Tabs.Panel>
                </Tabs>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="outline" slot="close">
                  {t('teacher.editor.picker.cancel')}
                </Button>
                {tab === 'own' && (
                  <Button type="submit" isPending={pending}>
                    {t('teacher.editor.picker.choose')}
                  </Button>
                )}
              </Modal.Footer>
            </Form>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

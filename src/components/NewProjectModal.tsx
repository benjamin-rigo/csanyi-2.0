import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { Button, FieldError, Form, Input, Label, Modal, TextField } from '@heroui/react';
import { DropZone, FileTrigger, type DropZoneProps, type FileDropItem } from 'react-aria-components';
import { t } from '../lib/i18n';
import { createProject, IMAGE_TYPES } from '../lib/teacher';
import { FormError } from './AuthFields';
import { Icon } from './Icon';

type DropEvent = Parameters<NonNullable<DropZoneProps['onDrop']>>[0];
type Errors = { image?: string; title?: string; form?: string };

export function NewProjectModal({
  isOpen,
  onOpenChange,
  userId,
  maxMb,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  maxMb: number;
}) {
  const navigate = useNavigate();
  const [picked, setPicked] = useState<{ file: File; url: string } | null>(null);
  const file = picked?.file ?? null;
  const preview = picked?.url ?? null;
  const [title, setTitle] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [pending, setPending] = useState(false);

  // Az előnézet URL-jét bezáráskor felszabadítjuk.
  useEffect(() => () => void (picked && URL.revokeObjectURL(picked.url)), [picked]);

  function imageError(f: File): string | undefined {
    if (!IMAGE_TYPES.includes(f.type)) return t('teacher.newProject.errors.imageType');
    if (f.size > maxMb * 1024 * 1024) return t('teacher.newProject.errors.imageSize', { mb: maxMb });
  }

  function pick(f: File | undefined) {
    if (!f) return;
    const error = imageError(f);
    setErrors((e) => ({ ...e, image: error }));
    if (!error) setPicked({ file: f, url: URL.createObjectURL(f) });
  }

  async function onDrop(e: DropEvent) {
    const item = e.items.find((i): i is FileDropItem => i.kind === 'file');
    if (item) pick(await item.getFile());
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const next: Errors = {
      image: file ? undefined : t('teacher.newProject.errors.imageRequired'),
      title: title.trim() ? undefined : t('teacher.newProject.errors.titleRequired'),
    };
    setErrors(next);
    if (next.image || next.title || !file) {
      requestAnimationFrame(() =>
        document.querySelector<HTMLElement>('.new-project [aria-invalid="true"], .new-project .dropzone-browse')?.focus(),
      );
      return;
    }
    setPending(true);
    try {
      const id = await createProject(userId, file, title);
      navigate(`/szerkeszto/${id}`);
    } catch {
      setErrors({ form: t('teacher.newProject.errors.generic') });
      setPending(false);
    }
  }

  return (
    <Modal>
      <Modal.Backdrop isOpen={isOpen} onOpenChange={onOpenChange}>
        <Modal.Container size="lg">
          <Modal.Dialog className="new-project">
            <Modal.Header>
              <div className="modal-heading">
                <Modal.Heading>{t('teacher.newProject.title')}</Modal.Heading>
                <p>{t('teacher.newProject.subtitle')}</p>
              </div>
              <Modal.CloseTrigger aria-label={t('teacher.newProject.close')} />
            </Modal.Header>
            <Form onSubmit={submit} validationBehavior="aria">
              <Modal.Body>
                <div className="dropzone-field">
                  <DropZone
                    className="dropzone"
                    getDropOperation={(types) => (IMAGE_TYPES.some((type) => types.has(type)) ? 'copy' : 'cancel')}
                    onDrop={onDrop}
                    aria-label={t('teacher.newProject.drop')}
                  >
                    {preview ? (
                      <img src={preview} alt="" className="dropzone-preview" />
                    ) : (
                      <>
                        <Icon name="upload" size={20} />
                        <p>
                          <strong>{t('teacher.newProject.drop')}</strong>
                          {t('teacher.newProject.or')}
                        </p>
                      </>
                    )}
                    <FileTrigger acceptedFileTypes={IMAGE_TYPES} onSelect={(files) => pick(files?.[0])}>
                      <Button variant="outline" className="dropzone-browse" aria-describedby="image-help image-error">
                        {preview ? t('teacher.newProject.change') : t('teacher.newProject.browse')}
                      </Button>
                    </FileTrigger>
                    <p id="image-help" className="dropzone-help">
                      {file ? file.name : t('teacher.newProject.fileHelp', { mb: maxMb })}
                    </p>
                  </DropZone>
                  <p id="image-error" className="field-error-text" role={errors.image ? 'alert' : undefined}>
                    {errors.image}
                  </p>
                </div>
                <TextField
                  name="title"
                  value={title}
                  onChange={(v) => {
                    setTitle(v);
                    setErrors((e) => ({ ...e, title: undefined }));
                  }}
                  isInvalid={Boolean(errors.title)}
                  fullWidth
                >
                  <Label>{t('teacher.newProject.titleLabel')}</Label>
                  <Input placeholder={t('teacher.newProject.titlePlaceholder')} />
                  <FieldError>{errors.title}</FieldError>
                </TextField>
                <p className="modal-note">{t('teacher.newProject.privateNote')}</p>
                {errors.form && <FormError message={errors.form} />}
              </Modal.Body>
              <Modal.Footer>
                <Button variant="outline" slot="close">
                  {t('teacher.newProject.cancel')}
                </Button>
                <Button type="submit" isPending={pending}>
                  {t('teacher.newProject.create')}
                </Button>
              </Modal.Footer>
            </Form>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

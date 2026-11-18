import { useState, type CSSProperties } from 'react';
import { Alert, Button, Description, Input, Label, Link, Radio, RadioGroup, TextField } from '@heroui/react';
import { projectMissing, type EditorProject, type Missing, type Visibility } from '../../lib/editor';
import { moderationReason } from '../../lib/admin';
import { fieldColorVar } from './DrawingCanvas';
import { t } from '../../lib/i18n';
import { Icon } from '../Icon';

/** A gyerek oldali képnézet címe: ugyanez nyílik meg a galériából is (döntésnapló). */
export function shareUrl(projectId: string): string {
  return new URL(`${import.meta.env.BASE_URL}kep/${projectId}`, window.location.origin).href;
}

const OPTIONS: { value: Visibility; icon: string }[] = [
  { value: 'private', icon: 'lock' },
  { value: 'link', icon: 'link' },
  { value: 'gallery', icon: 'globe' },
];

/** Megosztás fül (13): ki láthatja, mi hiányzik a galériához, a link. */
export function SharePanel({
  project,
  onVisibility,
  onGoToMissing,
  error,
  readOnly = false,
}: {
  project: EditorProject;
  onVisibility: (v: Visibility) => void;
  onGoToMissing: (m: Missing) => void;
  error: boolean;
  /** Minta: a megosztás nem módosítható. */
  readOnly?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const missing = projectMissing(project);
  const url = shareUrl(project.id);
  const projectItems = missing.filter((m) => m.kind === 'image' || m.kind === 'title' || m.kind === 'shortDescription');
  const soundItems = missing.filter((m) => m.kind === 'background' || m.kind === 'fields');
  type FieldKind = Extract<Missing, { fieldId: string }>['kind'];
  const byField = project.fields
    .map((field, index) => ({
      field,
      index,
      kinds: missing.flatMap((m) => ('fieldId' in m && m.fieldId === field.id ? [m.kind as FieldKind] : [])),
    }))
    .filter((x) => x.kinds.length > 0);

  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <fieldset disabled={readOnly} className="plain-fieldset panel-sections">
      <RadioGroup value={project.visibility} onChange={(v) => onVisibility(v as Visibility)} className="share-options">
        <Label>{t('teacher.editor.share.title')}</Label>
        {OPTIONS.map(({ value, icon }) => (
          // A galéria letiltva látszik, amíg valami hiányzik (döntésnapló); a hiányzó tételek alatta.
          <Radio
            key={value}
            value={value}
            isDisabled={value === 'gallery' && missing.length > 0}
            aria-describedby={value === 'gallery' && missing.length > 0 ? 'share-missing' : undefined}
          >
            <Radio.Content>
              <Radio.Control>
                <Radio.Indicator />
              </Radio.Control>
              <Icon name={icon} />
              {t(`teacher.editor.share.${value}`)}
            </Radio.Content>
            <Description>{t(`teacher.editor.share.${value}Help`)}</Description>
          </Radio>
        ))}
      </RadioGroup>

      {project.moderationNote && project.visibility !== 'gallery' && (
        <Alert status="warning">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>{t('teacher.editor.share.moderated')}</Alert.Title>
            <Alert.Description>
              {moderationReason(project.moderationNote)
                ? t('teacher.editor.share.moderatedReason', { reason: moderationReason(project.moderationNote)! })
                : t('teacher.editor.share.moderatedNoReason')}
            </Alert.Description>
          </Alert.Content>
        </Alert>
      )}

      {missing.length > 0 && (
        <Alert status="warning" id="share-missing">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>{t('teacher.editor.share.notReady')}</Alert.Title>
            {/* Fülek szerint csoportosítva, hangmezőnként egy sor: mi hiányzik belőle (ne ismétlődjön ugyanaz a név). */}
            {projectItems.length > 0 && (
              <div className="missing-group">
                <p className="missing-group-title">{t('teacher.editor.share.groupProject')}</p>
                <ul className="missing-list">
                  {projectItems.map((m) => (
                    <li key={m.kind}>
                      <Link onPress={() => onGoToMissing(m)}>{t(`teacher.editor.share.missing.${m.kind}`)}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {(soundItems.length > 0 || byField.length > 0) && (
              <div className="missing-group">
                <p className="missing-group-title">{t('teacher.editor.share.groupSounds')}</p>
                <ul className="missing-list">
                  {soundItems.map((m) => (
                    <li key={m.kind}>
                      <Link onPress={() => onGoToMissing(m)}>{t(`teacher.editor.share.missing.${m.kind}`)}</Link>
                    </li>
                  ))}
                  {byField.map(({ field, index, kinds }) => (
                    <li key={field.id} className="missing-field">
                      <span className="field-swatch" style={{ '--c': fieldColorVar(index) } as CSSProperties} aria-hidden="true" />
                      <span className="missing-field-text">
                        <Link onPress={() => onGoToMissing({ kind: kinds[0], fieldId: field.id })}>
                          {field.name.trim() || t('teacher.editor.share.untitledField', { n: index + 1 })}
                        </Link>
                        <span className="panel-help">
                          {t('teacher.editor.share.fieldMissing', { items: kinds.map((k) => t(`teacher.editor.share.missing.${k}`)).join(', ') })}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Alert.Content>
        </Alert>
      )}

      {error && (
        <p className="field-error-text" role="alert">
          {t('teacher.editor.share.saveError')}
        </p>
      )}

      <div className="panel-field">
        <TextField value={url} isReadOnly fullWidth>
          <Label>{t('teacher.editor.share.linkLabel')}</Label>
          <div className="share-link-row">
            <Input />
            <Button variant="outline" onPress={() => void copy()}>
              {copied ? t('teacher.editor.share.copied') : t('teacher.editor.share.copy')}
            </Button>
          </div>
          <Description>
            {project.visibility === 'private'
              ? t('teacher.editor.share.linkHelpPrivate')
              : project.visibility === 'link'
                ? t('teacher.editor.share.linkHelpLink')
                : t('teacher.editor.share.linkHelpGallery')}
          </Description>
        </TextField>
        <p className="sr-only" role="status">
          {copied ? t('teacher.editor.share.copied') : ''}
        </p>
      </div>
    </fieldset>
  );
}

import { useState } from 'react';
import { Alert, Button, Description, Input, Label, Link, Radio, RadioGroup, TextField } from '@heroui/react';
import { projectMissing, type EditorProject, type Missing, type Visibility } from '../../lib/editor';
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
}: {
  project: EditorProject;
  onVisibility: (v: Visibility) => void;
  onGoToMissing: (m: Missing) => void;
  error: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const missing = projectMissing(project);
  const url = shareUrl(project.id);
  const fieldName = (id: string) => project.fields.find((f) => f.id === id)?.name.trim() || t('teacher.editor.fields.untitled');

  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="panel-sections">
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
              <Icon name={icon} size={16} />
              {t(`teacher.editor.share.${value}`)}
            </Radio.Content>
            <Description>{t(`teacher.editor.share.${value}Help`)}</Description>
          </Radio>
        ))}
      </RadioGroup>

      {missing.length > 0 && (
        <Alert status="warning" id="share-missing">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>{t('teacher.editor.share.notReady')}</Alert.Title>
            <ul className="missing-list">
              {missing.map((m, i) => (
                <li key={i}>
                  <Link onPress={() => onGoToMissing(m)} className="text-sm">
                    {'fieldId' in m
                      ? t(`teacher.editor.share.missing.${m.kind}`, { name: fieldName(m.fieldId) })
                      : t(`teacher.editor.share.missing.${m.kind}`)}
                  </Link>
                </li>
              ))}
            </ul>
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
            <Button variant="secondary" onPress={() => void copy()}>
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
    </div>
  );
}

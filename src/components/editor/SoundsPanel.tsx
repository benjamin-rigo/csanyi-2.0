import { useEffect, useRef, type CSSProperties, type RefObject } from 'react';
import { Button, Chip, Description, Input, Label, ListBox, Slider, TextArea, TextField } from '@heroui/react';
import type { EditorField, EditorProject, EditorSound } from '../../lib/editor';
import { t } from '../../lib/i18n';
import { Icon } from '../Icon';
import { fieldColorVar } from './DrawingCanvas';
import { SoundCard } from './SoundCard';
import { VoiceRecorder } from './VoiceRecorder';

export type Selection = { kind: 'background' } | { kind: 'field'; id: string } | null;

function VolumeSlider({
  id,
  value,
  onChange,
  help,
  label = t('teacher.editor.fields.volume'),
}: {
  id: string;
  value: number;
  onChange: (v: number) => void;
  help?: string;
  label?: string;
}) {
  return (
    <div className="panel-field">
      <Slider
        id={id}
        value={Math.round(value * 100)}
        minValue={0}
        maxValue={100}
        onChange={(v) => onChange((v as number) / 100)}
        formatOptions={{ style: 'unit', unit: 'percent' }}
        className="volume-slider"
      >
        <div className="volume-head">
          <Label>{label}</Label>
          <Slider.Output />
        </div>
        <Slider.Track>
          <Slider.Fill />
          <Slider.Thumb />
        </Slider.Track>
      </Slider>
      {help && <p className="panel-help">{help}</p>}
    </div>
  );
}

function AddTile({ label, onPress, isDisabled }: { label: string; onPress: () => void; isDisabled?: boolean }) {
  return (
    <Button variant="tertiary" fullWidth onPress={onPress} isDisabled={isDisabled}>
      <Icon name="plus" />
      {label}
    </Button>
  );
}

/**
 * Hangok fül (11, 11b), lefúrós szerkezettel: a lista (háttérhang, hangmezők) sorára kattintva
 * a panel a részletekre vált; a „Hangok” gombbal vissza, a fókusz ugyanarra a sorra kerül.
 */
export function SoundsPanel({
  project,
  selection,
  onSelect,
  userId,
  onAddField,
  onPickSound,
  onBackgroundVolume,
  onRemoveBackground,
  onFieldChange,
  onFieldVoice,
  onDeleteField,
  readOnly = false,
}: {
  project: EditorProject;
  selection: Selection;
  onSelect: (s: Selection) => void;
  userId: string;
  onAddField: () => void;
  onPickSound: (target: 'background' | string) => void;
  onBackgroundVolume: (v: number) => void;
  onRemoveBackground: () => void;
  onFieldChange: (id: string, patch: Partial<Pick<EditorField, 'name' | 'description' | 'volume' | 'softness'>>) => void;
  onFieldVoice: (id: string, sound: EditorSound | null) => void;
  onDeleteField: (field: EditorField) => void;
  /** Minta: a listák és részletek megnézhetők, de nem módosíthatók. */
  readOnly?: boolean;
}) {
  const bg = project.background;
  const field = selection?.kind === 'field' ? (project.fields.find((f) => f.id === selection.id) ?? null) : null;
  const fieldName = (f: EditorField) => f.name.trim() || t('teacher.editor.fields.untitled');

  const detailHeading = useRef<HTMLElement>(null);
  const lastRow = useRef<string | null>(null);
  const selectionKey = selection ? (selection.kind === 'field' ? selection.id : 'background') : null;

  // Részletre váltáskor a fókusz a címre, visszalépéskor arra a sorra kerül, ahonnan jött.
  useEffect(() => {
    if (selectionKey) {
      lastRow.current = selectionKey;
      detailHeading.current?.focus();
    } else if (lastRow.current) {
      // A react-aria a lista sorait a következő renderelési körben teszi ki, ezért egy képkockát várunk.
      const key = lastRow.current;
      const frame = requestAnimationFrame(() => document.querySelector<HTMLElement>(`.panel-list [data-key="${key}"]`)?.focus());
      return () => cancelAnimationFrame(frame);
    }
  }, [selectionKey]);

  // Görgetéskor is a panel tetején marad, hogy ne kelljen visszagörgetni a visszalépéshez.
  const back = (
    <div className="panel-sticky">
      <Button
        variant="ghost"
        size="sm"
        className="panel-back"
        aria-label={t('teacher.editor.panelBackLabel')}
        onPress={() => onSelect(null)}
      >
        <Icon name="back" size={16} />
        {t('teacher.editor.panelBack')}
      </Button>
    </div>
  );

  if (selection?.kind === 'background' && bg) {
    return (
      <section className="panel-sections" aria-labelledby="bg-detail">
        {back}
        <h2 id="bg-detail" ref={detailHeading as RefObject<HTMLHeadingElement>} tabIndex={-1} className="panel-detail-title">
          <span className="panel-row-icon" aria-hidden="true">
            <Icon name="music" size={16} />
          </span>
          {t('teacher.editor.background.detailTitle')}
        </h2>
        <fieldset disabled={readOnly} className="plain-fieldset panel-fieldset">
          <div className="panel-field">
            <span className="panel-label">{t('teacher.editor.fields.sound')}</span>
            <SoundCard
              sound={bg}
              loops
              action={
                <Button size="sm" variant="secondary" onPress={() => onPickSound('background')}>
                  {t('teacher.editor.sound.replace')}
                </Button>
              }
            />
          </div>
          <VolumeSlider
            id="bg-volume"
            value={project.backgroundVolume}
            onChange={onBackgroundVolume}
            help={t('teacher.editor.background.help')}
          />
          <div className="panel-danger-zone">
            <Button size="sm" variant="danger-soft" onPress={onRemoveBackground}>
              {t('teacher.editor.background.removeLong')}
            </Button>
          </div>
        </fieldset>
      </section>
    );
  }

  if (field) {
    const index = project.fields.indexOf(field);
    return (
      <section className="panel-sections" aria-labelledby="field-detail">
        {back}
        {/* A cím maga a név: itt lehet átírni, nincs külön Név mező. */}
        <h2 id="field-detail" className="sr-only">
          {t('teacher.editor.fields.detailTitle')}
        </h2>
        <fieldset disabled={readOnly} className="plain-fieldset panel-fieldset">
          <TextField value={field.name} onChange={(name) => onFieldChange(field.id, { name })} className="title-field">
            <Label className="sr-only">{t('teacher.editor.fields.nameLabel')}</Label>
            <div className="title-field-row">
              <span className="field-swatch" style={{ '--c': fieldColorVar(index) } as CSSProperties} aria-hidden="true" />
              <Input
                ref={detailHeading as RefObject<HTMLInputElement>}
                placeholder={t('teacher.editor.fields.untitled')}
                className="title-input"
              />
            </div>
            <Description>{t('teacher.editor.fields.nameHelp')}</Description>
          </TextField>
          {field.polygons.length === 0 && <p className="panel-hint">{t('teacher.editor.fields.shapeHint')}</p>}
          <div className="panel-field">
            <span className="panel-label">{t('teacher.editor.fields.sound')}</span>
            {field.sound ? (
              <SoundCard
                sound={field.sound}
                action={
                  <Button size="sm" variant="secondary" onPress={() => onPickSound(field.id)}>
                    {t('teacher.editor.sound.replace')}
                  </Button>
                }
              />
            ) : (
              <AddTile label={t('teacher.editor.fields.addSound')} onPress={() => onPickSound(field.id)} />
            )}
          </div>
          <VolumeSlider id="field-volume" value={field.volume} onChange={(volume) => onFieldChange(field.id, { volume })} />
          <TextField value={field.description} onChange={(description) => onFieldChange(field.id, { description })} fullWidth>
            <Label>{t('teacher.editor.fields.description')}</Label>
            <TextArea rows={3} />
            <Description>{t('teacher.editor.fields.descriptionHelp')}</Description>
          </TextField>
          <VoiceRecorder
            key={field.id}
            sound={field.descriptionSound}
            fieldName={field.name}
            userId={userId}
            onChange={(s) => onFieldVoice(field.id, s)}
          />
          <VolumeSlider
            id="field-softness"
            label={t('teacher.editor.fields.softness')}
            value={field.softness}
            onChange={(softness) => onFieldChange(field.id, { softness })}
            help={t('teacher.editor.fields.softnessHelp')}
          />
          <div className="panel-danger-zone">
            <Button size="sm" variant="danger-soft" onPress={() => onDeleteField(field)}>
              {t('teacher.editor.fields.deleteField')}
            </Button>
          </div>
        </fieldset>
      </section>
    );
  }

  return (
    <div className="panel-sections">
      <section className="panel-section" aria-labelledby="bg-title">
        <div className="panel-section-head">
          <h2 id="bg-title">{t('teacher.editor.background.title')}</h2>
        </div>
        {bg ? (
          <ListBox aria-labelledby="bg-title" selectionMode="none" onAction={() => onSelect({ kind: 'background' })} className="panel-list">
            <ListBox.Item id="background" textValue={bg.title}>
              <span className="panel-row-icon" aria-hidden="true">
                <Icon name="music" size={16} />
              </span>
              <span className="panel-row-text">
                <span className="panel-row-title">{bg.title}</span>
                <span className="panel-row-sub">
                  {t('teacher.editor.background.volumeShort', { n: Math.round(project.backgroundVolume * 100) })}
                </span>
              </span>
              <Icon name="chevron" size={16} />
            </ListBox.Item>
          </ListBox>
        ) : (
          <>
            <AddTile label={t('teacher.editor.background.add')} onPress={() => onPickSound('background')} isDisabled={readOnly} />
            <p className="panel-help">{t('teacher.editor.background.required')}</p>
          </>
        )}
      </section>

      <section className="panel-section" aria-labelledby="fields-title">
        <div className="panel-section-head">
          <h2 id="fields-title">{t('teacher.editor.fields.title')}</h2>
          <Button variant="secondary" size="sm" onPress={onAddField} isDisabled={readOnly}>
            <Icon name="plus" size={16} />
            {t('teacher.editor.fields.add')}
          </Button>
        </div>
        {project.fields.length === 0 ? (
          <p className="panel-help">{t('teacher.editor.fields.empty')}</p>
        ) : (
          <ListBox
            aria-labelledby="fields-title"
            selectionMode="none"
            onAction={(key) => onSelect({ kind: 'field', id: String(key) })}
            className="panel-list"
          >
            {project.fields.map((f, i) => (
              <ListBox.Item key={f.id} id={f.id} textValue={fieldName(f)}>
                <span className="field-swatch" style={{ '--c': fieldColorVar(i) } as CSSProperties} aria-hidden="true" />
                <span className="panel-row-text">
                  <span className="panel-row-title">{fieldName(f)}</span>
                  {f.sound && <span className="panel-row-sub">{f.sound.title}</span>}
                </span>
                {!f.sound && (
                  <Chip size="sm" color="warning" variant="soft">
                    {t('teacher.editor.fields.noSound')}
                  </Chip>
                )}
                {f.polygons.length === 0 && (
                  <Chip size="sm" color="warning" variant="soft">
                    {t('teacher.editor.fields.noShape')}
                  </Chip>
                )}
                <Icon name="chevron" size={16} />
              </ListBox.Item>
            ))}
          </ListBox>
        )}
      </section>
    </div>
  );
}

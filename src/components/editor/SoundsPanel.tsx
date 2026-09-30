import type { CSSProperties } from 'react';
import { Button, Description, Input, Label, Slider, TextArea, TextField } from '@heroui/react';
import type { EditorField, EditorProject, EditorSound } from '../../lib/editor';
import { t } from '../../lib/i18n';
import { Icon } from '../Icon';
import { fieldColorVar } from './DrawingCanvas';
import { SoundCard } from './SoundCard';
import { VoiceRecorder } from './VoiceRecorder';

export type Selection = { kind: 'background' } | { kind: 'field'; id: string } | null;

function VolumeSlider({ id, value, onChange, help }: { id: string; value: number; onChange: (v: number) => void; help?: string }) {
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
          <Label>{t('teacher.editor.fields.volume')}</Label>
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

function AddTile({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <button type="button" className="add-tile add-tile--row" onClick={onPress}>
      <Icon name="plus" />
      <span>{label}</span>
    </button>
  );
}

/** Hangok fül (11, 11b): háttérhang, hangmezők listája, a kijelölt elem beállításai. */
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
}: {
  project: EditorProject;
  selection: Selection;
  onSelect: (s: Selection) => void;
  userId: string;
  onAddField: () => void;
  onPickSound: (target: 'background' | string) => void;
  onBackgroundVolume: (v: number) => void;
  onRemoveBackground: () => void;
  onFieldChange: (id: string, patch: Partial<Pick<EditorField, 'name' | 'description' | 'volume'>>) => void;
  onFieldVoice: (id: string, sound: EditorSound | null) => void;
  onDeleteField: (field: EditorField) => void;
}) {
  const bg = project.background;
  const field = selection?.kind === 'field' ? project.fields.find((f) => f.id === selection.id) ?? null : null;
  const fieldName = (f: EditorField) => f.name.trim() || t('teacher.editor.fields.untitled');

  return (
    <div className="panel-sections">
      <section className="panel-section" aria-labelledby="bg-title">
        <div className="panel-section-head">
          <h2 id="bg-title">{t('teacher.editor.background.title')}</h2>
        </div>
        {bg ? (
          <ul className="panel-list">
            <li>
              <button
                type="button"
                className="panel-row"
                aria-pressed={selection?.kind === 'background'}
                onClick={() => onSelect({ kind: 'background' })}
              >
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
              </button>
            </li>
          </ul>
        ) : (
          <>
            <AddTile label={t('teacher.editor.background.add')} onPress={() => onPickSound('background')} />
            <p className="panel-help">{t('teacher.editor.background.required')}</p>
          </>
        )}
      </section>

      <section className="panel-section" aria-labelledby="fields-title">
        <div className="panel-section-head">
          <h2 id="fields-title">{t('teacher.editor.fields.title')}</h2>
          <Button variant="outline" size="sm" onPress={onAddField}>
            <Icon name="plus" size={16} />
            {t('teacher.editor.fields.add')}
          </Button>
        </div>
        {project.fields.length === 0 ? (
          <p className="panel-help">{t('teacher.editor.fields.empty')}</p>
        ) : (
          <ul className="panel-list">
            {project.fields.map((f, i) => (
              <li key={f.id}>
                <button
                  type="button"
                  className="panel-row"
                  aria-pressed={field?.id === f.id}
                  onClick={() => onSelect({ kind: 'field', id: f.id })}
                >
                  <span className="field-swatch" style={{ '--c': fieldColorVar(i) } as CSSProperties} aria-hidden="true" />
                  <span className="panel-row-text">
                    <span className="panel-row-title">{fieldName(f)}</span>
                    {f.sound && <span className="panel-row-sub">{f.sound.title}</span>}
                  </span>
                  {!f.sound && <span className="chip chip--warning">{t('teacher.editor.fields.noSound')}</span>}
                  {f.polygons.length === 0 && <span className="chip chip--warning">{t('teacher.editor.fields.noShape')}</span>}
                  <Icon name="chevron" size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {selection?.kind === 'background' && bg && (
        <section className="panel-section panel-detail" aria-labelledby="bg-detail">
          <div className="panel-section-head">
            <h2 id="bg-detail">{t('teacher.editor.background.settings')}</h2>
            <Button size="sm" className="button--danger-soft" onPress={onRemoveBackground}>
              {t('teacher.editor.background.remove')}
            </Button>
          </div>
          <div className="panel-field">
            <span className="panel-label">{t('teacher.editor.fields.sound')}</span>
            <SoundCard
              sound={bg}
              loops
              action={
                <Button size="sm" variant="outline" onPress={() => onPickSound('background')}>
                  {t('teacher.editor.sound.replace')}
                </Button>
              }
            />
          </div>
          <VolumeSlider id="bg-volume" value={project.backgroundVolume} onChange={onBackgroundVolume} help={t('teacher.editor.background.help')} />
        </section>
      )}

      {field && (
        <section className="panel-section panel-detail" aria-labelledby="field-detail">
          <div className="panel-section-head">
            <h2 id="field-detail">{fieldName(field)}</h2>
            <Button size="sm" className="button--danger-soft" onPress={() => onDeleteField(field)}>
              {t('teacher.editor.fields.delete')}
            </Button>
          </div>
          {field.polygons.length === 0 && <p className="panel-hint">{t('teacher.editor.fields.shapeHint')}</p>}
          <TextField value={field.name} onChange={(name) => onFieldChange(field.id, { name })} className="auth-field">
            <Label>{t('teacher.editor.fields.name')}</Label>
            <Input />
            <Description>{t('teacher.editor.fields.nameHelp')}</Description>
          </TextField>
          <TextField value={field.description} onChange={(description) => onFieldChange(field.id, { description })} className="auth-field">
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
          <div className="panel-field">
            <span className="panel-label">{t('teacher.editor.fields.sound')}</span>
            {field.sound ? (
              <SoundCard
                sound={field.sound}
                action={
                  <Button size="sm" variant="outline" onPress={() => onPickSound(field.id)}>
                    {t('teacher.editor.sound.replace')}
                  </Button>
                }
              />
            ) : (
              <AddTile label={t('teacher.editor.fields.addSound')} onPress={() => onPickSound(field.id)} />
            )}
          </div>
          <VolumeSlider id="field-volume" value={field.volume} onChange={(volume) => onFieldChange(field.id, { volume })} />
        </section>
      )}
    </div>
  );
}

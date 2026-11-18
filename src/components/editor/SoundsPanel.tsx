import { useEffect, useRef, type CSSProperties, type ReactNode, type RefObject } from 'react';
import { Button, Chip, Description, Input, Label, ListBox, Slider, TextArea, TextField } from '@heroui/react';
import type { EditorField, EditorLayer, EditorProject, EditorSound } from '../../lib/editor';
import type { Guide } from '../../lib/onboarding';
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
  label?: ReactNode;
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

function AddTile({
  label,
  onPress,
  isDisabled,
  className,
}: {
  label: string;
  onPress: () => void;
  isDisabled?: boolean;
  className?: string;
}) {
  return (
    <Button variant="tertiary" fullWidth onPress={onPress} isDisabled={isDisabled} className={className}>
      <Icon name="plus" />
      {label}
    </Button>
  );
}

/**
 * Hangrétegek (döntésnapló, 2026-11-18): egyszerre szólnak, mindegyik saját hangerővel. Rétegenként csere,
 * hangerő és eltávolítás; alul új réteg hozzáadása.
 */
function LayerList({
  id,
  layers,
  loops = false,
  readOnly,
  addLabel,
  addClass,
  onPick,
  onVolume,
  onRemove,
}: {
  id: string;
  layers: EditorLayer[];
  loops?: boolean;
  readOnly: boolean;
  addLabel: string;
  addClass?: string;
  onPick: (index: number | null) => void;
  onVolume: (index: number, volume: number) => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div className="panel-field">
      <span className="panel-label">{t('teacher.editor.layers.title')}</span>
      {layers.length > 0 && (
        <ul className="layer-list">
          {layers.map((l, i) => (
            <li key={`${l.sound.id}-${i}`} className="layer">
              <SoundCard
                sound={l.sound}
                loops={loops}
                action={
                  <Button size="sm" variant="secondary" onPress={() => onPick(i)}>
                    {t('teacher.editor.sound.replace')}
                  </Button>
                }
              />
              <div className="layer-controls">
                <VolumeSlider
                  id={`${id}-volume-${i}`}
                  value={l.volume}
                  onChange={(v) => onVolume(i, v)}
                  label={
                    <>
                      {t('teacher.editor.fields.volume')}
                      <span className="sr-only">: {l.sound.title}</span>
                    </>
                  }
                />
                <Button
                  size="sm"
                  variant="ghost"
                  isIconOnly
                  aria-label={t('teacher.editor.layers.removeLabel', { title: l.sound.title })}
                  onPress={() => onRemove(i)}
                >
                  <Icon name="trash" size={16} />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <AddTile
        label={layers.length ? t('teacher.editor.layers.addMore') : addLabel}
        onPress={() => onPick(null)}
        isDisabled={readOnly}
        className={addClass}
      />
    </div>
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
  onLayerVolume,
  onRemoveLayer,
  onFieldChange,
  onFieldVoice,
  onDeleteField,
  readOnly = false,
  guide = null,
}: {
  project: EditorProject;
  selection: Selection;
  onSelect: (s: Selection) => void;
  userId: string;
  onAddField: () => void;
  /** Hangválasztó: új réteg (index: null) vagy a réteg hangjának cseréje. */
  onPickSound: (target: 'background' | string, index: number | null) => void;
  onLayerVolume: (target: 'background' | string, index: number, volume: number) => void;
  onRemoveLayer: (target: 'background' | string, index: number) => void;
  onFieldChange: (id: string, patch: Partial<Pick<EditorField, 'name' | 'description' | 'softness'>>) => void;
  onFieldVoice: (id: string, sound: EditorSound | null) => void;
  onDeleteField: (field: EditorField) => void;
  /** Minta: a listák és részletek megnézhetők, de nem módosíthatók. */
  readOnly?: boolean;
  /** Első lépések: a kék kerettel kiemelt elem. */
  guide?: { guide: Guide; field?: string } | null;
}) {
  const bgs = project.backgrounds;
  const titles = (layers: EditorLayer[]) => layers.map((l) => l.sound.title).join(', ');
  const field = selection?.kind === 'field' ? (project.fields.find((f) => f.id === selection.id) ?? null) : null;
  const fieldName = (f: EditorField) => f.name.trim() || t('teacher.editor.fields.untitled');
  const guideClass = (g: Guide) => (guide?.guide === g ? 'guide-target' : undefined);

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
  // A lefúrós nézet felső sora: vissza a listához, jobbra a nézet törlés gombja (ne a panel alján kelljen keresni).
  const back = (action?: ReactNode) => (
    <div className="panel-sticky panel-sticky-row">
      <Button
        variant="ghost"
        size="sm"
        className={`panel-back ${guideClass('back') ?? ''}`}
        aria-label={t('teacher.editor.panelBackLabel')}
        onPress={() => onSelect(null)}
      >
        <Icon name="back" size={16} />
        {t('teacher.editor.panelBack')}
      </Button>
      {action}
    </div>
  );

  if (selection?.kind === 'background') {
    return (
      <section className="panel-sections" aria-labelledby="bg-detail">
        {back()}
        <h2 id="bg-detail" ref={detailHeading as RefObject<HTMLHeadingElement>} tabIndex={-1} className="panel-detail-title">
          <span className="panel-row-icon" aria-hidden="true">
            <Icon name="music" size={16} />
          </span>
          {t('teacher.editor.background.detailTitle')}
        </h2>
        <fieldset disabled={readOnly} className="plain-fieldset panel-fieldset">
          <LayerList
            id="bg"
            layers={bgs}
            loops
            readOnly={readOnly}
            addLabel={t('teacher.editor.background.add')}
            onPick={(i) => onPickSound('background', i)}
            onVolume={(i, v) => onLayerVolume('background', i, v)}
            onRemove={(i) => onRemoveLayer('background', i)}
          />
          <p className="panel-help">{t('teacher.editor.background.help')}</p>
        </fieldset>
      </section>
    );
  }

  if (field) {
    const index = project.fields.indexOf(field);
    return (
      <section className="panel-sections" aria-labelledby="field-detail">
        {back(
          <Button
            size="sm"
            variant="danger-soft"
            isDisabled={readOnly}
            aria-label={t('teacher.editor.fields.deleteFieldLabel', { name: field.name || t('teacher.editor.fields.untitled') })}
            onPress={() => onDeleteField(field)}
          >
            <Icon name="trash" size={16} />
            {t('teacher.editor.fields.deleteShort')}
          </Button>,
        )}
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
                className={`title-input ${guideClass('name') ?? ''}`}
              />
            </div>
            <Description>{t('teacher.editor.fields.nameHelp')}</Description>
          </TextField>
          {field.polygons.length === 0 && <p className="panel-hint">{t('teacher.editor.fields.shapeHint')}</p>}
          <LayerList
            id="field"
            layers={field.sounds}
            readOnly={readOnly}
            addLabel={t('teacher.editor.fields.addSound')}
            addClass={field.sounds.length ? undefined : guideClass('add-sound')}
            onPick={(i) => onPickSound(field.id, i)}
            onVolume={(i, v) => onLayerVolume(field.id, i, v)}
            onRemove={(i) => onRemoveLayer(field.id, i)}
          />
          <TextField value={field.description} onChange={(description) => onFieldChange(field.id, { description })} fullWidth>
            <Label>{t('teacher.editor.fields.description')}</Label>
            <TextArea rows={3} className={guideClass('description')} />
            <Description>{t('teacher.editor.fields.descriptionHelp')}</Description>
          </TextField>
          <VoiceRecorder
            key={field.id}
            sound={field.descriptionSound}
            fieldName={field.name}
            userId={userId}
            onChange={(s) => onFieldVoice(field.id, s)}
          />
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
        {bgs.length ? (
          <ListBox aria-labelledby="bg-title" selectionMode="none" onAction={() => onSelect({ kind: 'background' })} className="panel-list">
            <ListBox.Item id="background" textValue={titles(bgs)}>
              <span className="panel-row-icon" aria-hidden="true">
                <Icon name="music" size={16} />
              </span>
              <span className="panel-row-text">
                <span className="panel-row-title">{titles(bgs)}</span>
                <span className="panel-row-sub">
                  {bgs.length > 1
                    ? t('teacher.editor.layers.count', { n: bgs.length })
                    : t('teacher.editor.background.volumeShort', { n: Math.round(bgs[0].volume * 100) })}
                </span>
              </span>
              <Icon name="chevron" size={16} />
            </ListBox.Item>
          </ListBox>
        ) : (
          <>
            <AddTile
              label={t('teacher.editor.background.add')}
              onPress={() => onPickSound('background', null)}
              isDisabled={readOnly}
              className={guideClass('add-background')}
            />
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
              <ListBox.Item
                key={f.id}
                id={f.id}
                textValue={fieldName(f)}
                className={guide?.guide === 'row' && guide.field === f.id ? 'guide-target' : undefined}
              >
                <span className="field-swatch" style={{ '--c': fieldColorVar(i) } as CSSProperties} aria-hidden="true" />
                {/* A hiányt jelző címkék a név alatt: a név így a teljes szélességet kapja, és nem csúszik rájuk. */}
                <span className="panel-row-text">
                  <span className="panel-row-title">{fieldName(f)}</span>
                  {f.sounds.length > 0 && <span className="panel-row-sub">{titles(f.sounds)}</span>}
                  {(!f.sounds.length || f.polygons.length === 0) && (
                    <span className="panel-row-chips">
                      {!f.sounds.length && (
                        <Chip size="sm" color="warning" variant="soft">
                          {t('teacher.editor.fields.noSound')}
                        </Chip>
                      )}
                      {f.polygons.length === 0 && (
                        <Chip size="sm" color="warning" variant="soft">
                          {t('teacher.editor.fields.noShape')}
                        </Chip>
                      )}
                    </span>
                  )}
                </span>
                <Icon name="chevron" size={16} />
              </ListBox.Item>
            ))}
          </ListBox>
        )}
      </section>
    </div>
  );
}

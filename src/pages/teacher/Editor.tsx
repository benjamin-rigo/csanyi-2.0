import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { Button, Label, Modal, Slider, Tabs, ToggleButton } from '@heroui/react';
import { DrawingCanvas, FIT, zoomAt, type Tool, type View } from '../../components/editor/DrawingCanvas';
import { SoundPicker } from '../../components/editor/SoundPicker';
import { SoundsPanel, type Selection } from '../../components/editor/SoundsPanel';
import { stopPreview } from '../../components/editor/SoundCard';
import { Icon } from '../../components/Icon';
import type { Config, Point } from '../../lib/data';
import {
  deleteField,
  insertField,
  loadProject,
  shapeOf,
  updateField,
  updateProject,
  useAutosave,
  type EditorField,
  type EditorProject,
  type EditorSound,
} from '../../lib/editor';
import { t } from '../../lib/i18n';
import { useSession } from '../../lib/supabase';

type Stroke = { fieldId: string; before: Point[][]; after: Point[][] };

export function Editor({ config }: { config: Config }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const session = useSession();
  const userId = session?.user.id;
  const [project, setProject] = useState<EditorProject | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading');
  const [selection, setSelection] = useState<Selection>(null);
  const [tool, setTool] = useState<Tool>('brush');
  const [size, setSize] = useState(config.editor.brushDefault);
  const [view, setView] = useState<View>(FIT);
  const [picker, setPicker] = useState<'background' | string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<EditorField | null>(null);
  const [history, setHistory] = useState<{ done: Stroke[]; undone: Stroke[] }>({ done: [], undone: [] });
  const { status, schedule, track } = useAutosave(config.editor.autosaveDelayMs);

  // A késleltetett mentés mindig a legfrissebb állapotot küldi.
  const projectRef = useRef(project);
  useEffect(() => {
    projectRef.current = project;
  }, [project]);

  useEffect(() => {
    if (!id || !userId) return;
    let alive = true;
    loadProject(id, userId)
      .then((p) => {
        if (!alive) return;
        setProject(p);
        setState(p ? 'ready' : 'missing');
      })
      .catch(() => alive && setState('error'));
    return () => {
      alive = false;
    };
  }, [id, userId]);

  useEffect(() => {
    document.title = t('teacher.editor.documentTitle', { title: project?.title ?? '' });
  }, [project?.title]);

  useEffect(() => stopPreview, []);

  const patchField = useCallback((fieldId: string, patch: Partial<EditorField>) => {
    setProject((p) => p && { ...p, fields: p.fields.map((f) => (f.id === fieldId ? { ...f, ...patch } : f)) });
  }, []);

  const saveFieldLater = useCallback(
    (fieldId: string) =>
      schedule(`field:${fieldId}`, () => {
        const f = projectRef.current?.fields.find((x) => x.id === fieldId);
        return f
          ? updateField(fieldId, { name: f.name, description: f.description, volume: f.volume, edge_softness: f.softness })
          : Promise.resolve();
      }),
    [schedule],
  );

  const setShape = useCallback(
    (fieldId: string, polygons: Point[][]) => {
      patchField(fieldId, { polygons });
      void track(updateField(fieldId, { shape: shapeOf(polygons) })).catch(() => undefined);
    },
    [patchField, track],
  );

  async function addField(polygons: Point[][] = []): Promise<string | null> {
    if (!project) return null;
    const sort = project.fields.reduce((m, f) => Math.max(m, f.sort + 1), 0);
    const fieldId = await track(insertField(project.id, sort));
    const field: EditorField = {
      id: fieldId,
      sort,
      name: '',
      description: '',
      polygons,
      sound: null,
      volume: 1,
      softness: config.editor.softnessDefault,
      descriptionSound: null,
    };
    setProject((p) => p && { ...p, fields: [...p.fields, field] });
    setSelection({ kind: 'field', id: fieldId });
    setTool('brush');
    if (polygons.length) setShape(fieldId, polygons);
    return fieldId;
  }

  async function onStroke(fieldId: string | null, polygons: Point[][]) {
    if (!project) return;
    if (!fieldId) {
      if (polygons.length) await addField(polygons).catch(() => null);
      return;
    }
    const before = project.fields.find((f) => f.id === fieldId)?.polygons ?? [];
    setShape(fieldId, polygons);
    setHistory((h) => ({ done: [...h.done, { fieldId, before, after: polygons }], undone: [] }));
  }

  function undo() {
    const stroke = history.done.at(-1);
    if (!stroke) return;
    setShape(stroke.fieldId, stroke.before);
    setHistory((h) => ({ done: h.done.slice(0, -1), undone: [...h.undone, stroke] }));
  }

  function redo() {
    const stroke = history.undone.at(-1);
    if (!stroke) return;
    setShape(stroke.fieldId, stroke.after);
    setHistory((h) => ({ done: [...h.done, stroke], undone: h.undone.slice(0, -1) }));
  }

  function onPickSound(sound: EditorSound) {
    if (!project || !picker) return;
    if (picker === 'background') {
      setProject({ ...project, background: sound });
      setSelection({ kind: 'background' });
      void track(updateProject(project.id, { background_sound_id: sound.id })).catch(() => undefined);
    } else {
      patchField(picker, { sound });
      void track(updateField(picker, { sound_id: sound.id })).catch(() => undefined);
    }
  }

  async function removeField(field: EditorField) {
    setConfirmDelete(null);
    setProject((p) => p && { ...p, fields: p.fields.filter((f) => f.id !== field.id) });
    setSelection(null);
    setHistory((h) => ({ done: h.done.filter((s) => s.fieldId !== field.id), undone: h.undone.filter((s) => s.fieldId !== field.id) }));
    await track(deleteField(field.id)).catch(() => undefined);
  }

  // Cmd/Ctrl + Z visszavon, Cmd/Ctrl + Shift + Z vagy Ctrl + Y újra. Szövegmezőben a szöveg saját visszavonása marad.
  const undoRef = useRef(undo);
  const redoRef = useRef(redo);
  useEffect(() => {
    undoRef.current = undo;
    redoRef.current = redo;
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || (e.target as HTMLElement).closest('input, textarea, [contenteditable]')) return;
      const key = e.key.toLowerCase();
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undoRef.current();
      } else if ((key === 'z' && e.shiftKey) || key === 'y') {
        e.preventDefault();
        redoRef.current();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Gombos nagyítás a rajzterület közepe körül.
  function zoomBy(factor: number) {
    const frame = document.querySelector('.draw-frame')?.getBoundingClientRect();
    const area = document.querySelector('.draw-viewport')?.getBoundingClientRect();
    if (!frame || !area) return;
    const zoom = Math.min(config.editor.zoomMax, Math.max(config.editor.zoomMin, view.zoom * factor));
    setView(zoomAt(view, frame, area.left + area.width / 2, area.top + area.height / 2, zoom));
  }

  if (state !== 'ready' || !project || !userId) {
    return (
      <main className="status-page" aria-busy={state === 'loading'}>
        <p role={state === 'loading' ? undefined : 'alert'}>
          {state === 'missing'
            ? t('teacher.editor.notFound')
            : state === 'error'
              ? t('teacher.editor.loadError')
              : t('teacher.editor.loading')}
        </p>
        {state !== 'loading' && (
          <Link to="/projektjeim" className="text-link">
            {t('teacher.editor.backToProjects')}
          </Link>
        )}
      </main>
    );
  }

  const selectedField = selection?.kind === 'field' ? (project.fields.find((f) => f.id === selection.id) ?? null) : null;
  const pickerTarget =
    picker === 'background'
      ? t('teacher.editor.background.pickerTarget')
      : t('teacher.editor.fields.pickerTarget', {
          name: project.fields.find((f) => f.id === picker)?.name.trim() || t('teacher.editor.fields.untitled'),
        });

  return (
    <div className="editor-page">
      <header className="editor-header">
        <nav aria-label={t('teacher.editor.breadcrumbLabel')} className="editor-breadcrumb">
          <Link to="/projektjeim" className="breadcrumb">
            <Icon name="back" size={16} />
            {t('teacher.editor.backToProjects')}
          </Link>
          <span aria-hidden="true" className="breadcrumb-sep">
            /
          </span>
          <h1>{project.title}</h1>
        </nav>
        <span role="status" className={`save-status save-status--${status}`}>
          <Icon name="cloud" size={16} />
          {t(`teacher.editor.status.${status}`)}
        </span>
        <div className="editor-actions">
          <Button variant="outline" onPress={() => navigate(`/kep/${project.id}`)}>
            <Icon name="eye" size={16} />
            {t('teacher.editor.preview')}
          </Button>
          <span className="soon-wrap">
            <Button isDisabled aria-describedby="share-soon">
              <Icon name="link" size={16} />
              {t('teacher.editor.share')}
            </Button>
            <span id="share-soon" className="soon-note">
              {t('teacher.editor.comingSoon')}
            </span>
          </span>
        </div>
      </header>

      <div className="editor-body">
        <main className="editor-stage">
          <div role="toolbar" aria-label={t('teacher.editor.toolbarLabel')} className="draw-toolbar">
            <ToggleButton isSelected={tool === 'brush'} onChange={() => setTool('brush')} className="tool-button">
              <Icon name="brush" size={16} />
              {t('teacher.editor.brush')}
            </ToggleButton>
            <ToggleButton isSelected={tool === 'eraser'} onChange={() => setTool('eraser')} className="tool-button">
              <Icon name="eraser" size={16} />
              {t('teacher.editor.eraser')}
            </ToggleButton>
            <span className="toolbar-sep" aria-hidden="true" />
            <Slider
              value={size}
              minValue={config.editor.brushMin}
              maxValue={config.editor.brushMax}
              onChange={(v) => setSize(v as number)}
              aria-label={t('teacher.editor.sizeLabel')}
              className="size-slider"
            >
              <Label>{t('teacher.editor.size')}</Label>
              <Slider.Track>
                <Slider.Fill />
                <Slider.Thumb />
              </Slider.Track>
            </Slider>
            <span className="toolbar-sep" aria-hidden="true" />
            <Button
              isIconOnly
              variant="ghost"
              aria-label={t('teacher.editor.zoom.out')}
              isDisabled={view.zoom <= config.editor.zoomMin}
              onPress={() => zoomBy(1 / config.editor.zoomStep)}
            >
              <Icon name="minus" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="zoom-level"
              aria-label={t('teacher.editor.zoom.fit', { n: Math.round(view.zoom * 100) })}
              aria-describedby="zoom-hint"
              onPress={() => setView(FIT)}
            >
              {Math.round(view.zoom * 100)}%
            </Button>
            <Button
              isIconOnly
              variant="ghost"
              aria-label={t('teacher.editor.zoom.in')}
              isDisabled={view.zoom >= config.editor.zoomMax}
              onPress={() => zoomBy(config.editor.zoomStep)}
            >
              <Icon name="plus" />
            </Button>
            <span className="toolbar-sep" aria-hidden="true" />
            <Button isIconOnly variant="ghost" aria-label={t('teacher.editor.undo')} isDisabled={!history.done.length} onPress={undo}>
              <Icon name="undo" />
            </Button>
            <Button isIconOnly variant="ghost" aria-label={t('teacher.editor.redo')} isDisabled={!history.undone.length} onPress={redo}>
              <Icon name="redo" />
            </Button>
          </div>
          <p className="canvas-hint">
            {selectedField
              ? t('teacher.editor.canvasHintSelected')
              : t('teacher.editor.canvasHintNew')}
            <span id="zoom-hint" className="canvas-hint-zoom">
              {t('teacher.editor.zoom.hint')}
            </span>
          </p>
          <div className="draw-area">
            <DrawingCanvas
              imagePath={project.imagePath}
              imageWidth={project.imageWidth}
              imageHeight={project.imageHeight}
              fields={project.fields}
              selectedId={selectedField?.id ?? null}
              tool={tool}
              size={size}
              onStroke={(fid, polygons) => void onStroke(fid, polygons)}
              onSelectField={(fid) => setSelection({ kind: 'field', id: fid })}
              view={view}
              onView={setView}
              zoomLimits={{ min: config.editor.zoomMin, max: config.editor.zoomMax }}
            />
          </div>
        </main>

        <aside className="editor-panel" aria-label={t('teacher.editor.panelLabel')}>
          <Tabs selectedKey="sounds" className="segmented">
            <Tabs.ListContainer>
              <Tabs.List aria-label={t('teacher.editor.tabsLabel')}>
                <Tabs.Tab id="project" isDisabled aria-describedby="tabs-soon">
                  {t('teacher.editor.tabs.project')}
                  <Tabs.Indicator />
                </Tabs.Tab>
                <Tabs.Tab id="sounds">
                  {t('teacher.editor.tabs.sounds')}
                  <Tabs.Indicator />
                </Tabs.Tab>
                <Tabs.Tab id="share" isDisabled aria-describedby="tabs-soon">
                  {t('teacher.editor.tabs.share')}
                  <Tabs.Indicator />
                </Tabs.Tab>
              </Tabs.List>
            </Tabs.ListContainer>
            <p id="tabs-soon" className="soon-note">
              {t('teacher.editor.tabsSoon')}
            </p>
            <Tabs.Panel id="project">{null}</Tabs.Panel>
            <Tabs.Panel id="sounds">
              <SoundsPanel
                project={project}
                selection={selection}
                onSelect={setSelection}
                userId={userId}
                onAddField={() => void addField().catch(() => undefined)}
                onPickSound={setPicker}
                onBackgroundVolume={(v) => {
                  setProject((p) => p && { ...p, backgroundVolume: v });
                  schedule('background-volume', () =>
                    updateProject(project.id, { background_volume: projectRef.current!.backgroundVolume }),
                  );
                }}
                onRemoveBackground={() => {
                  setProject((p) => p && { ...p, background: null });
                  setSelection(null);
                  void track(updateProject(project.id, { background_sound_id: null })).catch(() => undefined);
                }}
                onFieldChange={(fid, patch) => {
                  patchField(fid, patch);
                  saveFieldLater(fid);
                }}
                onFieldVoice={(fid, sound) => {
                  patchField(fid, { descriptionSound: sound });
                  void track(updateField(fid, { description_sound_id: sound?.id ?? null })).catch(() => undefined);
                }}
                onDeleteField={setConfirmDelete}
              />
            </Tabs.Panel>
            <Tabs.Panel id="share">{null}</Tabs.Panel>
          </Tabs>
        </aside>
      </div>

      <SoundPicker
        isOpen={picker !== null}
        onOpenChange={(open) => !open && setPicker(null)}
        target={pickerTarget}
        userId={userId}
        maxMb={config.upload.soundMaxMb}
        onPick={onPickSound}
      />

      <Modal>
        <Modal.Backdrop isOpen={confirmDelete !== null} onOpenChange={(open) => !open && setConfirmDelete(null)} className="modal-backdrop">
          <Modal.Container className="modal-container">
            <Modal.Dialog className="modal-dialog modal-dialog--small" role="alertdialog">
              <Modal.Header className="modal-header">
                <div className="modal-heading">
                  <Modal.Heading>{t('teacher.editor.fields.deleteConfirmTitle')}</Modal.Heading>
                  <p>
                    {t('teacher.editor.fields.deleteConfirmText', {
                      name: confirmDelete?.name.trim() || t('teacher.editor.fields.untitled'),
                    })}
                  </p>
                </div>
              </Modal.Header>
              <Modal.Footer className="modal-footer">
                <Button variant="outline" slot="close">
                  {t('teacher.editor.fields.cancel')}
                </Button>
                <Button className="button--danger" onPress={() => confirmDelete && void removeField(confirmDelete)}>
                  {t('teacher.editor.fields.deleteConfirm')}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
  );
}

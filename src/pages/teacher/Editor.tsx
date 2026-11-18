import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Breadcrumbs, Button, Chip, Link, Modal, Separator, Slider, Tabs, ToggleButton, ToggleButtonGroup, Toolbar } from '@heroui/react';
import { DrawingCanvas, FIT, zoomAt, type Tool, type View } from '../../components/editor/DrawingCanvas';
import { SoundPicker } from '../../components/editor/SoundPicker';
import { SoundsPanel, type Selection } from '../../components/editor/SoundsPanel';
import { stopPreview } from '../../components/editor/SoundCard';
import { Icon } from '../../components/Icon';
import { ButtonLink } from '../../components/SiteHeader';
import type { Config, Point } from '../../lib/data';
import { OnboardingPanel } from '../../components/editor/OnboardingPanel';
import { ProjectPanel, type ProjectTextPatch } from '../../components/editor/ProjectPanel';
import { SharePanel } from '../../components/editor/SharePanel';
import {
  deleteField,
  deleteProject,
  insertField,
  layerRows,
  loadCategories,
  loadProject,
  setProjectCategories,
  restoreField,
  shapeOf,
  updateField,
  updateProject,
  useAutosave,
  type CategoryOption,
  type EditorField,
  type EditorLayer,
  type EditorProject,
  type EditorSound,
  type Missing,
  type Visibility,
} from '../../lib/editor';
import {
  EMPTY_HISTORY,
  fieldPatch,
  pickField,
  pickProject,
  projectPatch,
  record,
  type Change,
  type FieldValues,
  type History,
  type ProjectValues,
} from '../../lib/history';
import { completeOnboarding, guideTarget, practiceSteps, startPractice, useOnboarding } from '../../lib/onboarding';
import { uploadFile } from '../../lib/teacher';
import { t } from '../../lib/i18n';
import { useSession } from '../../lib/supabase';

/** Szerkesztő (11). projectId nélkül a címből jön; a minta (/minta) csak megtekinthető, mellette az Első lépések. */
/** A hangrétegek gazdája: a háttér vagy egy hangmező azonosítója. */
type LayerTarget = 'background' | string;

export function Editor({ config, projectId }: { config: Config; projectId?: string }) {
  const params = useParams();
  const id = projectId ?? params.id;
  const [onboarding, reloadOnboarding] = useOnboarding();
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState(false);
  const navigate = useNavigate();
  const session = useSession();
  const userId = session?.user.id;
  const [project, setProject] = useState<EditorProject | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading');
  const [selection, setSelection] = useState<Selection>(null);
  const [tool, setTool] = useState<Tool>('brush');
  const [size, setSize] = useState(config.editor.brushDefault);
  const [view, setView] = useState<View>(FIT);
  // A hangválasztó célja: a háttér vagy egy hangmező rétegei; index: a cserélt réteg, null: új réteg.
  const [picker, setPicker] = useState<{ target: LayerTarget; index: number | null } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<EditorField | null>(null);
  const [confirmProjectDelete, setConfirmProjectDelete] = useState(false);
  const [tab, setTab] = useState<'project' | 'sounds' | 'share'>('sounds');
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [shareError, setShareError] = useState(false);
  const [history, setHistory] = useState<History>(EMPTY_HISTORY);
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
          ? updateField(fieldId, { name: f.name, description: f.description, edge_softness: f.softness })
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
      sounds: [],
      softness: config.editor.softnessDefault,
      descriptionSound: null,
    };
    setProject((p) => p && { ...p, fields: [...p.fields, field] });
    setSelection({ kind: 'field', id: fieldId });
    setTool((t) => (t === 'eraser' ? 'brush' : t));
    if (polygons.length) setShape(fieldId, polygons);
    setHistory((h) => record(h, { kind: 'create', field, at: Date.now() }));
    return fieldId;
  }

  /** Visszavonható módosítás egy hangmezőn; a mentést a hívó végzi (azonnal vagy késleltetve). */
  function recordField(fieldId: string, after: FieldValues) {
    const f = projectRef.current?.fields.find((x) => x.id === fieldId);
    if (!f) return;
    const before = pickField(f, Object.keys(after) as (keyof FieldValues)[]);
    setHistory((h) => record(h, { kind: 'field', fieldId, before, after, at: Date.now() }));
  }

  function recordProject(after: ProjectValues) {
    const p = projectRef.current;
    if (!p) return;
    const before = pickProject(p, Object.keys(after) as (keyof ProjectValues)[]);
    setHistory((h) => record(h, { kind: 'project', before, after, at: Date.now() }));
  }

  function applyField(fieldId: string, values: FieldValues) {
    patchField(fieldId, values);
    void track(updateField(fieldId, fieldPatch(values))).catch(() => undefined);
  }

  function applyProject(values: ProjectValues) {
    setProject((p) => p && { ...p, ...values });
    void track(updateProject(project!.id, projectPatch(values))).catch(() => undefined);
  }

  function dropField(fieldId: string) {
    setProject((p) => p && { ...p, fields: p.fields.filter((f) => f.id !== fieldId) });
    setSelection((s) => (s?.kind === 'field' && s.id === fieldId ? null : s));
    void track(deleteField(fieldId)).catch(() => undefined);
  }

  function bringBackField(field: EditorField) {
    setProject((p) => p && { ...p, fields: [...p.fields, field].sort((a, b) => a.sort - b.sort) });
    setSelection({ kind: 'field', id: field.id });
    void track(restoreField(project!.id, field)).catch(() => undefined);
  }

  function applyChange(change: Change, direction: 'undo' | 'redo') {
    const values = direction === 'undo' ? 'before' : 'after';
    if (change.kind === 'field') applyField(change.fieldId, change[values]);
    else if (change.kind === 'project') applyProject(change[values]);
    else if ((change.kind === 'create') === (direction === 'undo')) dropField(change.field.id);
    else bringBackField(change.field);
  }

  async function onStroke(fieldId: string | null, polygons: Point[][]) {
    if (!project) return;
    if (!fieldId) {
      if (polygons.length) await addField(polygons).catch(() => null);
      return;
    }
    recordField(fieldId, { polygons });
    setShape(fieldId, polygons);
  }

  function undo() {
    const change = history.done.at(-1);
    if (!change) return;
    applyChange(change, 'undo');
    setHistory((h) => ({ done: h.done.slice(0, -1), undone: [...h.undone, change] }));
  }

  function redo() {
    const change = history.undone.at(-1);
    if (!change) return;
    applyChange(change, 'redo');
    setHistory((h) => ({ done: [...h.done, change], undone: h.undone.slice(0, -1) }));
  }

  /** Hangrétegek: a háttérhang vagy egy hangmező rétegei (egyszerre szólnak, mindegyik saját hangerővel). */
  const layersOf = (target: LayerTarget): EditorLayer[] =>
    target === 'background'
      ? (projectRef.current?.backgrounds ?? [])
      : (projectRef.current?.fields.find((f) => f.id === target)?.sounds ?? []);

  function showLayers(target: LayerTarget, layers: EditorLayer[]) {
    if (target === 'background') setProject((p) => p && { ...p, backgrounds: layers });
    else patchField(target, { sounds: layers });
  }

  const saveLayers = (target: LayerTarget, layers: EditorLayer[]) =>
    target === 'background'
      ? updateProject(project!.id, { background_layers: layerRows(layers) })
      : updateField(target, { sound_layers: layerRows(layers) });

  function rememberLayers(target: LayerTarget, before: EditorLayer[], after: EditorLayer[]) {
    const at = Date.now();
    setHistory((h) =>
      record(
        h,
        target === 'background'
          ? { kind: 'project', before: { backgrounds: before }, after: { backgrounds: after }, at }
          : { kind: 'field', fieldId: target, before: { sounds: before }, after: { sounds: after }, at },
      ),
    );
  }

  /** Visszavonható módosítás a rétegeken; a hangerő-csúszka késleltetve ment, a többi azonnal. */
  function changeLayers(target: LayerTarget, next: EditorLayer[], later = false) {
    rememberLayers(target, layersOf(target), next);
    showLayers(target, next);
    if (later) schedule(`layers:${target}`, () => saveLayers(target, layersOf(target)));
    else void track(saveLayers(target, next)).catch(() => undefined);
  }

  const onLayerVolume = (target: LayerTarget, index: number, volume: number) =>
    changeLayers(
      target,
      layersOf(target).map((l, i) => (i === index ? { ...l, volume } : l)),
      true,
    );

  const onRemoveLayer = (target: LayerTarget, index: number) =>
    changeLayers(
      target,
      layersOf(target).filter((_, i) => i !== index),
    );

  /**
   * Hang kiválasztása: új réteg (index: null) vagy egy réteg hangjának cseréje. A könyvtári hang azonnal megjelenik
   * (a Freesound előhallgatásával), a saját tárhelyre másolat a háttérben készül; az adatbázisba csak a kész másolat
   * kerül. Ha közben a réteget megváltoztatják, a késő másolat nem írja felül; ha a másolás nem sikerül, a réteg visszaáll.
   */
  function onPickSound(sound: EditorSound, copy?: Promise<EditorSound>) {
    if (!project || !picker) return;
    const { target, index } = picker;
    const before = layersOf(target);
    const pos = index ?? before.length;
    const volume = index !== null ? before[index].volume : target === 'background' ? config.editor.backgroundVolumeDefault : 1;
    const place = (list: EditorLayer[], s: EditorSound) =>
      index === null && list.length === pos ? [...list, { sound: s, volume }] : list.map((l, i) => (i === pos ? { ...l, sound: s } : l));

    const shown = place(before, sound);
    showLayers(target, shown);
    if (target === 'background') setSelection({ kind: 'background' });
    if (!copy) {
      rememberLayers(target, before, shown);
      void track(saveLayers(target, shown)).catch(() => undefined);
      return;
    }
    const stillThere = () => layersOf(target)[pos]?.sound.id === sound.id;
    void track(
      copy.then(async (copied) => {
        if (!stillThere()) return;
        const next = place(layersOf(target), copied);
        showLayers(target, next);
        rememberLayers(target, before, next);
        await saveLayers(target, next);
      }),
    ).catch(() => {
      if (!stillThere()) return;
      const now = layersOf(target);
      showLayers(target, index === null ? now.filter((_, i) => i !== pos) : now.map((l, i) => (i === pos ? before[pos] : l)));
    });
  }

  useEffect(() => {
    void loadCategories()
      .then(setCategories)
      .catch(() => undefined);
  }, []);

  function onProjectText(patch: ProjectTextPatch) {
    recordProject(patch);
    setProject((p) => p && { ...p, ...patch });
    schedule('project-text', () => {
      const p = projectRef.current!;
      return updateProject(p.id, { title: p.title, short_description: p.shortDescription, author: p.author });
    });
  }

  function onCategories(ids: string[]) {
    if (!project) return;
    setProject({ ...project, categories: ids });
    void track(setProjectCategories(project.id, ids)).catch(() => undefined);
  }

  /** Képcsere: a hangmezők a kép saját pixeleiben vannak, ezért arányosan az új méretre kerülnek. */
  async function onReplaceImage(file: File) {
    if (!project || !userId) return;
    const bitmap = await createImageBitmap(file);
    const { width, height } = bitmap;
    bitmap.close();
    const imagePath = await track(uploadFile('images', userId, file, file.type.split('/')[1].replace('jpeg', 'jpg')));
    const sx = width / project.imageWidth;
    const sy = height / project.imageHeight;
    const fields = project.fields.map((f) => ({
      ...f,
      polygons: f.polygons.map((pts) => pts.map(([x, y]) => [x * sx, y * sy] as Point)),
    }));
    setProject({ ...project, imagePath, imageWidth: width, imageHeight: height, fields });
    setHistory(EMPTY_HISTORY);
    await track(
      Promise.all([
        updateProject(project.id, { image_path: imagePath, image_width: width, image_height: height }),
        ...fields.map((f) => updateField(f.id, { shape: shapeOf(f.polygons) })),
      ]),
    );
  }

  function onVisibility(visibility: Visibility) {
    if (!project) return;
    const previous = project.visibility;
    setShareError(false);
    // Galériába tételkor az adatbázis törli az admin levételi megjegyzését.
    setProject({ ...project, visibility, moderationNote: visibility === 'gallery' ? null : project.moderationNote });
    // A galériához az adatbázis is ellenőrzi a feltételeket; ha elutasítja, visszaállunk.
    track(updateProject(project.id, { visibility })).catch(() => {
      setShareError(true);
      setProject((p) => p && { ...p, visibility: previous });
    });
  }

  /** A hiányzó tételek odavisznek, ahol pótolni lehet (döntésnapló). */
  function goToMissing(m: Missing) {
    const focus = (id: string) => requestAnimationFrame(() => document.getElementById(id)?.focus());
    if (m.kind === 'image' || m.kind === 'title') {
      setTab('project');
      focus('project-title');
    } else if (m.kind === 'shortDescription') {
      setTab('project');
      focus('project-short-description');
    } else if (m.kind === 'background' || m.kind === 'fields') {
      setTab('sounds');
      setSelection(null);
    } else if ('fieldId' in m) {
      setTab('sounds');
      setSelection({ kind: 'field', id: m.fieldId });
    }
  }

  async function removeProject() {
    if (!project) return;
    setConfirmProjectDelete(false);
    await track(deleteProject(project.id)).catch(() => undefined);
    navigate('/projektjeim', { replace: true });
  }

  async function removeField(field: EditorField) {
    setConfirmDelete(null);
    const current = projectRef.current?.fields.find((f) => f.id === field.id) ?? field;
    setHistory((h) => record(h, { kind: 'delete', field: current, at: Date.now() }));
    dropField(field.id);
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
        {state !== 'loading' && <Link href="/projektjeim">{t('teacher.editor.backToProjects')}</Link>}
      </main>
    );
  }

  const selectedField = selection?.kind === 'field' ? (project.fields.find((f) => f.id === selection.id) ?? null) : null;

  function changeField(fid: string, patch: Partial<Pick<EditorField, 'name' | 'description' | 'softness'>>) {
    recordField(fid, patch);
    patchField(fid, patch);
    saveFieldLater(fid);
  }
  const pickerTarget =
    picker?.target === 'background'
      ? t('teacher.editor.background.pickerTarget')
      : t('teacher.editor.fields.pickerTarget', {
          name: project.fields.find((f) => f.id === picker?.target)?.name.trim() || t('teacher.editor.fields.untitled'),
        });

  const readOnly = project.readOnly;
  const sampleMode = readOnly && project.id === config.onboarding.sampleProjectId;
  const steps = project.isPractice ? practiceSteps(project, Boolean(onboarding?.done)) : [];
  const showOnboarding = sampleMode || project.isPractice;
  // Első lépések: a következő teendő eleme kék keretet kap; a fókusz nem mozdul.
  const guide = project.isPractice && !onboarding?.done ? guideTarget(project, steps, tab, selection) : null;
  const guideClass = (g: string) => (guide?.guide === g ? 'guide-target' : undefined);

  // Minta → „Most te jössz”: a pedagógus saját gyakorló projektje a minta képével.
  async function startOwnPractice() {
    if (!userId) return;
    setStarting(true);
    setStartError(false);
    try {
      const practiceId = await startPractice(userId, config.onboarding.sampleProjectId);
      navigate(`/szerkeszto/${practiceId}`);
    } catch {
      setStartError(true);
      setStarting(false);
    }
  }

  // Előnézet; a gyakorló projektben az utolsó lépés: ha a többi kész, az Első lépések teljesül.
  async function openPreview() {
    if (project && userId && project.isPractice && !onboarding?.done && steps.slice(0, -1).every(Boolean)) {
      await completeOnboarding(userId);
      reloadOnboarding();
    }
    navigate(`/kep/${project!.id}`);
  }

  const title = sampleMode
    ? t('teacher.onboarding.sampleTitle', { title: project.title })
    : project.isPractice
      ? t('teacher.onboarding.practiceTitle', { title: project.title })
      : project.title;

  return (
    <div className="editor-page">
      <header className="editor-header">
        <h1 className="sr-only">{title}</h1>
        <Breadcrumbs aria-label={t('teacher.editor.breadcrumbLabel')} className="editor-breadcrumb">
          <Breadcrumbs.Item href="/projektjeim">{t('teacher.editor.backToProjects')}</Breadcrumbs.Item>
          <Breadcrumbs.Item>{title}</Breadcrumbs.Item>
        </Breadcrumbs>
        {readOnly ? (
          // Minta: a Megosztás helyén „Csak megtekintés” címke (döntésnapló).
          <Chip>{t('teacher.onboarding.readOnly')}</Chip>
        ) : (
          <>
            <span role="status" className={`save-status save-status--${status}`}>
              <Icon name="cloud" size={16} />
              {t(`teacher.editor.status.${status}`)}
            </span>
            <div className="editor-actions">
              <Button variant="secondary" className={guideClass('preview')} onPress={() => void openPreview()}>
                <Icon name="eye" size={16} />
                {t('teacher.editor.preview')}
              </Button>
              <Button onPress={() => setTab('share')}>
                <Icon name="link" size={16} />
                {t('teacher.editor.shareButton')}
              </Button>
            </div>
          </>
        )}
      </header>

      {/* Telefonon a szerkesztő nem használható (döntésnapló): csak ez az üzenet látszik. */}
      <div className="editor-unsupported">
        <h2>{t('teacher.editor.unsupported.title')}</h2>
        <p>{t('teacher.editor.unsupported.text')}</p>
        <ButtonLink href="/projektjeim" variant="secondary">
          <Icon name="back" size={16} />
          {t('teacher.editor.backToProjects')}
        </ButtonLink>
      </div>

      <div className="editor-body">
        {showOnboarding && (
          <OnboardingPanel
            mode={sampleMode ? 'sample' : 'practice'}
            steps={sampleMode ? Array(config.onboarding.steps).fill(false) : steps}
            finished={project.isPractice && Boolean(onboarding?.done)}
            onStart={() => void startOwnPractice()}
            starting={starting}
            startError={startError}
          />
        )}
        <main className="editor-stage">
          <Toolbar aria-label={t('teacher.editor.toolbarLabel')} className="draw-toolbar">
            <ToggleButtonGroup
              aria-label={t('teacher.editor.toolbarLabel')}
              selectionMode="single"
              disallowEmptySelection
              selectedKeys={new Set([tool])}
              onSelectionChange={(keys) => setTool([...keys][0] as Tool)}
              isDisabled={readOnly}
            >
              <ToggleButton id="brush" aria-label={t('teacher.editor.brush')}>
                <Icon name="brush" size={16} />
                <span className="tool-label">{t('teacher.editor.brush')}</span>
              </ToggleButton>
              <ToggleButton id="eraser" aria-label={t('teacher.editor.eraser')}>
                <Icon name="eraser" size={16} />
                <span className="tool-label">{t('teacher.editor.eraser')}</span>
              </ToggleButton>
              <ToggleButton id="points" aria-label={t('teacher.editor.points.tool')}>
                <Icon name="points" size={16} />
                <span className="tool-label">{t('teacher.editor.points.tool')}</span>
              </ToggleButton>
            </ToggleButtonGroup>
            <Separator orientation="vertical" />
            <div className="toolbar-group">
              <span className="size-dot size-dot-sm" aria-hidden="true" />
              <Slider
                value={size}
                minValue={config.editor.brushMin}
                maxValue={config.editor.brushMax}
                onChange={(v) => setSize(v as number)}
                aria-label={t('teacher.editor.sizeLabel')}
                className="size-slider"
                isDisabled={readOnly}
              >
                <Slider.Track>
                  <Slider.Fill />
                  <Slider.Thumb />
                </Slider.Track>
              </Slider>
              <span className="size-dot size-dot-lg" aria-hidden="true" />
            </div>
            <Separator orientation="vertical" />
            {/* Él lágysága: a kijelölt hangmezőé; a rajzon a kitöltés a széltől befelé ennyi sávban erősödik. */}
            <div className="toolbar-group">
              <span className="soft-dot soft-dot-hard" aria-hidden="true" />
              <Slider
                value={selectedField?.softness ?? config.editor.softnessDefault}
                minValue={0}
                maxValue={1}
                step={0.05}
                onChange={(v) => selectedField && changeField(selectedField.id, { softness: v as number })}
                aria-label={t('teacher.editor.fields.softness')}
                aria-describedby="softness-help"
                className="size-slider"
                isDisabled={readOnly || !selectedField}
              >
                <Slider.Track>
                  <Slider.Fill />
                  <Slider.Thumb />
                </Slider.Track>
              </Slider>
              <span className="soft-dot soft-dot-soft" aria-hidden="true" />
              <span id="softness-help" className="sr-only">
                {selectedField ? t('teacher.editor.fields.softnessHelp') : t('teacher.editor.fields.softnessDisabled')}
              </span>
            </div>
            <Separator orientation="vertical" />
            <div className="toolbar-group">
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
            </div>
            <Separator orientation="vertical" />
            <div className="toolbar-group">
              <Button isIconOnly variant="ghost" aria-label={t('teacher.editor.undo')} isDisabled={!history.done.length} onPress={undo}>
                <Icon name="undo" />
              </Button>
              <Button isIconOnly variant="ghost" aria-label={t('teacher.editor.redo')} isDisabled={!history.undone.length} onPress={redo}>
                <Icon name="redo" />
              </Button>
            </div>
          </Toolbar>
          <p className="canvas-hint" hidden={readOnly}>
            {tool === 'points' ? (
              <span id="points-help">{t('teacher.editor.points.hint')}</span>
            ) : selectedField ? (
              t('teacher.editor.canvasHintSelected')
            ) : (
              t('teacher.editor.canvasHintNew')
            )}
            <span id="zoom-hint" className="canvas-hint-zoom">
              {t('teacher.editor.zoom.hint')}
            </span>
          </p>
          <div className={`draw-area ${guideClass('canvas') ?? ''}`}>
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
              edgeMaxFraction={config.viewer.edgeMaxFraction}
              readOnly={readOnly}
            />
          </div>
        </main>

        <aside className="editor-panel" aria-label={t('teacher.editor.panelLabel')}>
          <Tabs selectedKey={tab} onSelectionChange={(key) => setTab(key as typeof tab)}>
            {/* Rögzített burkoló: a fülsor görgetéskor is fent marad, a HeroUI-elem kinézete érintetlen. */}
            <div className="panel-tabs-sticky">
              <Tabs.ListContainer>
                <Tabs.List aria-label={t('teacher.editor.tabsLabel')}>
                  <Tabs.Tab id="project">
                    {t('teacher.editor.tabs.project')}
                    <Tabs.Indicator />
                  </Tabs.Tab>
                  <Tabs.Tab id="sounds" className={guideClass('tab-sounds')}>
                    {t('teacher.editor.tabs.sounds')}
                    <Tabs.Indicator />
                  </Tabs.Tab>
                  <Tabs.Tab id="share">
                    {t('teacher.editor.tabs.share')}
                    <Tabs.Indicator />
                  </Tabs.Tab>
                </Tabs.List>
              </Tabs.ListContainer>
            </div>
            <Tabs.Panel id="project">
              <ProjectPanel
                readOnly={readOnly}
                project={project}
                categories={categories}
                onChange={onProjectText}
                onCategories={onCategories}
                onReplaceImage={onReplaceImage}
                onDelete={() => setConfirmProjectDelete(true)}
              />
            </Tabs.Panel>
            <Tabs.Panel id="sounds">
              <SoundsPanel
                readOnly={readOnly}
                project={project}
                selection={selection}
                onSelect={setSelection}
                guide={guide}
                userId={userId}
                onAddField={() => void addField().catch(() => undefined)}
                onPickSound={(target, index) => setPicker({ target, index })}
                onLayerVolume={onLayerVolume}
                onRemoveLayer={onRemoveLayer}
                onFieldChange={changeField}
                onFieldVoice={(fid, sound) => {
                  recordField(fid, { descriptionSound: sound });
                  patchField(fid, { descriptionSound: sound });
                  void track(updateField(fid, { description_sound_id: sound?.id ?? null })).catch(() => undefined);
                }}
                onDeleteField={setConfirmDelete}
              />
            </Tabs.Panel>
            <Tabs.Panel id="share">
              <SharePanel
                readOnly={readOnly}
                project={project}
                onVisibility={onVisibility}
                onGoToMissing={goToMissing}
                error={shareError}
              />
            </Tabs.Panel>
          </Tabs>
        </aside>
      </div>

      <SoundPicker
        isOpen={picker !== null}
        onOpenChange={(open) => !open && setPicker(null)}
        target={pickerTarget}
        initialQuery={picker && picker.target !== 'background' ? (project.fields.find((f) => f.id === picker.target)?.name.trim() ?? '') : ''}
        userId={userId}
        maxMb={config.upload.soundMaxMb}
        onPick={onPickSound}
      />

      <Modal>
        <Modal.Backdrop isOpen={confirmDelete !== null} onOpenChange={(open) => !open && setConfirmDelete(null)}>
          <Modal.Container size="sm">
            <Modal.Dialog role="alertdialog">
              <Modal.Header>
                <div className="modal-heading">
                  <Modal.Heading>{t('teacher.editor.fields.deleteConfirmTitle')}</Modal.Heading>
                  <p>
                    {t('teacher.editor.fields.deleteConfirmText', {
                      name: confirmDelete?.name.trim() || t('teacher.editor.fields.untitled'),
                    })}
                  </p>
                </div>
              </Modal.Header>
              <Modal.Footer>
                <Button variant="secondary" slot="close">
                  {t('teacher.editor.fields.cancel')}
                </Button>
                <Button variant="danger" onPress={() => confirmDelete && void removeField(confirmDelete)}>
                  {t('teacher.editor.fields.deleteConfirm')}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      <Modal>
        <Modal.Backdrop isOpen={confirmProjectDelete} onOpenChange={setConfirmProjectDelete}>
          <Modal.Container size="sm">
            <Modal.Dialog role="alertdialog">
              <Modal.Header>
                <div className="modal-heading">
                  <Modal.Heading>{t('teacher.editor.project.deleteConfirmTitle')}</Modal.Heading>
                  <p>{t('teacher.editor.project.deleteConfirmText', { title: project.title })}</p>
                </div>
              </Modal.Header>
              <Modal.Footer>
                <Button variant="secondary" slot="close">
                  {t('teacher.editor.project.cancel')}
                </Button>
                <Button variant="danger" onPress={() => void removeProject()}>
                  {t('teacher.editor.project.deleteConfirm')}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
  );
}

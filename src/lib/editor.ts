import { useCallback, useEffect, useRef, useState } from 'react';
import type { Point } from './data';
import { supabase } from './supabase';
import { uploadFile } from './teacher';

export interface EditorSound {
  id: string;
  title: string;
  path: string;
  source: 'upload' | 'library';
  license: string | null;
  durationMs: number | null;
}

export interface EditorField {
  id: string;
  sort: number;
  name: string;
  description: string;
  polygons: Point[][];
  sound: EditorSound | null;
  volume: number;
  softness: number;
  descriptionSound: EditorSound | null;
}

export type Visibility = 'private' | 'link' | 'gallery';

export interface EditorProject {
  id: string;
  title: string;
  shortDescription: string;
  author: string;
  visibility: Visibility;
  categories: string[];
  /** A minta (más projektje): csak megtekinthető. */
  readOnly: boolean;
  /** Az Első lépések gyakorló projektje. */
  isPractice: boolean;
  imagePath: string;
  imageWidth: number;
  imageHeight: number;
  background: EditorSound | null;
  backgroundVolume: number;
  fields: EditorField[];
}

type SoundRow = {
  id: string;
  title: string;
  path: string;
  source: 'upload' | 'library';
  license: string | null;
  duration_ms: number | null;
};

function toSound(row: SoundRow | null): EditorSound | null {
  return row && { id: row.id, title: row.title, path: row.path, source: row.source, license: row.license, durationMs: row.duration_ms };
}

type Shape = { type: 'polygon'; points: Point[] } | { type: 'multipolygon'; polygons: Point[][] };

function shapePolygons(shape: Shape): Point[][] {
  return shape.type === 'multipolygon' ? shape.polygons : shape.points.length ? [shape.points] : [];
}

const SOUND = 'id, title, path, source, license, duration_ms';

export async function loadProject(id: string, userId: string): Promise<EditorProject | null> {
  const { data, error } = await supabase
    .from('projects')
    .select(
      `id, title, short_description, author, visibility, image_path, image_width, image_height, background_volume, owner_id, is_practice,
       project_categories(category_id),
       background:sounds!projects_background_sound_id_fkey(${SOUND}),
       fields(id, sort, name, description, shape, volume, edge_softness,
         sound:sounds!fields_sound_id_fkey(${SOUND}),
         description_sound:sounds!fields_description_sound_id_fkey(${SOUND}))`,
    )
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as unknown as {
    id: string;
    title: string;
    short_description: string;
    author: string;
    visibility: Visibility;
    owner_id: string | null;
    is_practice: boolean;
    project_categories: { category_id: string }[];
    image_path: string;
    image_width: number;
    image_height: number;
    background_volume: number;
    background: SoundRow | null;
    fields: {
      id: string;
      sort: number;
      name: string;
      description: string;
      shape: Shape;
      volume: number;
      edge_softness: number;
      sound: SoundRow | null;
      description_sound: SoundRow | null;
    }[];
  };
  return {
    id: row.id,
    title: row.title,
    shortDescription: row.short_description,
    author: row.author,
    visibility: row.visibility,
    categories: row.project_categories.map((c) => c.category_id),
    readOnly: row.owner_id !== userId,
    isPractice: row.is_practice,
    imagePath: row.image_path,
    imageWidth: row.image_width,
    imageHeight: row.image_height,
    background: toSound(row.background),
    backgroundVolume: row.background_volume,
    fields: row.fields
      .sort((a, b) => a.sort - b.sort)
      .map((f) => ({
        id: f.id,
        sort: f.sort,
        name: f.name,
        description: f.description,
        polygons: shapePolygons(f.shape),
        sound: toSound(f.sound),
        volume: f.volume,
        softness: f.edge_softness,
        descriptionSound: toSound(f.description_sound),
      })),
  };
}

export type ProjectPatch = Partial<{
  background_sound_id: string | null;
  background_volume: number;
  title: string;
  short_description: string;
  author: string;
  visibility: Visibility;
  image_path: string;
  image_width: number;
  image_height: number;
}>;
export type FieldPatch = Partial<{
  name: string;
  description: string;
  shape: Shape;
  sound_id: string | null;
  volume: number;
  edge_softness: number;
  description_sound_id: string | null;
}>;

export function shapeOf(polygons: Point[][]): Shape {
  return { type: 'multipolygon', polygons };
}

async function check<T extends { error: unknown }>(q: PromiseLike<T>): Promise<T> {
  const res = await q;
  if (res.error) throw res.error;
  return res;
}

export async function insertField(projectId: string, sort: number): Promise<string> {
  const { data } = await check(
    supabase
      .from('fields')
      .insert({ project_id: projectId, sort, shape: shapeOf([]) })
      .select('id')
      .single(),
  );
  return (data as { id: string }).id;
}

export const updateProject = (id: string, patch: ProjectPatch) => check(supabase.from('projects').update(patch).eq('id', id));
export const updateField = (id: string, patch: FieldPatch) => check(supabase.from('fields').update(patch).eq('id', id));
export const deleteField = (id: string) => check(supabase.from('fields').delete().eq('id', id));

async function durationMs(blob: Blob): Promise<number | null> {
  try {
    const ctx = new OfflineAudioContext(1, 1, 44100);
    const buf = await ctx.decodeAudioData(await blob.arrayBuffer());
    return Math.round(buf.duration * 1000);
  } catch {
    return null;
  }
}

const EXT: Record<string, string> = {
  'audio/mpeg': 'mp3',
  'audio/mp4': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/aac': 'aac',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/ogg': 'ogg',
  'audio/webm': 'webm',
};

export const AUDIO_TYPES = Object.keys(EXT);

type SoundMeta = { source: 'upload' | 'library'; license: string | null; attribution: string | null };

/** Hang feltöltése a saját mappába és a hangok közé. */
export async function uploadSound(
  userId: string,
  blob: Blob,
  title: string,
  meta: SoundMeta = { source: 'upload', license: null, attribution: null },
): Promise<EditorSound> {
  const type = blob.type.split(';')[0];
  const ext = EXT[type] ?? 'bin';
  const [path, duration] = await Promise.all([uploadFile('sounds', userId, blob, ext), durationMs(blob)]);
  const { data } = await check(
    supabase
      .from('sounds')
      .insert({ owner_id: userId, title, path, duration_ms: duration, ...meta })
      .select(SOUND)
      .single(),
  );
  return toSound(data as SoundRow)!;
}

export type SaveStatus = 'saved' | 'saving' | 'error';

/**
 * Automatikus mentés: azonos kulcsú módosításokat rövid késleltetéssel összevonunk (pl. gépelés),
 * a többit azonnal küldjük. Az állapot a fejlécben látszik.
 */
export function useAutosave(delayMs: number) {
  const [status, setStatus] = useState<SaveStatus>('saved');
  const inflight = useRef(0);
  const failed = useRef(false);
  const pending = useRef(new Map<string, { timer: number; run: () => Promise<unknown> }>());

  const track = useCallback(async <T>(work: Promise<T>): Promise<T> => {
    inflight.current += 1;
    setStatus('saving');
    try {
      const result = await work;
      return result;
    } catch (e) {
      failed.current = true;
      throw e;
    } finally {
      inflight.current -= 1;
      if (inflight.current === 0 && pending.current.size === 0) setStatus(failed.current ? 'error' : 'saved');
    }
  }, []);

  const schedule = useCallback(
    (key: string, run: () => Promise<unknown>) => {
      const prev = pending.current.get(key);
      if (prev) window.clearTimeout(prev.timer);
      setStatus('saving');
      const timer = window.setTimeout(() => {
        pending.current.delete(key);
        failed.current = false;
        void track(run()).catch(() => undefined);
      }, delayMs);
      pending.current.set(key, { timer, run });
    },
    [delayMs, track],
  );

  // Kilépés előtt a függő mentéseket azonnal elküldjük.
  const flush = useCallback(() => {
    for (const [key, { timer, run }] of pending.current) {
      window.clearTimeout(timer);
      pending.current.delete(key);
      void track(run()).catch(() => undefined);
    }
  }, [track]);

  useEffect(() => {
    const onUnload = (e: BeforeUnloadEvent) => {
      if (pending.current.size || inflight.current) {
        flush();
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', onUnload);
    return () => {
      window.removeEventListener('beforeunload', onUnload);
      flush();
    };
  }, [flush]);

  return { status, schedule, track };
}

export interface LibraryResult {
  id: number;
  name: string;
  durationMs: number;
  username: string;
  preview: string;
}

/** Keresés a Freesound CC0 hangjai között (Supabase függvényen át, a kulcs ott marad). */
export async function searchLibrary(
  query: string,
  page: number,
): Promise<{ count: number; next: boolean; searchedFor: string; results: LibraryResult[] }> {
  const { data, error } = await supabase.functions.invoke('freesound', { body: { query, page } });
  if (error) throw error;
  return data;
}

/** A Freesound fájlnevekből olvasható cím: kiterjesztés, aláhúzás és kötőjel nélkül. */
export function libraryTitle(name: string): string {
  return name
    .replace(/\.[a-z0-9]{2,4}$/i, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** A kiválasztott könyvtári hangot a saját tárhelyünkre másoljuk, így a projekt nem függ a Freesoundtól. */
export async function importLibrarySound(userId: string, result: LibraryResult): Promise<EditorSound> {
  const res = await fetch(result.preview);
  if (!res.ok) throw new Error(`Freesound: ${res.status}`);
  const blob = await res.blob();
  return uploadSound(userId, new Blob([blob], { type: 'audio/mpeg' }), libraryTitle(result.name), {
    source: 'library',
    license: 'CC0',
    attribution: `${result.username} · https://freesound.org/s/${result.id}/`,
  });
}

export interface CategoryOption {
  id: string;
  label: string;
  icon: string | null;
}

/** A galéria kategóriái a Téma választóhoz („Összes kép” nélkül, az nem szűr). */
export async function loadCategories(): Promise<CategoryOption[]> {
  const { data } = await check(supabase.from('categories').select('id, label, icon, sort').neq('id', 'all').order('sort'));
  return (data ?? []) as CategoryOption[];
}

/** A projekt témái: a régieket töröljük, az újakat beírjuk. */
export async function setProjectCategories(projectId: string, ids: string[]) {
  await check(supabase.from('project_categories').delete().eq('project_id', projectId));
  if (ids.length) await check(supabase.from('project_categories').insert(ids.map((category_id) => ({ project_id: projectId, category_id }))));
}

export const deleteProject = (id: string) => check(supabase.from('projects').delete().eq('id', id));

/** A galériába kerülés feltételei (döntésnapló), ugyanaz, mint az adatbázis project_missing() függvénye. */
export type Missing =
  | { kind: 'image' | 'title' | 'shortDescription' | 'background' | 'fields' }
  | { kind: 'fieldName' | 'fieldDescription' | 'fieldSound'; fieldId: string };

export function projectMissing(p: EditorProject): Missing[] {
  const out: Missing[] = [];
  if (!p.imagePath) out.push({ kind: 'image' });
  if (!p.title.trim()) out.push({ kind: 'title' });
  if (!p.shortDescription.trim()) out.push({ kind: 'shortDescription' });
  if (!p.background) out.push({ kind: 'background' });
  if (!p.fields.length) out.push({ kind: 'fields' });
  for (const f of p.fields) {
    if (!f.name.trim()) out.push({ kind: 'fieldName', fieldId: f.id });
    if (!f.description.trim()) out.push({ kind: 'fieldDescription', fieldId: f.id });
    if (!f.sound) out.push({ kind: 'fieldSound', fieldId: f.id });
  }
  return out;
}

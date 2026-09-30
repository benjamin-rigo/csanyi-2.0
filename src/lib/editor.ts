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
  descriptionSound: EditorSound | null;
}

export interface EditorProject {
  id: string;
  title: string;
  imagePath: string;
  imageWidth: number;
  imageHeight: number;
  background: EditorSound | null;
  backgroundVolume: number;
  fields: EditorField[];
}

type SoundRow = { id: string; title: string; path: string; source: 'upload' | 'library'; license: string | null; duration_ms: number | null };

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
      `id, title, image_path, image_width, image_height, background_volume, owner_id,
       background:sounds!projects_background_sound_id_fkey(${SOUND}),
       fields(id, sort, name, description, shape, volume,
         sound:sounds!fields_sound_id_fkey(${SOUND}),
         description_sound:sounds!fields_description_sound_id_fkey(${SOUND}))`,
    )
    .eq('id', id)
    .eq('owner_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as unknown as {
    id: string;
    title: string;
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
      sound: SoundRow | null;
      description_sound: SoundRow | null;
    }[];
  };
  return {
    id: row.id,
    title: row.title,
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
        descriptionSound: toSound(f.description_sound),
      })),
  };
}

export type ProjectPatch = Partial<{ background_sound_id: string | null; background_volume: number }>;
export type FieldPatch = Partial<{
  name: string;
  description: string;
  shape: Shape;
  sound_id: string | null;
  volume: number;
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
    supabase.from('fields').insert({ project_id: projectId, sort, shape: shapeOf([]) }).select('id').single(),
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

/** Hang feltöltése a saját mappába és a hangok közé. */
export async function uploadSound(userId: string, blob: Blob, title: string): Promise<EditorSound> {
  const type = blob.type.split(';')[0];
  const ext = EXT[type] ?? 'bin';
  const [path, duration] = await Promise.all([uploadFile('sounds', userId, blob, ext), durationMs(blob)]);
  const { data } = await check(
    supabase
      .from('sounds')
      .insert({ owner_id: userId, title, path, source: 'upload', duration_ms: duration })
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

  const track = useCallback(async <T,>(work: Promise<T>): Promise<T> => {
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

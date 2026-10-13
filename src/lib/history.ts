import { shapeOf, type EditorField, type EditorProject, type FieldPatch, type ProjectPatch } from './editor';

/**
 * A szerkesztő visszavonható lépései: a hangmezők és a projekt adatai, valamint hangmező létrehozása és törlése.
 * Nem visszavonható: képcsere (törli a listát), megosztás, kategóriák.
 */
export type FieldValues = Partial<
  Pick<EditorField, 'polygons' | 'name' | 'description' | 'volume' | 'softness' | 'sound' | 'descriptionSound'>
>;
export type ProjectValues = Partial<Pick<EditorProject, 'title' | 'shortDescription' | 'author' | 'background' | 'backgroundVolume'>>;

export type Change =
  | { kind: 'field'; fieldId: string; before: FieldValues; after: FieldValues; at: number }
  | { kind: 'project'; before: ProjectValues; after: ProjectValues; at: number }
  | { kind: 'create' | 'delete'; field: EditorField; at: number };

export interface History {
  done: Change[];
  undone: Change[];
}

export const EMPTY_HISTORY: History = { done: [], undone: [] };

/** Gépelés és csúszka: az ennyi időn belüli változás ugyanazon az értéken egy lépés marad. */
const MERGE_MS = 1500;
const MERGEABLE = new Set(['name', 'description', 'volume', 'softness', 'title', 'shortDescription', 'author', 'backgroundVolume']);

type ValueChange = Extract<Change, { after: unknown }>;

function mergeable(a: ValueChange, b: ValueChange): boolean {
  if (a.kind !== b.kind || b.at - a.at > MERGE_MS) return false;
  if (a.kind === 'field' && b.kind === 'field' && a.fieldId !== b.fieldId) return false;
  const ka = Object.keys(a.after);
  const kb = Object.keys(b.after);
  return ka.length === kb.length && ka.every((k) => kb.includes(k) && MERGEABLE.has(k));
}

export function record(h: History, change: Change): History {
  const last = h.done.at(-1);
  if (last && 'after' in last && 'after' in change && mergeable(last, change)) {
    return { done: [...h.done.slice(0, -1), { ...last, after: change.after, at: change.at } as Change], undone: [] };
  }
  return { done: [...h.done, change], undone: [] };
}

export function pickField(f: EditorField, keys: (keyof FieldValues)[]): FieldValues {
  return Object.fromEntries(keys.map((k) => [k, f[k]]));
}

export function pickProject(p: EditorProject, keys: (keyof ProjectValues)[]): ProjectValues {
  return Object.fromEntries(keys.map((k) => [k, p[k]]));
}

export function fieldPatch(v: FieldValues): FieldPatch {
  const out: FieldPatch = {};
  if ('polygons' in v) out.shape = shapeOf(v.polygons!);
  if ('name' in v) out.name = v.name;
  if ('description' in v) out.description = v.description;
  if ('volume' in v) out.volume = v.volume;
  if ('softness' in v) out.edge_softness = v.softness;
  if ('sound' in v) out.sound_id = v.sound?.id ?? null;
  if ('descriptionSound' in v) out.description_sound_id = v.descriptionSound?.id ?? null;
  return out;
}

export function projectPatch(v: ProjectValues): ProjectPatch {
  const out: ProjectPatch = {};
  if ('title' in v) out.title = v.title;
  if ('shortDescription' in v) out.short_description = v.shortDescription;
  if ('author' in v) out.author = v.author;
  if ('background' in v) out.background_sound_id = v.background?.id ?? null;
  if ('backgroundVolume' in v) out.background_volume = v.backgroundVolume;
  return out;
}

import { useEffect, useState } from 'react';
import { supabase } from './supabase';

export type Point = [number, number];

export interface Sound {
  src: string;
  volume: number;
}

export interface SoundField {
  id: string;
  name: string;
  description: string;
  /** null: még nincs hang (linkkel megosztott, félkész projektben lehet) */
  sound: Sound | null;
  /** Felvett leírás: kikapcsolt felolvasónál ez szól érintésre. */
  descriptionSound: Sound | null;
  points: Point[];
}

export interface Project {
  id: string;
  title: string;
  author: string;
  shortDescription: string;
  categories: string[];
  image: { src: string | null; width: number | null; height: number | null };
  background: Sound | null;
  fields: SoundField[];
}

export interface Category {
  id: string;
  label: string;
  icon: string | null;
}

export interface Gallery {
  categories: Category[];
  projects: Project[];
}

export interface Config {
  contactEmail: string;
  links: Record<'help' | 'teachers' | 'accessibility' | 'privacy' | 'terms', string>;
  auth: { passwordMinLength: number };
  upload: { imageMaxMb: number };
  viewer: {
    startCue: Sound;
    backgroundFadeInMs: number;
    backgroundFadeOutMs: number;
    backgroundDuckLevel: number;
    fieldFadeMs: number;
    reminderDelayMs: number;
    reminderMax: number;
    /** Ennyi ideig a hangmezőre ugró fókuszt visszatesszük az üdvözlésre. */
    welcomeSettleMs: number;
  };
}

/** Az „Összes kép” kategória azonosítója: ez nem szűr. */
export const ALL_CATEGORY = 'all';

/**
 * A telepítési alapcímhez igazított URL (pl. GitHub Pages: /csanyi-2.0/).
 * A tárhelyre feltöltött fájlok teljes URL-lel jönnek, azokat változatlanul hagyjuk.
 */
export function assetUrl(path: string): string {
  if (/^https?:/.test(path)) return path;
  return import.meta.env.BASE_URL + path.replace(/^\//, '');
}

function withBase(sound: Sound): Sound {
  return { ...sound, src: assetUrl(sound.src) };
}

/** Az adatbázisban hiányzó hang { src: null } formában jön; ezt null-ra egyszerűsítjük. */
function soundOrNull(sound: { src: string | null; volume: number } | null): Sound | null {
  return sound?.src ? withBase(sound as Sound) : null;
}

function resolveProject(p: Project): Project {
  return {
    ...p,
    image: { ...p.image, src: p.image.src && assetUrl(p.image.src) },
    background: soundOrNull(p.background),
    fields: p.fields.map((f) => ({ ...f, sound: soundOrNull(f.sound), descriptionSound: soundOrNull(f.descriptionSound ?? null) })),
  };
}

function resolveGallery(g: Gallery): Gallery {
  return { ...g, projects: g.projects.map(resolveProject) };
}

function resolveConfig(c: Config): Config {
  return { ...c, viewer: { ...c.viewer, startCue: withBase(c.viewer.startCue) } };
}

const cache = new Map<string, Promise<unknown>>();

function load<T>(url: string): Promise<T> {
  if (!cache.has(url)) {
    cache.set(
      url,
      fetch(url).then((res) => {
        if (!res.ok) throw new Error(`${url}: ${res.status}`);
        return res.json();
      }),
    );
  }
  return cache.get(url) as Promise<T>;
}

type State<T> = { status: 'loading' } | { status: 'error' } | { status: 'ready'; data: T };

/** Csak a beállítások (a pedagógus oldalnak nem kell a galéria). */
export function useConfig(): Config | null {
  const [config, setConfig] = useState<Config | null>(null);
  useEffect(() => {
    let alive = true;
    void load<Config>(assetUrl('data/config.json')).then((c) => alive && setConfig(resolveConfig(c)));
    return () => {
      alive = false;
    };
  }, []);
  return config;
}

async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw error;
  return data as T;
}

/** A galéria a Supabase-ből, a beállítások a config.json-ból. */
export function useData(): State<{ gallery: Gallery; config: Config }> {
  const [state, setState] = useState<State<{ gallery: Gallery; config: Config }>>({ status: 'loading' });
  useEffect(() => {
    let alive = true;
    Promise.all([rpc<Gallery>('gallery'), load<Config>(assetUrl('data/config.json'))])
      .then(([gallery, config]) =>
        alive && setState({ status: 'ready', data: { gallery: resolveGallery(gallery), config: resolveConfig(config) } }),
      )
      .catch(() => alive && setState({ status: 'error' }));
    return () => {
      alive = false;
    };
  }, []);
  return state;
}

/** Linkkel megosztott (galériában nem szereplő) projekt. null: nincs ilyen, vagy privát. */
export function useSharedProject(id: string | undefined, skip: boolean): State<Project | null> {
  const [state, setState] = useState<State<Project | null>>({ status: 'loading' });
  useEffect(() => {
    if (skip || !id) return;
    let alive = true;
    const isUuid = /^[0-9a-f-]{36}$/i.test(id);
    (isUuid ? rpc<Project | null>('shared_project', { p_id: id }) : Promise.resolve(null))
      .then((p) => alive && setState({ status: 'ready', data: p && resolveProject(p) }))
      .catch(() => alive && setState({ status: 'error' }));
    return () => {
      alive = false;
    };
  }, [id, skip]);
  return state;
}

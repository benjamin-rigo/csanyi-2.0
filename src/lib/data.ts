import { useEffect, useState } from 'react';

export type Point = [number, number];

export interface Sound {
  src: string;
  volume: number;
}

export interface SoundField {
  id: string;
  name: string;
  description: string;
  sound: Sound;
  points: Point[];
}

export interface Project {
  id: string;
  title: string;
  author: string;
  shortDescription: string;
  categories: string[];
  image: { src: string; width: number; height: number };
  background: Sound;
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
  viewer: {
    startCue: Sound;
    backgroundFadeInMs: number;
    backgroundFadeOutMs: number;
    backgroundDuckLevel: number;
    fieldFadeMs: number;
    reminderDelayMs: number;
    reminderMax: number;
  };
}

/** Az „Összes kép” kategória azonosítója: ez nem szűr. */
export const ALL_CATEGORY = 'all';

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

/** Egyelőre statikus JSON fájlokból tölt; később ugyanez a felület jön a Supabase-ből. */
export function useData(): State<{ gallery: Gallery; config: Config }> {
  const [state, setState] = useState<State<{ gallery: Gallery; config: Config }>>({ status: 'loading' });
  useEffect(() => {
    let alive = true;
    Promise.all([load<Gallery>('/data/gallery.json'), load<Config>('/data/config.json')])
      .then(([gallery, config]) => alive && setState({ status: 'ready', data: { gallery, config } }))
      .catch(() => alive && setState({ status: 'error' }));
    return () => {
      alive = false;
    };
  }, []);
  return state;
}

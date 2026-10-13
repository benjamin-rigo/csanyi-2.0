import { useCallback, useEffect, useState } from 'react';
import type { Visibility } from './editor';
import { supabase, useSession } from './supabase';

/** A galéria kezelése (admin). Az adminlista a Supabase-ben van; a műveleteket az adatbázis is ellenőrzi. */
export interface AdminProject {
  id: string;
  title: string;
  author: string;
  imagePath: string;
  visibility: Visibility;
  moderationNote: string | null;
  moderatedAt: string | null;
  updatedAt: string;
  ownerName: string | null;
  ownerEmail: string | null;
  fieldCount: number;
  categories: string[];
}

/** Admin-e a bejelentkezett pedagógus (null: még nem tudjuk). */
export function useIsAdmin(): boolean | null {
  const session = useSession();
  const userId = session?.user.id;
  const [admin, setAdmin] = useState<boolean | null>(null);
  useEffect(() => {
    if (!userId) return;
    let alive = true;
    void supabase.rpc('is_admin').then(({ data }) => alive && setAdmin(data === true));
    return () => {
      alive = false;
    };
  }, [userId]);
  return admin;
}

type Load<T> = { status: 'loading' } | { status: 'error' } | { status: 'ready'; data: T };

export function useAdminGallery(): [Load<AdminProject[]>, () => void] {
  const [state, setState] = useState<Load<AdminProject[]>>({ status: 'loading' });
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);
  useEffect(() => {
    let alive = true;
    void supabase.rpc('admin_gallery').then(({ data, error }) => {
      if (alive) setState(error ? { status: 'error' } : { status: 'ready', data: data as AdminProject[] });
    });
    return () => {
      alive = false;
    };
  }, [version]);
  return [state, reload];
}

async function call(fn: string, args: Record<string, unknown>) {
  const { error } = await supabase.rpc(fn, args);
  if (error) throw error;
}

export const removeFromGallery = (id: string, reason: string) => call('admin_remove_from_gallery', { p_id: id, reason });
export const restoreToGallery = (id: string) => call('admin_restore_to_gallery', { p_id: id });
export const setCategoriesAsAdmin = (id: string, ids: string[]) => call('admin_set_categories', { p_id: id, ids });

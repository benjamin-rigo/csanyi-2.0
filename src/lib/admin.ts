import { useCallback, useEffect, useState } from 'react';
import type { Visibility } from './editor';
import { supabase, useSession } from './supabase';

/** Levételkor ok nélkül az adatbázis „-” jelet tesz a helyére (ebből tudja, hogy levett kép); ezt a felület nem mutatja. */
export function moderationReason(note: string | null | undefined): string | null {
  return note && note !== '-' ? note : null;
}

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

/** Admin lista egy adatbázis-függvényből; a reload újratölti. */
function useAdminList<T>(fn: string): [Load<T[]>, () => void] {
  const [state, setState] = useState<Load<T[]>>({ status: 'loading' });
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);
  useEffect(() => {
    let alive = true;
    void supabase.rpc(fn).then(({ data, error }) => {
      if (alive) setState(error ? { status: 'error' } : { status: 'ready', data: data as T[] });
    });
    return () => {
      alive = false;
    };
  }, [fn, version]);
  return [state, reload];
}

export const useAdminGallery = () => useAdminList<AdminProject>('admin_gallery');

async function call(fn: string, args: Record<string, unknown>) {
  const { error } = await supabase.rpc(fn, args);
  if (error) throw error;
}

export const removeFromGallery = (id: string, reason: string) => call('admin_remove_from_gallery', { p_id: id, reason });
export const restoreToGallery = (id: string) => call('admin_restore_to_gallery', { p_id: id });
export const setCategoriesAsAdmin = (id: string, ids: string[]) => call('admin_set_categories', { p_id: id, ids });

/** Admin, Fiókok fül: minden pedagógus. A privát projekteket az admin nem látja, csak a darabszámukat. */
export interface AdminAccount {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  lastSignInAt: string | null;
  /** Még nem lépett be a meghívó linkjével. */
  pending: boolean;
  isAdmin: boolean;
  projectCount: number;
  invitedBy: string | null;
}

export const useAdminAccounts = () => useAdminList<AdminAccount>('admin_accounts');

/** Fiók törlése minden adatával; függő meghívónál ez a visszavonás (indok nélkül is). */
export const deleteAccountAsAdmin = (id: string, reason: string) => call('admin_delete_account', { p_user: id, p_reason: reason });

/** Admin, Fiókok fül: a nyitott hozzáférési kérések, a legrégebbi elöl. */
export interface AccessRequest {
  id: string;
  name: string;
  email: string;
  school: string;
  message: string | null;
  createdAt: string;
  /** Ezzel a címmel már van fiók: meghívni nem kell, csak lezárni. */
  hasAccount: boolean;
}

export const useAccessRequests = () => useAdminList<AccessRequest>('admin_access_requests');

/** A kérés lezárása (meghívás után vagy elutasításkor): a kérés törlődik. */
export const resolveAccessRequest = (id: string) => call('admin_resolve_access_request', { p_id: id });

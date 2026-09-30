import { createClient, type Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

const REMEMBER_KEY = 'hs-remember';

/** „Maradjak bejelentkezve”: bekapcsolva localStorage, kikapcsolva csak a böngészőlap bezárásáig (sessionStorage). */
export function setRememberMe(remember: boolean) {
  localStorage.setItem(REMEMBER_KEY, remember ? '1' : '0');
}

const sessionStore = {
  getItem: (key: string) => localStorage.getItem(key) ?? sessionStorage.getItem(key),
  setItem: (key: string, value: string) => {
    const remember = localStorage.getItem(REMEMBER_KEY) !== '0';
    (remember ? localStorage : sessionStorage).setItem(key, value);
    (remember ? sessionStorage : localStorage).removeItem(key);
  },
  removeItem: (key: string) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  },
};

/**
 * A meghívó és a jelszó-visszaállító levél linkje a címben (#...&type=invite|recovery) hozza a belépést.
 * A kliens induláskor kiolvassa és törli, ezért előtte megjegyezzük, melyik volt.
 */
export const authLinkType = new URLSearchParams(window.location.hash.slice(1)).get('type');

export const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, {
  auth: { flowType: 'implicit', storage: sessionStore, persistSession: true, detectSessionInUrl: true },
});

/** A bejelentkezett pedagógus munkamenete. undefined: még töltődik. */
export function useSession(): Session | null | undefined {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);
  return session;
}

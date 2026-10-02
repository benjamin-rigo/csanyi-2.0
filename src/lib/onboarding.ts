import { useCallback, useEffect, useState } from 'react';
import type { EditorProject } from './editor';
import { supabase, useSession } from './supabase';

/** Az Első lépések állapota a profilban: kész-e, és melyik a gyakorló projekt. */
export interface OnboardingState {
  done: boolean;
  practiceProjectId: string | null;
}

export const ONBOARDING_DONE = 6;

export function useOnboarding(): [OnboardingState | null, () => void] {
  const session = useSession();
  const userId = session?.user.id;
  const [state, setState] = useState<OnboardingState | null>(null);
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);
  useEffect(() => {
    if (!userId) return;
    let alive = true;
    void supabase
      .from('profiles')
      .select('onboarding_step, practice_project_id')
      .eq('id', userId)
      .single()
      .then(
        ({ data }) =>
          alive &&
          data &&
          setState({ done: data.onboarding_step >= ONBOARDING_DONE, practiceProjectId: data.practice_project_id }),
      );
    return () => {
      alive = false;
    };
  }, [userId, version]);
  return [state, reload];
}

/**
 * A lépések a gyakorló projekt állapotából teljesülnek (1: a gyakorló projekt létrejött, 6: megnézte előnézetben).
 * A visszaadott tömb i. eleme: kész-e az (i+1). lépés.
 */
export function practiceSteps(project: EditorProject, previewed: boolean): boolean[] {
  const field = project.fields.find((f) => f.polygons.length > 0);
  return [
    true,
    Boolean(field),
    Boolean(field?.name.trim() && field.description.trim()),
    Boolean(field?.sound),
    Boolean(project.background),
    previewed,
  ];
}

/** Gyakorló projekt a minta képével; a profil megjegyzi. Ha már van, azt adja vissza. */
export async function startPractice(userId: string, sampleId: string): Promise<string> {
  const { data: profile } = await supabase.from('profiles').select('practice_project_id').eq('id', userId).single();
  if (profile?.practice_project_id) return profile.practice_project_id;
  const { data: sample, error: sampleError } = await supabase
    .from('projects')
    .select('title, author, image_path, image_width, image_height')
    .eq('id', sampleId)
    .single();
  if (sampleError) throw sampleError;
  const { data, error } = await supabase
    .from('projects')
    .insert({ ...sample, owner_id: userId, is_practice: true })
    .select('id')
    .single();
  if (error) throw error;
  await supabase.from('profiles').update({ practice_project_id: data.id }).eq('id', userId);
  return data.id;
}

export async function completeOnboarding(userId: string) {
  await supabase.from('profiles').update({ onboarding_step: ONBOARDING_DONE }).eq('id', userId);
}

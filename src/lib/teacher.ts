import { useCallback, useEffect, useState } from 'react';
import { supabase, useSession } from './supabase';

export type Visibility = 'private' | 'link' | 'gallery';

export interface ProjectSummary {
  id: string;
  title: string;
  imagePath: string | null;
  visibility: Visibility;
  isSample: boolean;
  fieldCount: number;
  updatedAt: string;
}

export interface Profile {
  id: string;
  name: string;
  email: string;
}

/** A bejelentkezett pedagógus profilja (név a Fiók beállításából). */
export function useProfile(): Profile | null {
  const session = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const userId = session?.user.id;
  const email = session?.user.email ?? '';
  useEffect(() => {
    if (!userId) return;
    let alive = true;
    void supabase
      .from('profiles')
      .select('id, name')
      .eq('id', userId)
      .single()
      .then(({ data }) => alive && data && setProfile({ ...data, email }));
    return () => {
      alive = false;
    };
  }, [userId, email]);
  return profile;
}

type Load<T> = { status: 'loading' } | { status: 'error' } | { status: 'ready'; data: T };

/** A saját projektek, legutóbb módosított elöl. */
export function useMyProjects(): [Load<ProjectSummary[]>, () => void] {
  const session = useSession();
  const userId = session?.user.id;
  const [state, setState] = useState<Load<ProjectSummary[]>>({ status: 'loading' });
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);
  useEffect(() => {
    if (!userId) return;
    let alive = true;
    void supabase
      .from('projects')
      .select('id, title, image_path, visibility, is_sample, updated_at, fields(count)')
      .eq('owner_id', userId)
      .order('updated_at', { ascending: false })
      .then(({ data, error }) => {
        if (!alive) return;
        if (error || !data) return setState({ status: 'error' });
        setState({
          status: 'ready',
          data: data.map((p) => ({
            id: p.id,
            title: p.title,
            imagePath: p.image_path,
            visibility: p.visibility,
            isSample: p.is_sample,
            fieldCount: (p.fields as unknown as { count: number }[])[0]?.count ?? 0,
            updatedAt: p.updated_at,
          })),
        });
      });
    return () => {
      alive = false;
    };
  }, [userId, version]);
  return [state, reload];
}

export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/** Fájl feltöltése a pedagógus saját mappájába; a nyilvános URL-t adja vissza. */
export async function uploadFile(bucket: 'images' | 'sounds', userId: string, file: Blob, ext: string): Promise<string> {
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, { contentType: file.type || undefined });
  if (error) throw error;
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

/** Új projekt képpel és címmel; privátként jön létre. Az új projekt azonosítóját adja vissza. */
export async function createProject(userId: string, image: File, title: string): Promise<string> {
  const bitmap = await createImageBitmap(image);
  const { width, height } = bitmap;
  bitmap.close();
  const ext = image.type.split('/')[1].replace('jpeg', 'jpg');
  const imagePath = await uploadFile('images', userId, image, ext);
  const { data, error } = await supabase
    .from('projects')
    .insert({ owner_id: userId, title: title.trim(), image_path: imagePath, image_width: width, image_height: height })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

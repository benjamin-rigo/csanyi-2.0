import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { expect, test, type Page } from '@playwright/test';
import fs from 'node:fs';
import { expectNoAxeViolations } from './helpers';

// Galéria kezelése (admin). A teszt-fiók admin (docs/atadas.md); a teszt saját projekttel dolgozik, a valódi galériás képekhez nem nyúl.
const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;
test.skip(!email || !password, 'nincs teszt-fiók (.env.test.local)');

const TITLE = 'E2E admin teszt';
let db: SupabaseClient;
let userId: string;
let projectId: string;

async function cleanup() {
  await db.from('projects').delete().like('title', 'E2E %');
  await db.from('sounds').delete().eq('owner_id', userId);
}

test.beforeAll(async () => {
  const env = Object.fromEntries(fs.readFileSync('.env', 'utf8').split('\n').filter((l) => l.startsWith('VITE_')).map((l) => l.split('=')));
  db = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });
  const { data } = await db.auth.signInWithPassword({ email: email!, password: password! });
  userId = data.user!.id;
  await cleanup();
  // Galériaképes projekt a kezdő projektek képével és hangjaival (az oldalról jönnek, tárhely nem kell).
  const { data: sounds } = await db
    .from('sounds')
    .insert([
      { owner_id: userId, title: 'háttér', path: 'sounds/tenger.mp3' },
      { owner_id: userId, title: 'hang', path: 'sounds/tenger.mp3' },
      { owner_id: userId, title: 'leírás', path: 'sounds/tenger.mp3' },
    ])
    .select('id');
  const [bg, sound, voice] = sounds!.map((s) => s.id);
  const { data: project } = await db
    .from('projects')
    .insert({
      owner_id: userId,
      title: TITLE,
      short_description: 'Teszt.',
      image_path: 'media/tengerpart.svg',
      image_width: 1600,
      image_height: 1000,
      background_sound_id: bg,
    })
    .select('id')
    .single();
  projectId = project!.id;
  await db.from('fields').insert({
    project_id: projectId,
    name: 'Hullám',
    description: 'Hullámok.',
    sound_id: sound,
    description_sound_id: voice,
    shape: { type: 'multipolygon', polygons: [[[0, 0], [400, 0], [400, 400]]] },
  });
  const { error } = await db.from('projects').update({ visibility: 'gallery' }).eq('id', projectId);
  if (error) throw error;
});

test.afterAll(async () => {
  await cleanup();
  await db.auth.signOut();
});

async function login(page: Page) {
  await page.goto('/belepes');
  await page.getByLabel('E-mail cím').fill(email!);
  await page.getByLabel('Jelszó', { exact: true }).fill(password!);
  await page.getByRole('button', { name: 'Belépés' }).click();
  await expect(page).not.toHaveURL(/belepes/);
}

test('admin: levétel okkal, a pedagógus látja, visszatétel, kategóriák', async ({ page }) => {
  await login(page);
  await page.goto('/projektjeim');
  await page.getByRole('link', { name: 'Galéria kezelése' }).click();
  await expect(page.getByRole('heading', { name: 'Galéria kezelése', level: 1 })).toBeVisible();
  const card = page.locator('.project-card', { hasText: TITLE });
  await expect(card).toBeVisible();
  await expectNoAxeViolations(page);

  // Levétel okkal.
  await card.getByRole('button', { name: 'Levétel' }).click();
  const dialog = page.getByRole('alertdialog');
  await dialog.getByLabel('Az ok').fill('Kérlek, javítsd a leírást.');
  await expectNoAxeViolations(page, '[role=alertdialog]');
  await dialog.getByRole('button', { name: 'Levétel' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('heading', { name: /Levett képek/ })).toBeVisible();
  await expect(page.locator('.project-card', { hasText: TITLE })).toContainText('Kérlek, javítsd a leírást.');

  // A pedagógus a Megosztás fülön látja az okot.
  await page.goto(`/szerkeszto/${projectId}`);
  await page.getByRole('tab', { name: 'Megosztás' }).click();
  await expect(page.getByText('Az admin levette a galériáról')).toBeVisible();
  await expect(page.getByText(/Kérlek, javítsd a leírást\./)).toBeVisible();

  // Visszatétel, majd kategóriák.
  await page.goto('/galeria-kezelese');
  const removed = page.locator('.project-card', { hasText: TITLE });
  await removed.getByRole('button', { name: 'Visszatétel' }).click();
  // Visszakerült a galériás képek közé (ott Levétel gomb van, nem Visszatétel).
  await expect(page.locator('.project-card', { hasText: TITLE }).getByRole('button', { name: 'Levétel' })).toBeVisible();
  await page.locator('.project-card', { hasText: TITLE }).getByRole('button', { name: 'Kategóriák' }).click();
  const cats = page.getByRole('dialog');
  await cats.getByRole('row', { name: 'Gyerekrajzok' }).or(cats.getByText('Gyerekrajzok')).first().click();
  await cats.getByRole('button', { name: 'Mentés' }).click();
  await expect(cats).toBeHidden();
  await expect(page.locator('.project-card', { hasText: TITLE })).toContainText('Gyerekrajzok');

  const { data } = await db.from('projects').select('visibility, moderation_note').eq('id', projectId).single();
  expect(data).toEqual({ visibility: 'gallery', moderation_note: null });
});

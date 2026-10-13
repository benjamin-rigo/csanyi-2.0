import { createClient } from '@supabase/supabase-js';
import { expect, test, type Page } from '@playwright/test';
import fs from 'node:fs';
import { expectVisibleFocusOnTabStops } from './helpers';

// Billentyűzetes bejárás a pedagógus oldalon (WCAG 2.1.1, 2.4.3, 2.4.7). Teszt-fiók kell (.env.test.local).
const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;
test.skip(!email || !password, 'nincs teszt-fiók (.env.test.local)');
test.describe.configure({ mode: 'serial' });

async function cleanup() {
  const env = Object.fromEntries(fs.readFileSync('.env', 'utf8').split('\n').filter((l) => l.startsWith('VITE_')).map((l) => l.split('=')));
  const db = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });
  const { data } = await db.auth.signInWithPassword({ email: email!, password: password! });
  await db.from('projects').delete().like('title', 'E2E %');
  const { data: files } = await db.storage.from('images').list(data.user!.id);
  if (files?.length) await db.storage.from('images').remove(files.map((f) => `${data.user!.id}/${f.name}`));
}
test.beforeAll(cleanup);
test.afterAll(cleanup);

/** Belépés csak billentyűzettel. */
async function keyboardLogin(page: Page) {
  await page.goto('/belepes');
  await page.getByRole('heading', { name: 'Belépés' }).waitFor();
  await page.getByLabel('E-mail cím').focus();
  await page.keyboard.type(email!);
  await page.keyboard.press('Tab'); // Elfelejtetted a jelszavad?
  await page.keyboard.press('Tab');
  await page.keyboard.type(password!);
  await page.keyboard.press('Enter');
  await expect(page).not.toHaveURL(/belepes/);
}

test('belépés, Projektjeim és Profil billentyűzettel; mindenhol látszik a fókusz', async ({ page }) => {
  await page.goto('/belepes');
  await page.getByRole('heading', { name: 'Belépés' }).waitFor();
  await expectVisibleFocusOnTabStops(page, 12);
  await keyboardLogin(page);

  await page.goto('/projektjeim');
  await page.getByRole('heading', { name: 'Projektjeim', level: 1 }).waitFor();
  const stops = await expectVisibleFocusOnTabStops(page, 20);
  expect(stops).toContain('Új projekt');

  // Új projekt: a fókusz az ablakba kerül, ott marad, Esc-re vissza a gombra.
  const newButton = page.getByRole('button', { name: 'Új projekt' }).first();
  await newButton.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press('Tab');
    expect(await dialog.evaluate((d) => d.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(newButton).toBeFocused();

  await page.goto('/profil');
  await page.getByRole('heading', { level: 1 }).waitFor();
  await expectVisibleFocusOnTabStops(page, 25);
});

test('szerkesztő billentyűzettel: eszköztár, lefúrás és vissza, hangválasztó', async ({ page }) => {
  await keyboardLogin(page);
  await page.goto('/projektjeim');
  await page.getByRole('button', { name: 'Új projekt' }).first().click();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('dialog').getByRole('button', { name: 'Tallózás' }).click();
  await (await chooser).setFiles('e2e/fixtures/kep.png');
  await page.getByRole('dialog').getByLabel('Cím').fill('E2E billentyűzet');
  await page.getByRole('dialog').getByRole('button', { name: 'Létrehozás' }).click();
  await expect(page).toHaveURL(/szerkeszto\//);
  await page.locator('.draw-frame').waitFor();

  // Eszköztár: egy Tab-lépés, benne nyilakkal; a Pontok billentyűzettel is rajzol.
  await page.getByRole('radio', { name: 'Ecset' }).focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('radio', { name: 'Pontok' })).toBeFocused();
  await page.keyboard.press('Space');
  await expect(page.getByRole('radio', { name: 'Pontok' })).toBeChecked();
  await page.locator('.draw-frame').focus();
  for (const k of ['Enter', 'Shift+ArrowRight', 'Shift+ArrowRight', 'Enter', 'Shift+ArrowDown', 'Shift+ArrowDown', 'Enter']) await page.keyboard.press(k);
  await page.getByRole('button', { name: 'Lezárás' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.draw-field')).toHaveCount(1);

  // A rajzolás kijelölte az új hangmezőt: a panel a részleteken áll. Vissza a listára, a fókusz a hangmező sorára kerül.
  await page.getByRole('button', { name: 'Vissza a hangokhoz' }).focus();
  await page.keyboard.press('Enter');
  const row = page.getByRole('option', { name: /Névtelen hangmező/ });
  await expect(row).toBeFocused();
  // Enter a soron: részletek, a fókusz a névre.
  await page.keyboard.press('Enter');
  await expect(page.getByLabel('Hangmező neve')).toBeFocused();
  await page.keyboard.type('Ház');

  // Hangválasztó: megnyílik, a fókusz bent van, Esc-re vissza a gombra.
  const addSound = page.getByRole('button', { name: 'Hang hozzáadása' });
  await addSound.focus();
  await page.keyboard.press('Enter');
  const picker = page.getByRole('dialog');
  await expect(picker).toBeVisible();
  expect(await picker.evaluate((d) => d.contains(document.activeElement))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(picker).toBeHidden();
  await expect(addSound).toBeFocused();

  // A szerkesztő Tab-sorrendje: mindenhol látszik a fókusz.
  await page.locator('body').click({ position: { x: 1, y: 1 } });
  const stops = await expectVisibleFocusOnTabStops(page, 40);
  expect(stops).toEqual(expect.arrayContaining(['Előnézet', 'Megosztás', 'Hangok']));
});

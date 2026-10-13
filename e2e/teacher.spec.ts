import { createClient } from '@supabase/supabase-js';
import { expect, test, type Page } from '@playwright/test';
import { expectNoAxeViolations } from './helpers';

// A teszt-fiók (E2E_EMAIL, E2E_PASSWORD) a .env.test.local fájlban; nélküle ezek a tesztek kimaradnak.
const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;
test.skip(!email || !password, 'nincs teszt-fiók (.env.test.local)');

const PREFIX = 'E2E ';

/** A tesztek által létrehozott projektek és a teszt-fiók feltöltött képeinek törlése, a teszt-fiók jogaival. */
async function cleanup() {
  const env = Object.fromEntries(
    (await import('node:fs')).readFileSync('.env', 'utf8').split('\n').filter((l) => l.startsWith('VITE_')).map((l) => l.split('=')),
  );
  const db = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });
  const { data } = await db.auth.signInWithPassword({ email: email!, password: password! });
  await db.from('projects').delete().like('title', `${PREFIX}%`);
  const userId = data.user!.id;
  const { data: files } = await db.storage.from('images').list(userId);
  if (files?.length) await db.storage.from('images').remove(files.map((f) => `${userId}/${f.name}`));
  await db.auth.signOut();
}

async function login(page: Page) {
  await page.goto('/belepes');
  await page.getByLabel('E-mail cím').fill(email!);
  await page.getByLabel('Jelszó', { exact: true }).fill(password!);
  await page.getByRole('button', { name: 'Belépés' }).click();
  await expect(page).not.toHaveURL(/belepes/);
}

test.beforeAll(cleanup);
test.afterAll(cleanup);

test('Projektjeim, Profil és a minta: akadálymentes', async ({ page }) => {
  await login(page);
  await page.goto('/projektjeim');
  await expect(page.getByRole('heading', { name: 'Projektjeim', level: 1 })).toBeVisible();
  await expectNoAxeViolations(page);
  await page.goto('/profil');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expectNoAxeViolations(page);
  await page.goto('/minta');
  await expect(page.locator('.draw-frame')).toBeVisible();
  await expectNoAxeViolations(page);
});

test('új projekt: létrehozás, hangmező rajzolása, elnevezés, mentés', async ({ page }) => {
  await login(page);
  await page.goto('/projektjeim');
  await page.getByRole('button', { name: 'Új projekt' }).first().click();
  const dialog = page.getByRole('dialog');
  const chooser = page.waitForEvent('filechooser');
  await dialog.getByRole('button', { name: 'Tallózás' }).click();
  await (await chooser).setFiles('e2e/fixtures/kep.png');
  await dialog.getByLabel('Cím').fill(`${PREFIX}próba`);
  await dialog.getByRole('button', { name: 'Létrehozás' }).click();
  await expect(page).toHaveURL(/szerkeszto\//);
  await expect(page.locator('.draw-frame img, .draw-frame image').first()).toBeVisible();
  await expectNoAxeViolations(page);

  // Ecsettel egy folt a kép közepén: új hangmező lesz belőle.
  const box = (await page.locator('.draw-frame').boundingBox())!;
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await page.mouse.move(cx - 40, cy);
  await page.mouse.down();
  for (let i = 0; i <= 10; i++) await page.mouse.move(cx - 40 + i * 8, cy + (i % 2) * 20);
  await page.mouse.up();
  await expect(page.locator('.draw-field')).toHaveCount(1);

  await page.getByLabel('Hangmező neve').fill('Ház');
  await expect(page.getByText('Automatikusan mentve')).toBeVisible({ timeout: 10_000 });
  await expectNoAxeViolations(page);

  // Újratöltés után is megvan.
  await page.reload();
  await expect(page.locator('.draw-field')).toHaveCount(1);
  await expect(page.getByRole('option', { name: /Ház/ })).toBeVisible();
});

test('Pontok eszköz és visszavonás (alak, név, törlés)', async ({ page }) => {
  await login(page);
  await page.goto('/projektjeim');
  await page.getByRole('button', { name: 'Új projekt' }).first().click();
  const dialog = page.getByRole('dialog');
  const chooser = page.waitForEvent('filechooser');
  await dialog.getByRole('button', { name: 'Tallózás' }).click();
  await (await chooser).setFiles('e2e/fixtures/kep.png');
  await dialog.getByLabel('Cím').fill(`${PREFIX}pontok`);
  await dialog.getByRole('button', { name: 'Létrehozás' }).click();
  await expect(page).toHaveURL(/szerkeszto\//);

  // Pontok: három kattintás és lezárás az első pontra; új hangmező lesz belőle.
  await page.getByRole('radio', { name: 'Pontok' }).or(page.getByRole('button', { name: 'Pontok' })).click();
  const frame = page.locator('.draw-frame');
  const b = (await frame.boundingBox())!;
  const at = (fx: number, fy: number) => page.mouse.click(b.x + b.width * fx, b.y + b.height * fy);
  await at(0.2, 0.2);
  await at(0.6, 0.2);
  await at(0.6, 0.7);
  await expect(page.getByText('3 pont')).toBeVisible();
  await expectNoAxeViolations(page);
  await at(0.2, 0.2);
  await expect(page.locator('.draw-field')).toHaveCount(1);

  // Billentyűzettel egy második rész ugyanabba a hangmezőbe.
  await frame.focus();
  for (const k of ['Shift+ArrowLeft', 'Shift+ArrowLeft', 'Shift+ArrowLeft', 'Shift+ArrowDown', 'Enter', 'Shift+ArrowLeft', 'Enter', 'Shift+ArrowDown', 'Enter']) {
    await page.keyboard.press(k);
  }
  await page.getByRole('button', { name: 'Lezárás' }).click();
  const shape = page.locator('.draw-field-line');
  const twoParts = await shape.getAttribute('d');
  expect(twoParts!.match(/M/g)!.length).toBe(2);

  // Visszavonás: a második rész eltűnik, újra: visszajön.
  await page.getByRole('button', { name: 'Visszavonás' }).click();
  await expect.poll(async () => (await shape.getAttribute('d'))!.match(/M/g)!.length).toBe(1);
  await page.getByRole('button', { name: 'Újra' }).click();
  await expect(shape).toHaveAttribute('d', twoParts!);

  // Név: a gépelés egy lépés, visszavonva üres.
  await page.getByLabel('Hangmező neve').fill('Ház');
  await page.getByRole('button', { name: 'Visszavonás' }).click();
  await expect(page.getByLabel('Hangmező neve')).toHaveValue('');

  // Törlés és visszavonása: újratöltés után is megvan.
  await page.getByRole('button', { name: 'Hangmező törlése' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Törlés' }).click();
  await expect(page.locator('.draw-field')).toHaveCount(0);
  await page.getByRole('button', { name: 'Visszavonás' }).click();
  await expect(page.locator('.draw-field')).toHaveCount(1);
  await expect(page.getByText('Automatikusan mentve')).toBeVisible({ timeout: 10_000 });
  await page.reload();
  await expect(page.locator('.draw-field-line')).toHaveAttribute('d', twoParts!);
});

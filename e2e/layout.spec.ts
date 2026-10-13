import { expect, test, type Page } from '@playwright/test';
import { expectSoundLayout, WIDTHS } from './helpers';

// Elrendezés négy szélességben (döntésnapló): nincs vízszintes görgetés és egymásra csúszó elem.
async function eachWidth(page: Page, check: () => Promise<void> = async () => {}) {
  for (const size of WIDTHS) {
    await page.setViewportSize(size);
    await page.waitForTimeout(300);
    await check();
    await expectSoundLayout(page);
  }
}

test('nyilvános oldalak', async ({ page }) => {
  await page.goto('/');
  await page.locator('.gcard-link').first().waitFor();
  await eachWidth(page);
  await page.goto('/belepes');
  await page.getByRole('heading', { name: 'Belépés' }).waitFor();
  await eachWidth(page);
});

test.describe('pedagógus oldal', () => {
  test.skip(!process.env.E2E_EMAIL || !process.env.E2E_PASSWORD, 'nincs teszt-fiók (.env.test.local)');

  test('Projektjeim, Profil, Galéria kezelése, szerkesztő', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/belepes');
    await page.getByLabel('E-mail cím').fill(process.env.E2E_EMAIL!);
    await page.getByLabel('Jelszó', { exact: true }).fill(process.env.E2E_PASSWORD!);
    await page.getByRole('button', { name: 'Belépés' }).click();
    await expect(page).not.toHaveURL(/belepes/);
    for (const path of ['/projektjeim', '/profil', '/galeria-kezelese']) {
      await page.goto(path);
      await page.getByRole('heading', { level: 1 }).waitFor();
      await page.waitForLoadState('networkidle');
      await eachWidth(page);
    }
    // Szerkesztő (minta): telefonon az üzenet látszik helyette.
    await page.setViewportSize(WIDTHS[0]);
    await page.goto('/minta');
    await page.locator('.draw-frame').waitFor();
    await eachWidth(page, async () => {
      const phone = (page.viewportSize()?.width ?? 0) < 720;
      await expect(page.getByText('A szerkesztő táblagépen vagy számítógépen használható')).toBeVisible({ visible: phone });
    });
  });
});

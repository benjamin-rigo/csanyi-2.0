import { expect, test } from '@playwright/test';
import config from '../public/data/config.json' with { type: 'json' };
import { expectNoAxeViolations } from './helpers';

test('galéria: betölt, akadálymentes, billentyűzettel bejárható', async ({ page, isMobile }) => {
  await page.goto('/');
  const cards = page.locator('.gcard-link');
  await expect(cards.first()).toBeVisible();
  await expectNoAxeViolations(page);
  if (!isMobile) {
    await cards.first().focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/kep\//);
  }
});

test('képnézet: megnyílik a galériából, akadálymentes, Escape-pel vissza', async ({ page, isMobile }) => {
  await page.goto('/');
  const first = page.locator('.gcard-link').first();
  if (isMobile) await first.tap();
  else await first.click();
  await expect(page).toHaveURL(/\/kep\//);
  const fields = page.locator('path.field[role="img"]');
  await expect(fields.first()).toBeAttached();
  await expectNoAxeViolations(page);
  if (!isMobile) {
    // Billentyűzettel a hangmezők sorra fókuszba kerülnek (a megnyitás utáni rövid ideig a fókusz az üdvözlésen marad).
    await page.waitForTimeout(config.viewer.welcomeSettleMs);
    for (let i = 0; i < 6 && !(await fields.first().evaluate((el) => el === document.activeElement)); i++) await page.keyboard.press('Tab');
    await expect(fields.first()).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.locator('.gcard-link').first()).toBeVisible();
  }
});

test('belépés és elfelejtett jelszó: akadálymentes', async ({ page }) => {
  await page.goto('/belepes');
  await expect(page.getByRole('heading', { name: 'Belépés' })).toBeVisible();
  await expectNoAxeViolations(page);
  await page.getByRole('link', { name: 'Elfelejtetted a jelszavad?' }).click();
  await expect(page).toHaveURL(/elfelejtett-jelszo/);
  await expectNoAxeViolations(page);
});

test('védett oldal belépés nélkül a belépésre visz', async ({ page }) => {
  await page.goto('/projektjeim');
  await expect(page).toHaveURL(/belepes/);
});

import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

/**
 * WCAG 2.2 AA axe-ellenőrzés; a react-aria saját, üres bejelentő eleme kimarad.
 * `within`: csak ezen belül (nyitott párbeszédablaknál az ablak, mert az elsötétített háttér nem elérhető).
 */
export async function expectNoAxeViolations(page: Page, within?: string) {
  // Beúszó ablak közben a szöveg még félig átlátszó: az animációk végét megvárjuk.
  await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== 'running'));
  const builder = new AxeBuilder({ page });
  if (within) builder.include(within);
  const result = await builder
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .exclude('[data-live-announcer]')
    .analyze();
  expect(result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
}

/**
 * Végigmegy a Tab-sorrenden (legfeljebb `max` lépés, vagy amíg körbeér), és minden elemnél ellenőrzi,
 * hogy a fókusz látható-e (WCAG 2.4.7): fókuszban másképp néz ki, mint fókusz nélkül. A bejárt elemek neveit adja vissza.
 */
export async function expectVisibleFocusOnTabStops(page: Page, max = 40): Promise<string[]> {
  const stops: string[] = [];
  const hidden: string[] = [];
  for (let i = 0; i < max; i++) {
    await page.keyboard.press('Tab');
    const stop = await page.evaluate(async () => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return null;
      const host = (el.closest('.project-card, .gcard') as HTMLElement) ?? el;
      const look = () =>
        [el, host, el.parentElement!]
          .map((x) => {
            const c = getComputedStyle(x);
            return [c.outlineStyle, c.outlineWidth, c.outlineColor, c.boxShadow, c.borderColor, c.backgroundColor, getComputedStyle(x, '::after').boxShadow].join('|');
          })
          .join('#');
      const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const focused = look();
      el.blur();
      await frame();
      const blurred = look();
      el.focus();
      await frame();
      const name = (el.getAttribute('aria-label') || el.textContent || el.getAttribute('placeholder') || el.tagName).trim().slice(0, 40);
      return { name, visible: focused !== blurred };
    });
    if (!stop) continue;
    if (stops.length && stop.name === stops[0]) break;
    stops.push(stop.name);
    if (!stop.visible) hidden.push(stop.name);
  }
  expect(hidden, 'fókusz nem látszik ezeken').toEqual([]);
  return stops;
}

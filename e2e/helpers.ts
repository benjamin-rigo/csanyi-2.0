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

export const WIDTHS = [
  { width: 1440, height: 900 },
  { width: 1024, height: 768 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
];

/** Elrendezés: nincs vízszintes görgetés, és nem csúszik egymásra két látható, kattintható elem. */
export async function expectSoundLayout(page: Page) {
  const problems = await page.evaluate(() => {
    const out: string[] = [];
    if (document.documentElement.scrollWidth > window.innerWidth + 1) out.push(`vízszintes görgetés (${document.documentElement.scrollWidth}px)`);
    // Láthatatlan: 1 px-es, levágott dobozban van (pl. a csúszka rejtett beviteli eleme vagy a .sr-only),
    // vagy egy görgethető terület nem látható részén van.
    const hidden = (el: HTMLElement) => {
      const own = el.getBoundingClientRect();
      for (let x: HTMLElement | null = el; x; x = x.parentElement) {
        const r = x.getBoundingClientRect();
        if (r.width <= 1 || r.height <= 1 || x.getAttribute('aria-hidden') === 'true') return true;
        const c = getComputedStyle(x);
        const clips = x !== el && (c.overflowX !== 'visible' || c.overflowY !== 'visible');
        if (clips && (own.bottom <= r.top || own.top >= r.bottom || own.right <= r.left || own.left >= r.right)) return true;
      }
      return false;
    };
    const els = [...document.querySelectorAll<HTMLElement>('a, button, input, textarea, [role="radio"], [role="tab"], [role="option"]')].filter((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 2 && r.height > 2 && getComputedStyle(el).visibility !== 'hidden' && !hidden(el);
    });
    const name = (el: HTMLElement) => (el.getAttribute('aria-label') || el.textContent || el.tagName).trim().slice(0, 30);
    for (let i = 0; i < els.length; i++) {
      for (let j = i + 1; j < els.length; j++) {
        const a = els[i], b = els[j];
        if (a.contains(b) || b.contains(a)) continue;
        const r = a.getBoundingClientRect(), q = b.getBoundingClientRect();
        const w = Math.min(r.right, q.right) - Math.max(r.left, q.left);
        const h = Math.min(r.bottom, q.bottom) - Math.max(r.top, q.top);
        if (w > 4 && h > 4) out.push(`átfedés: "${name(a)}" és "${name(b)}"`);
      }
    }
    // Minden elem a saját területén belül marad vízszintesen (nem lóg át a szomszéd panelre).
    for (const el of els) {
      const region = el.parentElement?.closest<HTMLElement>('header, nav, main, aside, footer, [role="dialog"], [role="alertdialog"]');
      if (!region) continue;
      const r = el.getBoundingClientRect(), q = region.getBoundingClientRect();
      if (r.left < q.left - 2 || r.right > q.right + 2) out.push(`kilóg a(z) ${region.tagName.toLowerCase()} területből: "${name(el)}"`);
    }
    return out;
  });
  expect(problems, `elrendezés (${page.viewportSize()?.width}px)`).toEqual([]);
}

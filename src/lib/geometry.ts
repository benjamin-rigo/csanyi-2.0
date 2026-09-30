import type { Point } from './data';

/** Pont a (több részből álló, lyukas) alakban, páros-páratlan szabállyal. */
export function inShape(x: number, y: number, polygons: Point[][]): boolean {
  let inside = false;
  for (const pts of polygons) {
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i];
      const [xj, yj] = pts[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
  }
  return inside;
}

/** SVG útvonal az alakhoz (fill-rule: evenodd). */
export function shapePath(polygons: Point[][]): string {
  return polygons
    .filter((pts) => pts.length > 2)
    .map((pts) => 'M' + pts.map(([x, y]) => `${x},${y}`).join('L') + 'Z')
    .join('');
}

/** A pont távolsága az alak legközelebbi élétől (a lyukak élét is beleértve). */
export function distanceToEdge(x: number, y: number, polygons: Point[][]): number {
  let min = Infinity;
  for (const pts of polygons) {
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [ax, ay] = pts[j];
      const [bx, by] = pts[i];
      const dx = bx - ax;
      const dy = by - ay;
      const len = dx * dx + dy * dy;
      const t = len ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / len)) : 0;
      min = Math.min(min, Math.hypot(x - (ax + t * dx), y - (ay + t * dy)));
    }
  }
  return min;
}

/** Erősség 0–1: kívül 0, belül a széltől mért távolság szerint nő a lágy sáv végéig. */
export function edgeGain(x: number, y: number, polygons: Point[][], fadeWidth: number): number {
  if (!inShape(x, y, polygons)) return 0;
  if (fadeWidth <= 0) return 1;
  return Math.min(1, distanceToEdge(x, y, polygons) / fadeWidth);
}

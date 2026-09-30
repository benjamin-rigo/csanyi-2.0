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

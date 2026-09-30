import type { Point } from './data';

/**
 * Ecsettel festett maszk és sokszög közti átalakítás.
 * A maszk egy vászon (canvas) a kép kicsinyített méretében; az alak a kép saját pixelkoordinátáiban van.
 */

/** Maszk-vászon mérete: a kép hosszabbik oldala legfeljebb ennyi pixel. */
export const MASK_MAX_SIDE = 600;

export function maskSize(imageW: number, imageH: number): { w: number; h: number; scale: number } {
  const scale = Math.min(1, MASK_MAX_SIDE / Math.max(imageW, imageH));
  return { w: Math.round(imageW * scale), h: Math.round(imageH * scale), scale };
}

/** Az alak kirajzolása a maszkra (páros-páratlan kitöltés, így a lyukak megmaradnak). */
export function drawShape(ctx: CanvasRenderingContext2D, polygons: Point[][], scale: number) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  const path = new Path2D();
  for (const pts of polygons) {
    if (pts.length < 3) continue;
    path.moveTo(pts[0][0] * scale, pts[0][1] * scale);
    for (const [x, y] of pts.slice(1)) path.lineTo(x * scale, y * scale);
    path.closePath();
  }
  ctx.fillStyle = '#000';
  ctx.fill(path, 'evenodd');
}

/** A maszk körvonalai sokszögként, a kép koordinátáiban. */
export function traceMask(ctx: CanvasRenderingContext2D, scale: number): Point[][] {
  const { width: w, height: h } = ctx.canvas;
  const alpha = ctx.getImageData(0, 0, w, h).data;
  const inside = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && alpha[(y * w + x) * 4 + 3] > 127;

  // Minden belső pixel határoló élei, az óramutató járásával egyező irányban.
  const W = w + 1;
  const next = new Map<number, number[]>();
  const add = (x1: number, y1: number, x2: number, y2: number) => {
    const key = y1 * W + x1;
    const list = next.get(key);
    if (list) list.push(y2 * W + x2);
    else next.set(key, [y2 * W + x2]);
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!inside(x, y)) continue;
      if (!inside(x, y - 1)) add(x, y, x + 1, y);
      if (!inside(x + 1, y)) add(x + 1, y, x + 1, y + 1);
      if (!inside(x, y + 1)) add(x + 1, y + 1, x, y + 1);
      if (!inside(x - 1, y)) add(x, y + 1, x, y);
    }
  }

  const loops: Point[][] = [];
  for (const [start, targets] of next) {
    while (targets.length) {
      const loop: Point[] = [];
      let v = start;
      do {
        loop.push([v % W, Math.floor(v / W)]);
        const out = next.get(v);
        v = out!.pop()!;
      } while (v !== start);
      const simple = simplifyLoop(loop, 0.8);
      if (simple.length >= 3 && Math.abs(area(simple)) >= 4) {
        loops.push(simple.map(([x, y]) => [round(x / scale), round(y / scale)]));
      }
    }
  }
  return loops;
}

function round(n: number) {
  return Math.round(n * 10) / 10;
}

function area(pts: Point[]): number {
  let a = 0;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) a += (pts[j][0] + pts[i][0]) * (pts[j][1] - pts[i][1]);
  return a / 2;
}

function distToSegment([px, py]: Point, [ax, ay]: Point, [bx, by]: Point): number {
  const dx = bx - ax;
  const dy = by - ay;
  const len = dx * dx + dy * dy;
  const t = len ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len)) : 0;
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** Douglas–Peucker egyszerűsítés nyílt vonalra. */
function simplify(pts: Point[], eps: number): Point[] {
  if (pts.length < 3) return pts;
  let max = 0;
  let index = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = distToSegment(pts[i], pts[0], pts[pts.length - 1]);
    if (d > max) {
      max = d;
      index = i;
    }
  }
  if (max <= eps) return [pts[0], pts[pts.length - 1]];
  return [...simplify(pts.slice(0, index + 1), eps).slice(0, -1), ...simplify(pts.slice(index), eps)];
}

/** Zárt körvonal egyszerűsítése: a kezdőponttól legtávolabbi pontnál kettévágjuk. */
function simplifyLoop(loop: Point[], eps: number): Point[] {
  let far = 0;
  let max = -1;
  for (let i = 1; i < loop.length; i++) {
    const d = Math.hypot(loop[i][0] - loop[0][0], loop[i][1] - loop[0][1]);
    if (d > max) {
      max = d;
      far = i;
    }
  }
  const a = simplify(loop.slice(0, far + 1), eps);
  const b = simplify([...loop.slice(far), loop[0]], eps);
  return [...a.slice(0, -1), ...b.slice(0, -1)];
}

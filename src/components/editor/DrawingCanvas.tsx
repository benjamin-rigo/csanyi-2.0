import { Button } from '@heroui/react';
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { addPolygon, drawShape, maskSize, traceMask } from '../../lib/contour';
import { assetUrl, type Point } from '../../lib/data';
import type { EditorField } from '../../lib/editor';
import { inShape, shapePath } from '../../lib/geometry';
import { t } from '../../lib/i18n';

export type Tool = 'brush' | 'eraser' | 'points';
export type View = { zoom: number; x: number; y: number };
export const FIT: View = { zoom: 1, x: 0, y: 0 };

/** Nagyítás egy képernyőpont körül: a pont alatti képrész a helyén marad. */
export function zoomAt(view: View, frame: DOMRect, sx: number, sy: number, zoom: number): View {
  if (zoom <= 1) return FIT;
  const lx = (sx - frame.left) / view.zoom;
  const ly = (sy - frame.top) / view.zoom;
  return { zoom, x: view.x + sx - zoom * lx - frame.left, y: view.y + sy - zoom * ly - frame.top };
}

/**
 * A rajzterület érzékenysége (config.json → editor.pointer):
 * clickPx: ennyi képernyőpixelnél kisebb mozdulat kattintás (kijelölés), nem festés;
 * closePx: a Pontok első pontja ennyi képernyőpixelen belül lezárja az alakzatot; pointPx: a pontok sugara;
 * keyStep / keyStepBig: a billentyűs célkereszt lépése a kép rövidebb oldalának arányában (Shifttel nagyobb).
 */
export type PointerSettings = { clickPx: number; closePx: number; pointPx: number; keyStep: number; keyStepBig: number };

/** A hangmezők színe a lista sorrendjében (tokenekből). */
export function fieldColorVar(index: number): string {
  return `var(--field-color-${(index % 8) + 1})`;
}

/**
 * Rajzterület (11): a kijelölt hangmezőt ecsettel festjük, radírral javítjuk.
 * Festés közben egy maszkon dolgozunk; a vonás végén körvonallá (sokszöggé) alakítjuk.
 * Ha nincs kijelölt hangmező, a festés új hangmezőt hoz létre (fieldId: null).
 * Pontok (WCAG 2.5.7, húzás nélkül): kattintásonként egy sarokpont; lezáráskor az alakzat a maszkon át olvad a hangmezőbe.
 * Billentyűzettel: nyilak mozgatják a célkeresztet, Enter pontot tesz, Backspace törli az utolsót, Esc elveti.
 */
export function DrawingCanvas({
  imagePath,
  imageWidth,
  imageHeight,
  fields,
  selectedId,
  tool,
  size,
  onStroke,
  onSelectField,
  view,
  onView,
  zoomLimits,
  edgeMaxFraction,
  pointer,
  readOnly = false,
}: {
  imagePath: string;
  imageWidth: number;
  imageHeight: number;
  fields: EditorField[];
  selectedId: string | null;
  tool: Tool;
  size: number;
  onStroke: (fieldId: string | null, polygons: Point[][]) => void;
  onSelectField: (fieldId: string) => void;
  view: View;
  onView: (view: View) => void;
  zoomLimits: { min: number; max: number };
  /** A lágy szél teljes lágyságnál a kép rövidebb oldalának ekkora része (mint a képnézetben). */
  edgeMaxFraction: number;
  pointer: PointerSettings;
  /** Minta: csak kijelölni lehet, festeni nem. */
  readOnly?: boolean;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const start = useRef<{ sx: number; sy: number; moved: boolean } | null>(null);
  const panning = useRef<{ sx: number; sy: number; x: number; y: number } | null>(null);
  // Érintés: az ujjak helye; két ujjnál csippentéses nagyítás és mozgatás a kiinduló állapothoz képest.
  const touches = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; mx: number; my: number; view: View; rect: DOMRect } | null>(null);
  /** Pontok: a lenyomás helye; felengedéskor lesz belőle pont, ha nem mozdult és nem volt csippentés. */
  const pointStart = useRef<{ sx: number; sy: number } | null>(null);
  const [spaceDown, setSpaceDown] = useState(false);
  const viewRef = useRef(view);
  useEffect(() => {
    viewRef.current = view;
  }, [view]);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const maskRef = useRef<CanvasRenderingContext2D | null>(null);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [painting, setPainting] = useState(false);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const { w, h, scale, brushScale } = maskSize(imageWidth, imageHeight);
  const brush = size * brushScale;
  /**
   * A festett maszk a hangmező alakjához (a sokszög-tömbhöz) kötve. A következő vonás erre kerül, nem a simított
   * körvonalból újrarajzolt maszkra, így a hangmező nem kopik vonásról vonásra; visszavonáskor a régi alak maszkja is megvan.
   */
  const masks = useRef(new WeakMap<Point[][], HTMLCanvasElement>());

  function maskFor(polygons: Point[][] | undefined): CanvasRenderingContext2D {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    const kept = polygons && masks.current.get(polygons);
    if (kept && kept.width === w && kept.height === h) ctx.drawImage(kept, 0, 0);
    else if (polygons) drawShape(ctx, polygons, scale);
    return ctx;
  }

  function trace(ctx: CanvasRenderingContext2D, smooth = true): Point[][] {
    const polygons = traceMask(ctx, scale, smooth);
    masks.current.set(polygons, ctx.canvas);
    return polygons;
  }
  const selectedIndex = fields.findIndex((f) => f.id === selectedId);
  const selected = selectedIndex >= 0 ? fields[selectedIndex] : null;
  const canErase = Boolean(selected);

  // Pontok: a lerakott sarokpontok és a billentyűzetes célkereszt, kép-koordinátában.
  const [points, setPoints] = useState<Point[]>([]);
  const [keyCursor, setKeyCursor] = useState<Point | null>(null);
  const pointsMode = tool === 'points' && !readOnly;
  const [prevKey, setPrevKey] = useState(`${tool}|${selectedId}`);
  if (prevKey !== `${tool}|${selectedId}`) {
    setPrevKey(`${tool}|${selectedId}`);
    setPoints([]);
    setKeyCursor(null);
  }

  // Megjelenített méret → maszk-pixel arány (az ecset körvonalához).
  const [displayScale, setDisplayScale] = useState(1);
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const ro = new ResizeObserver(() => setDisplayScale(frame.clientWidth / w));
    ro.observe(frame);
    return () => ro.disconnect();
  }, [w]);

  function toMask(e: React.PointerEvent): { x: number; y: number } {
    const r = frameRef.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * w, y: ((e.clientY - r.top) / r.height) * h };
  }

  function colorOf(index: number): string {
    const probe = frameRef.current!;
    return getComputedStyle(probe)
      .getPropertyValue(`--field-color-${((index < 0 ? fields.length : index) % 8) + 1}`)
      .trim();
  }

  function renderPreview() {
    const preview = previewRef.current?.getContext('2d');
    const mask = maskRef.current;
    if (!preview || !mask) return;
    preview.clearRect(0, 0, w, h);
    preview.globalCompositeOperation = 'source-over';
    preview.drawImage(mask.canvas, 0, 0);
    preview.globalCompositeOperation = 'source-in';
    preview.fillStyle = colorOf(selectedIndex);
    preview.globalAlpha = 0.45;
    preview.fillRect(0, 0, w, h);
    preview.globalAlpha = 1;
  }

  function dab(from: { x: number; y: number }, to: { x: number; y: number }) {
    const ctx = maskRef.current!;
    ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
    ctx.strokeStyle = '#000';
    ctx.fillStyle = '#000';
    ctx.lineWidth = brush;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(to.x, to.y, brush / 2, 0, Math.PI * 2);
    ctx.fill();
  }

  /** Képernyőpixel → kép-egység (a nagyítással együtt). */
  const pxToImage = (px: number) => (px * imageWidth) / (w * displayScale * view.zoom);

  function finishPoints() {
    if (points.length < 3) return;
    const ctx = maskFor(selected?.polygons);
    addPolygon(ctx, points, scale);
    setPoints([]);
    onStroke(selected?.id ?? null, trace(ctx, false));
  }

  function onFrameKey(e: ReactKeyboardEvent) {
    if (!pointsMode) return;
    const step = Math.min(imageWidth, imageHeight) * (e.shiftKey ? pointer.keyStepBig : pointer.keyStep);
    const move: Record<string, Point> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    const c = keyCursor ?? [imageWidth / 2, imageHeight / 2];
    if (move[e.key]) {
      e.preventDefault();
      const [dx, dy] = move[e.key];
      setKeyCursor([Math.min(imageWidth, Math.max(0, c[0] + dx)), Math.min(imageHeight, Math.max(0, c[1] + dy))]);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      setKeyCursor(c);
      setPoints((p) => [...p, c]);
    } else if (e.key === 'Backspace') {
      e.preventDefault();
      setPoints((p) => p.slice(0, -1));
    } else if (e.key === 'Escape' && points.length) {
      e.preventDefault();
      setPoints([]);
    }
  }

  // Szóköz lenyomva: kézi mozgatás (ha nem szövegmezőben gépel).
  useEffect(() => {
    const typing = (e: KeyboardEvent) => (e.target as HTMLElement).closest('input, textarea, [contenteditable]');
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !typing(e)) {
        e.preventDefault();
        setSpaceDown(true);
      }
    };
    const up = (e: KeyboardEvent) => e.code === 'Space' && setSpaceDown(false);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  // Görgő: Ctrl/Cmd (és a trackpad csippentése) nagyít a kurzor körül, különben mozgat.
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const onWheel = (e: WheelEvent) => {
      const v = viewRef.current;
      const frame = frameRef.current!.getBoundingClientRect();
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const zoom = Math.min(zoomLimits.max, Math.max(zoomLimits.min, v.zoom * Math.exp(-e.deltaY / 400)));
        onView(zoomAt(v, frame, e.clientX, e.clientY, zoom));
      } else if (v.zoom > 1) {
        e.preventDefault();
        onView({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY });
      }
    };
    viewport.addEventListener('wheel', onWheel, { passive: false });
    return () => viewport.removeEventListener('wheel', onWheel);
  }, [onView, zoomLimits.max, zoomLimits.min]);

  function hitField(e: React.PointerEvent): EditorField | undefined {
    const r = frameRef.current!.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * imageWidth;
    const y = ((e.clientY - r.top) / r.height) * imageHeight;
    return [...fields].reverse().find((f) => inShape(x, y, f.polygons));
  }

  function pinchState() {
    const [a, b] = [...touches.current.values()];
    return { dist: Math.hypot(a.x - b.x, a.y - b.y) || 1, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
  }

  /** A második ujj leérésekor a félbehagyott vonás vagy pont elvész, a csippentés indul. */
  function startPinch() {
    maskRef.current = null;
    last.current = null;
    start.current = null;
    pointStart.current = null;
    setPainting(false);
    pinch.current = { ...pinchState(), view, rect: frameRef.current!.getBoundingClientRect() };
  }

  function onPointerDown(e: React.PointerEvent) {
    if (e.pointerType === 'touch') {
      e.currentTarget.setPointerCapture(e.pointerId);
      touches.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (touches.current.size === 2) return startPinch();
      if (touches.current.size > 2 || pinch.current) return;
    }
    if (spaceDown || e.button === 1) {
      e.currentTarget.setPointerCapture(e.pointerId);
      panning.current = { sx: e.clientX, sy: e.clientY, x: view.x, y: view.y };
      return;
    }
    if (readOnly) {
      const hit = e.button === 0 ? hitField(e) : undefined;
      if (hit) onSelectField(hit.id);
      return;
    }
    if (pointsMode) {
      if (e.button === 0) pointStart.current = { sx: e.clientX, sy: e.clientY };
      return;
    }
    if (e.button !== 0 || (tool === 'eraser' && !canErase)) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    start.current = { sx: e.clientX, sy: e.clientY, moved: false };
    maskRef.current = maskFor(selected?.polygons);
    const p = toMask(e);
    last.current = p;
    dab(p, p);
    setPainting(true);
    renderPreview();
  }

  function onPointerMove(e: React.PointerEvent) {
    if (touches.current.has(e.pointerId)) touches.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch.current) {
      if (touches.current.size < 2) return;
      const p = pinch.current;
      const now = pinchState();
      const zoom = Math.min(zoomLimits.max, Math.max(zoomLimits.min, (p.view.zoom * now.dist) / p.dist));
      const anchored = zoomAt(p.view, p.rect, p.mx, p.my, zoom);
      onView(zoom <= 1 ? FIT : { zoom, x: anchored.x + now.mx - p.mx, y: anchored.y + now.my - p.my });
      return;
    }
    if (panning.current) {
      const pan = panning.current;
      onView({ ...view, x: pan.x + e.clientX - pan.sx, y: pan.y + e.clientY - pan.sy });
      return;
    }
    const p = toMask(e);
    setCursor(p);
    if (start.current && Math.hypot(e.clientX - start.current.sx, e.clientY - start.current.sy) > pointer.clickPx) start.current.moved = true;
    if (!painting || !last.current) return;
    dab(last.current, p);
    last.current = p;
    renderPreview();
  }

  function addPoint(e: React.PointerEvent) {
    const down = pointStart.current;
    pointStart.current = null;
    if (!down || Math.hypot(e.clientX - down.sx, e.clientY - down.sy) > pointer.clickPx) return;
    const r = frameRef.current!.getBoundingClientRect();
    const p: Point = [((e.clientX - r.left) / r.width) * imageWidth, ((e.clientY - r.top) / r.height) * imageHeight];
    const first = points[0];
    if (points.length >= 3 && Math.hypot(p[0] - first[0], p[1] - first[1]) <= pxToImage(pointer.closePx)) finishPoints();
    else setPoints([...points, p]);
    setKeyCursor(null);
  }

  function onPointerUp(e: React.PointerEvent) {
    if (touches.current.delete(e.pointerId) && pinch.current) {
      // A csippentés akkor ér véget, amikor minden ujj felemelkedett.
      if (touches.current.size === 0) pinch.current = null;
      return;
    }
    if (panning.current) {
      panning.current = null;
      return;
    }
    if (pointsMode) return addPoint(e);
    if (!painting || !maskRef.current) return;
    const click = start.current && !start.current.moved;
    start.current = null;
    // Kattintás egy másik hangmezőre: kijelölés, nem festés.
    const hit = click ? hitField(e) : undefined;
    const polygons = hit && hit.id !== selectedId ? null : trace(maskRef.current);
    maskRef.current = null;
    last.current = null;
    setPainting(false);
    if (hit && hit.id !== selectedId) onSelectField(hit.id);
    else if (polygons) onStroke(selected?.id ?? null, polygons);
  }

  return (
    <>
      <div ref={viewportRef} className={`draw-viewport${spaceDown ? ' is-panning' : ''}`}>
        <div
          ref={frameRef}
          className={`draw-frame${readOnly ? ' is-readonly' : tool === 'eraser' && !canErase ? ' is-disabled' : pointsMode ? ' is-points' : ''}`}
          style={
            {
              '--ratio': `${imageWidth} / ${imageHeight}`,
              transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`,
            } as CSSProperties
          }
          role="img"
          aria-label={t('teacher.editor.canvasLabel')}
          tabIndex={pointsMode ? 0 : undefined}
          aria-describedby={pointsMode ? 'points-help' : undefined}
          onKeyDown={onFrameKey}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onPointerLeave={() => setCursor(null)}
        >
          <img src={assetUrl(imagePath)} alt="" draggable={false} />
          <svg viewBox={`0 0 ${imageWidth} ${imageHeight}`} aria-hidden="true">
            <defs>
              {/* Lágy szél: a kitöltés a széltől befelé, a lágysággal arányos sávban erősödik (mint a hang a képnézetben).
                  Az alakot a sáv felével beljebb húzzuk, majd elmossuk: így a kitöltés a szélen 0, a sáv végén teljes. */}
              {fields.map((f) => {
                const band = f.softness * edgeMaxFraction * Math.min(imageWidth, imageHeight);
                return band > 0 ? (
                  <filter
                    key={f.id}
                    id={`soft-${f.id}`}
                    filterUnits="userSpaceOnUse"
                    primitiveUnits="userSpaceOnUse"
                    x={0}
                    y={0}
                    width={imageWidth}
                    height={imageHeight}
                  >
                    <feMorphology operator="erode" radius={band / 2} />
                    <feGaussianBlur stdDeviation={band / 4} />
                  </filter>
                ) : null;
              })}
            </defs>
            {fields.map((f, i) =>
              painting && f.id === selectedId ? null : (
                // Körvonal nincs (döntésnapló, 2026-11-18): a kijelölt hangmező erősebb kitöltést kap, a többi halványabbat.
                <g
                  key={f.id}
                  className={`draw-field${f.id === selectedId ? ' is-selected' : ''}`}
                  style={{ '--c': fieldColorVar(i) } as CSSProperties}
                >
                  {/* Egyenletes alap: az alak mintás képen is látszik; rajta a lágy szélű, erősebb réteg. */}
                  <path d={shapePath(f.polygons)} fillRule="evenodd" className="draw-field-base" />
                  <path
                    d={shapePath(f.polygons)}
                    fillRule="evenodd"
                    className="draw-field-fill"
                    filter={f.softness > 0 ? `url(#soft-${f.id})` : undefined}
                  />
                </g>
              ),
            )}
            {pointsMode && (points.length > 0 || keyCursor) && (
              <g
                className="draw-points"
                style={{ '--c': fieldColorVar(selectedIndex < 0 ? fields.length : selectedIndex) } as CSSProperties}
              >
                <polyline points={[...points, ...(keyCursor && points.length ? [keyCursor] : [])].map((p) => p.join(',')).join(' ')} />
                {points.map((p, i) => (
                  <circle
                    key={i}
                    cx={p[0]}
                    cy={p[1]}
                    r={pxToImage(i === 0 && points.length >= 3 ? pointer.closePx : pointer.pointPx)}
                    className={i === 0 ? 'is-first' : ''}
                  />
                ))}
                {keyCursor && <circle cx={keyCursor[0]} cy={keyCursor[1]} r={pxToImage(pointer.closePx)} className="key-cursor" />}
              </g>
            )}
          </svg>
          <canvas ref={previewRef} width={w} height={h} className={painting ? '' : 'is-hidden'} aria-hidden="true" />
          {cursor && !spaceDown && !readOnly && !pointsMode && (
            <span
              className="brush-cursor"
              aria-hidden="true"
              style={
                {
                  left: cursor.x * displayScale,
                  top: cursor.y * displayScale,
                  '--d': `${brush * displayScale}px`,
                } as CSSProperties
              }
            />
          )}
        </div>
      </div>
      {pointsMode && (
        <div className="points-bar">
          <span role="status" className="points-count">
            {t('teacher.editor.points.count', { n: points.length })}
          </span>
          <Button size="sm" variant="outline" isDisabled={!points.length} onPress={() => setPoints([])}>
            {t('teacher.editor.points.cancel')}
          </Button>
          <Button size="sm" isDisabled={points.length < 3} onPress={finishPoints}>
            {t('teacher.editor.points.finish')}
          </Button>
        </div>
      )}
    </>
  );
}

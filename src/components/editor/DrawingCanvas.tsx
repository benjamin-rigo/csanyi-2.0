import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { drawShape, maskSize, traceMask } from '../../lib/contour';
import { assetUrl, type Point } from '../../lib/data';
import type { EditorField } from '../../lib/editor';
import { inShape, shapePath } from '../../lib/geometry';
import { t } from '../../lib/i18n';

export type Tool = 'brush' | 'eraser';
export type View = { zoom: number; x: number; y: number };
export const FIT: View = { zoom: 1, x: 0, y: 0 };

/** Nagyítás egy képernyőpont körül: a pont alatti képrész a helyén marad. */
export function zoomAt(view: View, frame: DOMRect, sx: number, sy: number, zoom: number): View {
  if (zoom <= 1) return FIT;
  const lx = (sx - frame.left) / view.zoom;
  const ly = (sy - frame.top) / view.zoom;
  return { zoom, x: view.x + sx - zoom * lx - frame.left, y: view.y + sy - zoom * ly - frame.top };
}

/** Ennyi képernyőpixelnél kisebb mozdulat kattintásnak számít (kijelölés), nem festésnek. */
const CLICK_PX = 4;

/** A hangmezők színe a lista sorrendjében (tokenekből). */
export function fieldColorVar(index: number): string {
  return `var(--field-color-${(index % 8) + 1})`;
}

/**
 * Rajzterület (11): a kijelölt hangmezőt ecsettel festjük, radírral javítjuk.
 * Festés közben egy maszkon dolgozunk; a vonás végén körvonallá (sokszöggé) alakítjuk.
 * Ha nincs kijelölt hangmező, a festés új hangmezőt hoz létre (fieldId: null).
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
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const start = useRef<{ sx: number; sy: number; moved: boolean } | null>(null);
  const panning = useRef<{ sx: number; sy: number; x: number; y: number } | null>(null);
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
  const { w, h, scale } = maskSize(imageWidth, imageHeight);
  const selectedIndex = fields.findIndex((f) => f.id === selectedId);
  const selected = selectedIndex >= 0 ? fields[selectedIndex] : null;
  const canErase = Boolean(selected);

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
    ctx.lineWidth = size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(to.x, to.y, size / 2, 0, Math.PI * 2);
    ctx.fill();
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

  function onPointerDown(e: React.PointerEvent) {
    if (spaceDown || e.button === 1) {
      e.currentTarget.setPointerCapture(e.pointerId);
      panning.current = { sx: e.clientX, sy: e.clientY, x: view.x, y: view.y };
      return;
    }
    if (e.button !== 0 || (tool === 'eraser' && !canErase)) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    start.current = { sx: e.clientX, sy: e.clientY, moved: false };
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    if (selected) drawShape(ctx, selected.polygons, scale);
    maskRef.current = ctx;
    const p = toMask(e);
    last.current = p;
    dab(p, p);
    setPainting(true);
    renderPreview();
  }

  function onPointerMove(e: React.PointerEvent) {
    if (panning.current) {
      const pan = panning.current;
      onView({ ...view, x: pan.x + e.clientX - pan.sx, y: pan.y + e.clientY - pan.sy });
      return;
    }
    const p = toMask(e);
    setCursor(p);
    if (start.current && Math.hypot(e.clientX - start.current.sx, e.clientY - start.current.sy) > CLICK_PX) start.current.moved = true;
    if (!painting || !last.current) return;
    dab(last.current, p);
    last.current = p;
    renderPreview();
  }

  function onPointerUp(e: React.PointerEvent) {
    if (panning.current) {
      panning.current = null;
      return;
    }
    if (!painting || !maskRef.current) return;
    const click = start.current && !start.current.moved;
    start.current = null;
    // Kattintás egy másik hangmezőre: kijelölés, nem festés.
    const hit = click ? hitField(e) : undefined;
    const polygons = hit && hit.id !== selectedId ? null : traceMask(maskRef.current, scale);
    maskRef.current = null;
    last.current = null;
    setPainting(false);
    if (hit && hit.id !== selectedId) onSelectField(hit.id);
    else if (polygons) onStroke(selected?.id ?? null, polygons);
  }

  return (
    <div ref={viewportRef} className={`draw-viewport${spaceDown ? ' is-panning' : ''}`}>
      <div
        ref={frameRef}
        className={`draw-frame${tool === 'eraser' && !canErase ? ' is-disabled' : ''}`}
        style={
          {
            '--ratio': `${imageWidth} / ${imageHeight}`,
            transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`,
          } as CSSProperties
        }
        role="img"
        aria-label={t('teacher.editor.canvasLabel')}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={() => setCursor(null)}
      >
        <img src={assetUrl(imagePath)} alt="" draggable={false} />
        <svg viewBox={`0 0 ${imageWidth} ${imageHeight}`} aria-hidden="true">
          {fields.map((f, i) =>
            painting && f.id === selectedId ? null : (
              <path
                key={f.id}
                d={shapePath(f.polygons)}
                fillRule="evenodd"
                className={`draw-field${f.id === selectedId ? ' is-selected' : ''}`}
                style={{ '--c': fieldColorVar(i) } as CSSProperties}
              />
            ),
          )}
        </svg>
        <canvas ref={previewRef} width={w} height={h} className={painting ? '' : 'is-hidden'} aria-hidden="true" />
        {cursor && !spaceDown && (
          <span
            className="brush-cursor"
            aria-hidden="true"
            style={
              {
                left: cursor.x * displayScale,
                top: cursor.y * displayScale,
                '--d': `${size * displayScale}px`,
              } as CSSProperties
            }
          />
        )}
      </div>
    </div>
  );
}

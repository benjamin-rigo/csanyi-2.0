import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { drawShape, maskSize, traceMask } from '../../lib/contour';
import { assetUrl, type Point } from '../../lib/data';
import type { EditorField } from '../../lib/editor';
import { shapePath } from '../../lib/geometry';
import { t } from '../../lib/i18n';

export type Tool = 'brush' | 'eraser';

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
}: {
  imagePath: string;
  imageWidth: number;
  imageHeight: number;
  fields: EditorField[];
  selectedId: string | null;
  tool: Tool;
  size: number;
  onStroke: (fieldId: string | null, polygons: Point[][]) => void;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
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
    return getComputedStyle(probe).getPropertyValue(`--field-color-${((index < 0 ? fields.length : index) % 8) + 1}`).trim();
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

  function onPointerDown(e: React.PointerEvent) {
    if (e.button !== 0 || (tool === 'eraser' && !canErase)) return;
    e.currentTarget.setPointerCapture(e.pointerId);
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
    const p = toMask(e);
    setCursor(p);
    if (!painting || !last.current) return;
    dab(last.current, p);
    last.current = p;
    renderPreview();
  }

  function onPointerUp() {
    if (!painting || !maskRef.current) return;
    const polygons = traceMask(maskRef.current, scale);
    maskRef.current = null;
    last.current = null;
    setPainting(false);
    onStroke(selected?.id ?? null, polygons);
  }

  return (
    <div
      ref={frameRef}
      className={`draw-frame${tool === 'eraser' && !canErase ? ' is-disabled' : ''}`}
      style={{ '--ratio': `${imageWidth} / ${imageHeight}` } as CSSProperties}
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
      {cursor && (
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
  );
}

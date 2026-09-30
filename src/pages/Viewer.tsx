import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { Button } from '@heroui/react';
import type { Config, Gallery, Point, Project } from '../lib/data';
import { t } from '../lib/i18n';
import { detectPlatform } from '../lib/device';
import { preload, SceneAudio } from '../lib/audio';
import { Icon } from '../components/Icon';

function inPolygon(x: number, y: number, pts: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function Viewer({ gallery, config }: { gallery: Gallery; config: Config }) {
  const { id } = useParams();
  const project = gallery.projects.find((p) => p.id === id);
  if (!project) {
    return (
      <main className="viewer viewer-missing">
        <h1>{t('viewer.notFound')}</h1>
        <Link to="/" className="button button--outline btn-on-dark">
          {t('viewer.backToGallery')}
        </Link>
      </main>
    );
  }
  return <Scene key={project.id} project={project} config={config} />;
}

function Scene({ project, config }: { project: Project; config: Config }) {
  const navigate = useNavigate();
  const location = useLocation();
  const welcomeRef = useRef<HTMLParagraphElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const foundRef = useRef(false);
  const [active, setActive] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [reminder, setReminder] = useState('');
  const v = config.viewer;

  // Az effektben jön létre, hogy leválasztás után (StrictMode, új kép) mindig friss, nem leállított példány legyen.
  const audioRef = useRef<SceneAudio | null>(null);
  useEffect(() => {
    const audio = new SceneAudio({
      background: project.background,
      startCue: v.startCue,
      fadeInMs: v.backgroundFadeInMs,
      fadeOutMs: v.backgroundFadeOutMs,
      duckLevel: v.backgroundDuckLevel,
      fieldFadeMs: v.fieldFadeMs,
    });
    audioRef.current = audio;
    return () => {
      audio.dispose();
      audioRef.current = null;
    };
  }, [project.background, v]);

  const exitText = t(`viewer.exit.${detectPlatform()}`);
  const welcome = t('viewer.welcome', { title: project.title, exit: exitText });

  // Megnyitás: cím, hangok előtöltése, a felolvasó egyszer felolvassa az üdvözlést.
  useEffect(() => {
    document.title = t('viewer.documentTitle', { title: project.title });
    preload([v.startCue, project.background, ...project.fields.map((f) => f.sound)]);
    const id = window.setTimeout(() => welcomeRef.current?.focus(), 50);
    return () => window.clearTimeout(id);
  }, [project, v.startCue]);

  // Emlékeztető, ha a gyerek nem talál hangmezőt. Az első találat után soha többé.
  useEffect(() => {
    let count = 0;
    let timer = 0;
    let show = 0;
    const schedule = () => {
      timer = window.setTimeout(() => {
        if (foundRef.current) return;
        count += 1;
        setReminder('');
        show = window.setTimeout(() => setReminder(t('viewer.reminder')), 50);
        if (count < v.reminderMax) schedule();
      }, v.reminderDelayMs);
    };
    schedule();
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(show);
    };
  }, [v.reminderDelayMs, v.reminderMax]);

  const activate = useCallback(
    (fieldId: string | null) => {
      setActive(fieldId);
      const field = project.fields.find((f) => f.id === fieldId) ?? null;
      if (field) {
        foundRef.current = true;
        setReminder('');
      }
      audioRef.current?.setField(field?.id ?? null, field?.sound ?? null);
    },
    [project.fields],
  );

  const exit = useCallback(() => {
    // Ha a galériából jött, vissza lépünk (így a rendszer vissza mozdulata is ugyanígy működik).
    if (location.key !== 'default') navigate(-1);
    else navigate('/');
  }, [location.key, navigate]);

  // Első érintés vagy billentyű: indító jel és háttérhang. Esc: kilépés.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        exit();
        return;
      }
      void audioRef.current?.start();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [exit]);

  const hitTest = useCallback(
    (clientX: number, clientY: number) => {
      const frame = frameRef.current;
      if (!frame) return;
      const r = frame.getBoundingClientRect();
      const x = ((clientX - r.left) / r.width) * project.image.width;
      const y = ((clientY - r.top) / r.height) * project.image.height;
      const hit = project.fields.find((f) => inPolygon(x, y, f.points));
      activate(hit?.id ?? null);
    },
    [activate, project],
  );

  // Érintés felolvasó nélkül: simogatás. (Felolvasóval a hangmezők fókusza indítja a hangot.)
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const onStart = (e: TouchEvent) => {
      setTouched(true);
      void audioRef.current?.start();
      const p = e.touches[0];
      hitTest(p.clientX, p.clientY);
    };
    const onMove = (e: TouchEvent) => {
      e.preventDefault();
      const p = e.touches[0];
      hitTest(p.clientX, p.clientY);
    };
    const onEnd = () => activate(null);
    frame.addEventListener('touchstart', onStart, { passive: true });
    frame.addEventListener('touchmove', onMove, { passive: false });
    frame.addEventListener('touchend', onEnd);
    frame.addEventListener('touchcancel', onEnd);
    return () => {
      frame.removeEventListener('touchstart', onStart);
      frame.removeEventListener('touchmove', onMove);
      frame.removeEventListener('touchend', onEnd);
      frame.removeEventListener('touchcancel', onEnd);
    };
  }, [activate, hitTest]);

  const activeField = project.fields.find((f) => f.id === active);
  const showWelcomeCaption = !touched && !activeField;
  const caption = activeField ? (
    <>
      <strong>{activeField.name}.</strong> {activeField.description}
    </>
  ) : reminder && !touched ? (
    reminder
  ) : showWelcomeCaption ? (
    t('viewer.welcomeCaption')
  ) : reminder ? (
    reminder
  ) : null;

  return (
    <main className="viewer">
      <header className="viewer-header">
        <Button variant="outline" className="btn-on-dark" onPress={exit}>
          <Icon name="back" />
          {t('viewer.back')}
        </Button>
        <h1 className="viewer-title">{project.title}</h1>
      </header>

      <p ref={welcomeRef} tabIndex={-1} className="sr-only welcome">
        {welcome}
      </p>

      <div className="scene">
        <div
          ref={frameRef}
          className="scene-frame"
          style={{ '--ratio': `${project.image.width} / ${project.image.height}` } as React.CSSProperties}
          onPointerDown={(e) => {
            if (e.pointerType === 'mouse') {
              setTouched(true);
              void audioRef.current?.start();
            }
          }}
          onPointerMove={(e) => e.pointerType === 'mouse' && hitTest(e.clientX, e.clientY)}
          onPointerLeave={(e) => e.pointerType === 'mouse' && activate(null)}
        >
          <img src={project.image.src} alt="" aria-hidden="true" draggable={false} />
          <svg
            viewBox={`0 0 ${project.image.width} ${project.image.height}`}
            role="none"
            focusable="false"
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) activate(null);
            }}
          >
            {project.fields.map((f) => (
              <polygon
                key={f.id}
                points={f.points.map((p) => p.join(',')).join(' ')}
                role="img"
                aria-label={f.description}
                tabIndex={0}
                className={`field${f.id === active ? ' is-active' : ''}`}
                onFocus={() => activate(f.id)}
              />
            ))}
          </svg>
          {caption && (
            <div className="caption" aria-hidden="true">
              {caption}
            </div>
          )}
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        {reminder}
      </p>
    </main>
  );
}

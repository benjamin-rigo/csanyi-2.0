import type React from 'react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import { Button } from '@heroui/react';
import { useSharedProject, type Config, type Gallery, type Project, type Sound, type SoundField } from '../lib/data';
import { t } from '../lib/i18n';
import { detectPlatform } from '../lib/device';
import { preload, SceneAudio } from '../lib/audio';
import { Icon } from '../components/Icon';
import { ButtonLink } from '../components/SiteHeader';
import { edgeGain, shapePath } from '../lib/geometry';

export function Viewer({ gallery, config }: { gallery: Gallery; config: Config }) {
  const { id } = useParams();
  const inGallery = gallery.projects.find((p) => p.id === id);
  // Ami nincs a galériában, az linkkel megosztott is lehet.
  const shared = useSharedProject(id, Boolean(inGallery));
  const project = inGallery ?? (shared.status === 'ready' ? shared.data : null);
  if (!inGallery && shared.status === 'loading') {
    return (
      <main className="viewer viewer-missing" aria-busy="true">
        <p>{t('app.loading')}</p>
      </main>
    );
  }
  if (!project) {
    return (
      <main className="viewer viewer-missing">
        <h1>{t('viewer.notFound')}</h1>
        <ButtonLink href="/" variant="secondary">
          {t('viewer.backToGallery')}
        </ButtonLink>
      </main>
    );
  }
  return <Scene key={project.id} project={project} config={config} />;
}

function Scene({ project, config }: { project: Project; config: Config }) {
  const navigate = useNavigate();
  const location = useLocation();
  const welcomeRef = useRef<HTMLHeadingElement>(null);
  const openedAt = useRef(0);
  const frameRef = useRef<HTMLDivElement>(null);
  const foundRef = useRef(false);
  const activeRef = useRef<string | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [reminder, setReminder] = useState('');
  const v = config.viewer;
  // Kísérlet: néma elem az üres részen, hogy a VoiceOver ne ugorjon a legközelebbi hangmezőre.
  // A „kép” szerepet a VoiceOver akkor is kimondja, ha felülírjuk; ezért a szerepet cseréljük, három változatban.
  const mod = new URLSearchParams(location.search).get('mod');
  const fillerRoles: Record<string, string | undefined> = { kitoltes: 'group', kitoltes2: undefined, kitoltes3: 'text' };
  const filler = mod && mod in fillerRoles ? { role: fillerRoles[mod] } : null;
  // Kép nélküli (félkész, linkkel megosztott) projektnél is legyen képarány.
  const imgW = project.image.width ?? 4;
  const imgH = project.image.height ?? 3;

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

  const platform = detectPlatform();
  const welcome = t('viewer.welcome', {
    title: project.title,
    exit: t(`viewer.exit.${platform}`),
    tip: platform === 'desktop' ? '' : t('viewer.screenReaderTip'),
  });

  // Az üdvözlés azonnal kap fókuszt, mielőtt a felolvasó mást kezdene mondani.
  useLayoutEffect(() => {
    openedAt.current = performance.now();
    welcomeRef.current?.focus();
  }, [project.id]);

  // Megnyitás: cím, hangok előtöltése, a felolvasó egyszer felolvassa az üdvözlést.
  useEffect(() => {
    document.title = t('viewer.documentTitle', { title: project.title });
    preload([v.startCue, project.background, ...project.fields.map((f) => f.sound)].filter((s): s is Sound => s !== null));
  }, [project, v.startCue]);

  // A hangmező fókuszkerete csak billentyűzettel látszik; érintésnél és felolvasóval zavaró.
  useEffect(() => {
    const root = document.documentElement;
    const onKey = () => (root.dataset.input = 'keyboard');
    const onPointer = () => delete root.dataset.input;
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('pointerdown', onPointer, true);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('pointerdown', onPointer, true);
      delete root.dataset.input;
    };
  }, []);

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

  // A „megtalált” hangmező: ennek a neve látszik a feliratban, és ez számít az emlékeztetőnél.
  const markActive = useCallback((field: SoundField | null) => {
    setActive(field?.id ?? null);
    if (field) {
      foundRef.current = true;
      setReminder('');
    }
    activeRef.current = field?.id ?? null;
  }, []);

  // Fókusz (felolvasó, billentyűzet): egyetlen hangmező, teljes erővel.
  const activate = useCallback(
    (fieldId: string | null) => {
      const field = project.fields.find((f) => f.id === fieldId) ?? null;
      markActive(field);
      audioRef.current?.setField(field?.id ?? null, field?.sound ?? null);
    },
    [markActive, project.fields],
  );

  // iPaden a VoiceOver megnyitás után a koppintás helyén lévő hangmezőre ugorhat; ilyenkor vissza az üdvözléshez.
  const onFieldFocus = useCallback(
    (fieldId: string, e: React.FocusEvent) => {
      if (e.timeStamp - openedAt.current < v.welcomeSettleMs) {
        welcomeRef.current?.focus();
        return;
      }
      activate(fieldId);
    },
    [activate, v.welcomeSettleMs],
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
      const x = ((clientX - r.left) / r.width) * imgW;
      const y = ((clientY - r.top) / r.height) * imgH;
      // Lágy szél: a hangmező szélétől befelé erősödik a hang; az átfedő hangmezők együtt szólnak.
      const edge = v.edgeMaxFraction * Math.min(imgW, imgH);
      const hits = project.fields.map((f) => ({ field: f, gain: edgeGain(x, y, f.polygons, f.softness * edge) })).filter((h) => h.gain > 0);
      audioRef.current?.setFields(hits.flatMap(({ field, gain }) => (field.sound ? [{ id: field.id, sound: field.sound, gain }] : [])));
      const strongest = hits.reduce<(typeof hits)[number] | null>((best, h) => (!best || h.gain > best.gain ? h : best), null);
      const found = strongest && strongest.gain >= v.descriptionThreshold ? strongest.field : null;
      // Érintés és egér csak kikapcsolt felolvasónál jut ide, ezért a felvett leírás nem beszél a felolvasóra.
      if (found?.descriptionSound && found.id !== activeRef.current) audioRef.current?.speak(found.id, found.descriptionSound);
      markActive(found);
    },
    [imgH, imgW, markActive, project.fields, v.descriptionThreshold, v.edgeMaxFraction],
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
    // Nincs main és header tájékozódási pont: a felolvasó különben „központi jellegzetes hely”-et mond.
    <div className="viewer">
      <div className="viewer-header">
        <Button variant="secondary" onPress={exit}>
          <Icon name="back" />
          {t('viewer.back')}
        </Button>
        {/* A felolvasó a teljes üdvözlést hallja (benne a cím), a látó gyerek a címet látja. */}
        <h1 ref={welcomeRef} tabIndex={-1} className="viewer-title">
          <span className="sr-only">{welcome}</span>
          <span aria-hidden="true">{project.title}</span>
        </h1>
      </div>

      <div className="scene">
        <div
          ref={frameRef}
          className="scene-frame"
          style={{ '--ratio': `${imgW} / ${imgH}` } as React.CSSProperties}
          onPointerDown={(e) => {
            if (e.pointerType === 'mouse') {
              setTouched(true);
              void audioRef.current?.start();
            }
          }}
          onPointerMove={(e) => e.pointerType === 'mouse' && hitTest(e.clientX, e.clientY)}
          onPointerLeave={(e) => e.pointerType === 'mouse' && activate(null)}
        >
          {project.image.src && <img src={project.image.src} alt="" aria-hidden="true" draggable={false} />}
          <svg
            viewBox={`0 0 ${imgW} ${imgH}`}
            role="none"
            focusable="false"
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) activate(null);
            }}
          >
            {filler && (
              <rect
                className="field-filler"
                x={0}
                y={0}
                width={imgW}
                height={imgH}
                role={filler.role}
                aria-label={'\u00a0'}
                // Fókuszálható, de nincs a Tab sorrendben: amikor a VoiceOver rálép, a hangmező elhallgat.
                tabIndex={-1}
                onFocus={() => activate(null)}
              />
            )}
            {project.fields.map((f) => (
              <path
                key={f.id}
                d={shapePath(f.polygons)}
                fillRule="evenodd"
                role="img"
                aria-label={f.description}
                tabIndex={0}
                className={`field${f.id === active ? ' is-active' : ''}`}
                onFocus={(e) => onFieldFocus(f.id, e)}
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
    </div>
  );
}

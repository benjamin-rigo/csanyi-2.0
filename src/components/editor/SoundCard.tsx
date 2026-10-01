import { useEffect, useState, type ReactNode } from 'react';
import { Button, Card } from '@heroui/react';
import { assetUrl } from '../../lib/data';
import type { EditorSound } from '../../lib/editor';
import { t } from '../../lib/i18n';
import { Icon } from '../Icon';

// Egyetlen közös lejátszó: egyszerre csak egy előhallgatás szól.
const player = new Audio();
let playingSrc: string | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());
player.addEventListener('ended', () => {
  playingSrc = null;
  notify();
});

export function stopPreview() {
  player.pause();
  playingSrc = null;
  notify();
}

export function usePreview(src: string | null) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const l = () => setTick((n) => n + 1);
    listeners.add(l);
    return () => void listeners.delete(l);
  }, []);
  const playing = src !== null && playingSrc === src;
  const toggle = () => {
    if (!src) return;
    if (playing) return stopPreview();
    player.src = src;
    playingSrc = src;
    void player.play().catch(stopPreview);
    notify();
  };
  return { playing, toggle };
}

export function formatDuration(ms: number | null): string {
  if (ms === null) return '';
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function PlayButton({ src, title }: { src: string; title: string }) {
  const { playing, toggle } = usePreview(src);
  return (
    <Button
      isIconOnly
      size="sm"
      aria-label={t(playing ? 'teacher.editor.sound.pause' : 'teacher.editor.sound.play', { title })}
      onPress={toggle}
    >
      <Icon name={playing ? 'pause' : 'play'} size={16} />
    </Button>
  );
}

/** Kiválasztott hang: lejátszás, cím, forrás és hossz, jobbra egy művelet (pl. Csere). */
export function SoundCard({ sound, loops, action }: { sound: EditorSound; loops?: boolean; action?: ReactNode }) {
  const meta = [
    sound.source === 'library' ? t('teacher.editor.sound.library') : t('teacher.editor.sound.own'),
    formatDuration(sound.durationMs),
    loops ? t('teacher.editor.sound.loops') : '',
  ].filter(Boolean);
  return (
    <Card variant="secondary" className="sound-card">
      <PlayButton src={assetUrl(sound.path)} title={sound.title} />
      <span className="sound-card-text">
        <span className="sound-card-title">{sound.title}</span>
        <span className="sound-card-meta">{meta.join(' · ')}</span>
      </span>
      {action}
    </Card>
  );
}

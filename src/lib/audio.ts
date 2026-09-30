import type { Sound } from './data';

/**
 * Hangmotor Web Audióval.
 * - unlock(): felhasználói mozdulatban kell hívni (pl. a galéria kártyájára koppintáskor),
 *   különben iOS-en nem szól semmi. Felolvasóval a kép nézetben már nincs „koppintás”,
 *   ezért a feloldás a galériában történik.
 * - A háttérhang lassan beúszik, hangmező alatt lehalkul, kilépéskor elhalkul.
 */
type Voice = { src: AudioBufferSourceNode; gain: GainNode };

let ctx: AudioContext | null = null;
const buffers = new Map<string, Promise<AudioBuffer>>();

function context(): AudioContext {
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AC();
  }
  return ctx;
}

export async function unlock(): Promise<void> {
  try {
    // iOS: a néma kapcsoló ne némítsa el (ahol támogatott)
    const nav = navigator as Navigator & { audioSession?: { type: string } };
    if (nav.audioSession) nav.audioSession.type = 'playback';
  } catch {
    /* nem támogatott */
  }
  const c = context();
  if (c.state !== 'running') {
    try {
      await c.resume();
    } catch {
      /* később újrapróbáljuk */
    }
  }
}

export function isRunning(): boolean {
  return ctx?.state === 'running';
}

function buffer(src: string): Promise<AudioBuffer> {
  if (!buffers.has(src)) {
    buffers.set(
      src,
      fetch(src)
        .then((r) => r.arrayBuffer())
        .then((data) => context().decodeAudioData(data)),
    );
  }
  return buffers.get(src)!;
}

export function preload(sounds: Sound[]): void {
  sounds.forEach((s) => void buffer(s.src).catch(() => undefined));
}

function ramp(param: AudioParam, to: number, ms: number) {
  const c = context();
  const now = c.currentTime;
  param.cancelScheduledValues(now);
  param.setValueAtTime(param.value, now);
  param.linearRampToValueAtTime(to, now + ms / 1000);
}

async function play(sound: Sound, { loop, fadeMs, startGain = 0 }: { loop: boolean; fadeMs: number; startGain?: number }): Promise<Voice> {
  const c = context();
  const buf = await buffer(sound.src);
  const src = c.createBufferSource();
  src.buffer = buf;
  src.loop = loop;
  const gain = c.createGain();
  gain.gain.value = startGain;
  src.connect(gain).connect(c.destination);
  src.start();
  ramp(gain.gain, sound.volume, fadeMs);
  return { src, gain };
}

function stop(voice: Voice | null, fadeMs: number) {
  if (!voice || !ctx) return;
  ramp(voice.gain.gain, 0, fadeMs);
  try {
    voice.src.stop(ctx.currentTime + fadeMs / 1000 + 0.02);
  } catch {
    /* már leállt */
  }
}

export interface SceneAudioOptions {
  background: Sound;
  startCue: Sound;
  fadeInMs: number;
  fadeOutMs: number;
  duckLevel: number;
  fieldFadeMs: number;
}

/** Egy kép hangjai: indító jel + háttérhang + a hangmezők. */
export class SceneAudio {
  private bg: Voice | null = null;
  private field: { id: string; voice: Promise<Voice> } | null = null;
  private started = false;
  private disposed = false;
  private opts: SceneAudioOptions;

  constructor(opts: SceneAudioOptions) {
    this.opts = opts;
  }

  get hasStarted() {
    return this.started;
  }

  /** Az első érintésre vagy billentyűre: indító jel, utána beúszik a háttérhang. */
  async start(): Promise<void> {
    if (this.started || this.disposed) return;
    this.started = true;
    await unlock();
    const cue = await play(this.opts.startCue, { loop: false, fadeMs: 10, startGain: this.opts.startCue.volume });
    const cueMs = (cue.src.buffer?.duration ?? 0) * 1000;
    window.setTimeout(async () => {
      if (this.disposed) return;
      const bg = await play(this.opts.background, { loop: true, fadeMs: this.opts.fadeInMs });
      if (this.disposed) return stop(bg, this.opts.fadeOutMs);
      this.bg = bg;
      if (this.field) this.duck(true);
    }, cueMs);
  }

  private duck(on: boolean) {
    if (!this.bg) return;
    const target = on ? this.opts.background.volume * this.opts.duckLevel : this.opts.background.volume;
    ramp(this.bg.gain.gain, target, 300);
  }

  /** Hangmező szólal meg (vagy null: egyik sem). */
  setField(id: string | null, sound: Sound | null): void {
    if (this.field?.id === id) return;
    // Az állapotot azonnal frissítjük, a leállítás a hang betöltése után jön: így gyors simításnál sem ragad be hang.
    if (this.field) {
      const fadeMs = this.opts.fieldFadeMs;
      void this.field.voice.then((v) => stop(v, fadeMs));
      this.field = null;
    }
    if (!id || !sound || this.disposed) {
      this.duck(false);
      return;
    }
    if (!this.started) void this.start();
    this.field = { id, voice: play(sound, { loop: true, fadeMs: this.opts.fieldFadeMs }) };
    this.duck(true);
  }

  /** Kilépés: minden elhalkul. */
  dispose(): void {
    this.disposed = true;
    if (this.field) {
      const fadeMs = this.opts.fadeOutMs;
      void this.field.voice.then((v) => stop(v, fadeMs));
    }
    this.field = null;
    stop(this.bg, this.opts.fadeOutMs);
    this.bg = null;
  }
}

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

/** Folyamatos hangerő-követés (ujjmozgás közben), kattanás nélkül. */
function glide(param: AudioParam, to: number) {
  const now = context().currentTime;
  param.cancelScheduledValues(now);
  param.setTargetAtTime(to, now, 0.03);
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
  background: Sound | null;
  startCue: Sound;
  fadeInMs: number;
  fadeOutMs: number;
  duckLevel: number;
  fieldFadeMs: number;
}

/** Egy kép hangjai: indító jel + háttérhang + a hangmezők. */
export class SceneAudio {
  private bg: Voice | null = null;
  /** A szóló hangmezők: erősség (0–1) és a hang saját hangereje. */
  private fields = new Map<string, { voice: Promise<Voice>; gain: number }>();
  private speech: { id: string; voice: Promise<Voice>; ended: boolean } | null = null;
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
      if (this.disposed || !this.opts.background) return;
      const bg = await play(this.opts.background, { loop: true, fadeMs: this.opts.fadeInMs });
      if (this.disposed) return stop(bg, this.opts.fadeOutMs);
      this.bg = bg;
      this.duck();
    }, cueMs);
  }

  /** A háttérhang a legerősebb szóló hangmező arányában halkul. */
  private duck() {
    if (!this.bg) return;
    const volume = this.opts.background?.volume ?? 0;
    const strongest = Math.max(0, ...[...this.fields.values()].map((f) => f.gain));
    ramp(this.bg.gain.gain, volume * (1 - (1 - this.opts.duckLevel) * strongest), 300);
  }

  /**
   * A szóló hangmezők és erősségük (lágy szél, átfedés). Ami nincs a listában, elhalkul és leáll.
   * Az állapotot azonnal frissítjük, a hang betöltése után igazodik: gyors simításnál sem ragad be hang.
   */
  setFields(active: { id: string; sound: Sound; gain: number }[]): void {
    if (this.disposed) return;
    const fadeMs = this.opts.fieldFadeMs;
    for (const [id, f] of this.fields) {
      if (!active.some((a) => a.id === id && a.gain > 0)) {
        void f.voice.then((v) => stop(v, fadeMs));
        this.fields.delete(id);
      }
    }
    for (const { id, sound, gain } of active) {
      if (gain <= 0) continue;
      const existing = this.fields.get(id);
      if (existing) {
        existing.gain = gain;
        void existing.voice.then((v) => this.fields.get(id) === existing && glide(v.gain.gain, sound.volume * existing.gain));
        continue;
      }
      if (!this.started) void this.start();
      const entry = { voice: play(sound, { loop: true, fadeMs, startGain: 0 }), gain };
      void entry.voice.then((v) => glide(v.gain.gain, sound.volume * entry.gain));
      this.fields.set(id, entry);
    }
    this.duck();
  }

  /** Egyetlen hangmező teljes erővel (felolvasó, billentyűzet), vagy null: egyik sem. */
  setField(id: string | null, sound: Sound | null): void {
    this.setFields(id && sound ? [{ id, sound, gain: 1 }] : []);
  }

  /**
   * Hangmező felvett leírása. Végigszól akkor is, ha az ujj közben lecsúszik a hangmezőről;
   * másik hangmezőn az előző elhallgat, ugyanazon a hangmezőn nem indul újra, amíg szól.
   */
  speak(id: string, sound: Sound): void {
    if (this.disposed || (this.speech?.id === id && !this.speech.ended)) return;
    if (this.speech) {
      const fadeMs = this.opts.fieldFadeMs;
      void this.speech.voice.then((v) => stop(v, fadeMs));
    }
    if (!this.started) void this.start();
    const speech = { id, voice: play(sound, { loop: false, fadeMs: 10, startGain: sound.volume }), ended: false };
    void speech.voice.then((v) => (v.src.onended = () => (speech.ended = true)));
    this.speech = speech;
  }

  /** Kilépés: minden elhalkul. */
  dispose(): void {
    this.disposed = true;
    if (this.speech) {
      const fadeMs = this.opts.fadeOutMs;
      void this.speech.voice.then((v) => stop(v, fadeMs));
    }
    this.speech = null;
    const fadeMs = this.opts.fadeOutMs;
    for (const f of this.fields.values()) void f.voice.then((v) => stop(v, fadeMs));
    this.fields.clear();
    stop(this.bg, this.opts.fadeOutMs);
    this.bg = null;
  }
}

import { useEffect, useRef, useState } from 'react';
import { Button } from '@heroui/react';
import { FileTrigger } from 'react-aria-components';
import { AUDIO_TYPES, uploadSound, type EditorSound } from '../../lib/editor';
import { t } from '../../lib/i18n';
import { Icon } from '../Icon';
import { formatDuration, SoundCard, stopPreview } from './SoundCard';

/** A böngésző által támogatott első formátum; az m4a (mp4) iPaden is biztosan lejátszható. */
function recorderType(): string | undefined {
  return ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'].find((type) => MediaRecorder.isTypeSupported(type));
}

/** Leíró hang (döntésnapló): felvétel mikrofonnal vagy feltöltés, visszajátszás, törlés. */
export function VoiceRecorder({
  sound,
  fieldName,
  userId,
  onChange,
}: {
  sound: EditorSound | null;
  fieldName: string;
  userId: string;
  onChange: (sound: EditorSound | null) => void;
}) {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const recorder = useRef<MediaRecorder | null>(null);
  const timer = useRef(0);

  useEffect(
    () => () => {
      window.clearInterval(timer.current);
      recorder.current?.stream.getTracks().forEach((track) => track.stop());
    },
    [],
  );

  const title = `${t('teacher.editor.voice.label')}: ${fieldName || t('teacher.editor.fields.untitled')}`;

  async function save(blob: Blob) {
    setBusy(true);
    try {
      onChange(await uploadSound(userId, blob, title));
    } catch {
      setError(t('teacher.editor.picker.errors.generic'));
    } finally {
      setBusy(false);
    }
  }

  async function start() {
    setError(undefined);
    stopPreview();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const type = recorderType();
      const rec = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => chunks.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        void save(new Blob(chunks, { type: rec.mimeType }));
      };
      rec.start();
      recorder.current = rec;
      const began = Date.now();
      setElapsed(0);
      timer.current = window.setInterval(() => setElapsed(Date.now() - began), 250);
      setRecording(true);
    } catch {
      setError(t('teacher.editor.voice.micError'));
    }
  }

  function stop() {
    window.clearInterval(timer.current);
    recorder.current?.stop();
    recorder.current = null;
    setRecording(false);
  }

  const actions = (
    <div className="voice-actions">
      {recording ? (
        <Button size="sm" onPress={stop}>
          <Icon name="stop" size={16} />
          {t('teacher.editor.voice.stop')}
        </Button>
      ) : (
        <Button size="sm" variant="outline" onPress={() => void start()} isPending={busy}>
          <Icon name="mic" size={16} />
          {sound ? t('teacher.editor.voice.rerecord') : t('teacher.editor.voice.record')}
        </Button>
      )}
      {!recording && (
        <FileTrigger acceptedFileTypes={AUDIO_TYPES} onSelect={(files) => files?.[0] && void save(files[0])}>
          <Button size="sm" variant="ghost">
            <Icon name="upload" size={16} />
            {t('teacher.editor.voice.upload')}
          </Button>
        </FileTrigger>
      )}
      {sound && !recording && (
        <Button size="sm" variant="ghost" className="danger-text" onPress={() => onChange(null)}>
          {t('teacher.editor.voice.remove')}
        </Button>
      )}
    </div>
  );

  return (
    <div className="panel-field" role="group" aria-labelledby="voice-title">
      <span id="voice-title" className="panel-label">
        {t('teacher.editor.voice.title')}
      </span>
      {sound && !recording && <SoundCard sound={sound} />}
      <p className="recording-status" role="status">
        {recording && (
          <>
            <span className="recording-dot" aria-hidden="true" />
            {t('teacher.editor.voice.recording', { time: formatDuration(elapsed) })}
          </>
        )}
      </p>
      {actions}
      {error && (
        <p className="field-error-text" role="alert">
          {error}
        </p>
      )}
      <p className="panel-help">{t('teacher.editor.voice.help')}</p>
    </div>
  );
}

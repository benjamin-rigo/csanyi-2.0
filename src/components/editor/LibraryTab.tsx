import { useEffect, useRef, useState } from 'react';
import { Button, Description, Input, Label, TextField } from '@heroui/react';
import { importLibrarySound, libraryTitle, searchLibrary, type EditorSound, type LibraryResult } from '../../lib/editor';
import { t } from '../../lib/i18n';
import { formatDuration, PlayButton, stopPreview, usePreview } from './SoundCard';

const SEARCH_DELAY_MS = 400;

function ResultRow({ result, busy, onSelect }: { result: LibraryResult; busy: boolean; onSelect: () => void }) {
  const title = libraryTitle(result.name);
  const { playing } = usePreview(result.preview);
  return (
    <li className={`library-row${playing ? ' is-playing' : ''}`}>
      <PlayButton src={result.preview} title={title} />
      <span className="sound-card-text">
        <span className="sound-card-title">{title}</span>
        <span className="sound-card-meta">
          {formatDuration(result.durationMs)}
          {playing && ` · ${t('teacher.editor.picker.playing')}`}
        </span>
      </span>
      <Button
        size="sm"
        variant={playing ? 'primary' : 'outline'}
        isPending={busy}
        aria-label={t('teacher.editor.picker.selectLabel', { title })}
        onPress={onSelect}
      >
        {t('teacher.editor.picker.select')}
      </Button>
    </li>
  );
}

/** Könyvtár fül (12): Freesound CC0 hangok keresése; a hangmező nevével indul. */
export function LibraryTab({
  initialQuery,
  userId,
  onPick,
}: {
  initialQuery: string;
  userId: string;
  onPick: (sound: EditorSound) => void;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<LibraryResult[]>([]);
  const [count, setCount] = useState<number | null>(null);
  const [searchedFor, setSearchedFor] = useState('');
  const [next, setNext] = useState(false);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [importError, setImportError] = useState(false);
  const request = useRef(0);
  const sentinel = useRef<HTMLDivElement>(null);
  const [announce, setAnnounce] = useState('');
  const [loadingMore, setLoadingMore] = useState(false);

  // Gépelés után rövid szünettel keres; a régebbi válaszokat eldobjuk.
  useEffect(() => {
    const q = query.trim();
    const id = ++request.current;
    if (!q) return;
    const timer = window.setTimeout(() => {
      setStatus('loading');
      searchLibrary(q, 1)
        .then((r) => {
          if (id !== request.current) return;
          setResults(r.results);
          setCount(r.count);
          setSearchedFor(r.searchedFor);
          setNext(r.next);
          setPage(1);
          setStatus('idle');
        })
        .catch(() => id === request.current && setStatus('error'));
    }, SEARCH_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [query]);

  async function more() {
    const id = request.current;
    setLoadingMore(true);
    try {
      const r = await searchLibrary(query.trim(), page + 1);
      if (id !== request.current) return;
      setResults((prev) => [...prev, ...r.results]);
      setNext(r.next);
      setPage(page + 1);
      setAnnounce(t('teacher.editor.picker.loadedMore', { n: r.results.length }));
    } catch {
      setStatus('error');
    } finally {
      setLoadingMore(false);
    }
  }

  async function select(result: LibraryResult) {
    stopPreview();
    setBusyId(result.id);
    setImportError(false);
    try {
      onPick(await importLibrarySound(userId, result));
    } catch {
      setImportError(true);
    } finally {
      setBusyId(null);
    }
  }

  // A lista aljára érve (görgetéssel vagy Tabbal) magától jön a következő oldal.
  const moreRef = useRef(more);
  useEffect(() => {
    moreRef.current = more;
  });
  const canLoadMore = next && status === 'idle' && !loadingMore && query.trim() !== '';
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !canLoadMore) return;
    const io = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && void moreRef.current());
    io.observe(el);
    return () => io.disconnect();
  }, [canLoadMore, results.length]);

  // Üres keresőmezőnél a korábbi találatok nem látszanak.
  const empty = !query.trim();
  const shown = empty ? [] : results;

  return (
    <div className="picker-panel">
      <TextField value={query} onChange={setQuery} type="search" className="auth-field" autoFocus>
        <Label>{t('teacher.editor.picker.searchLabel')}</Label>
        <Input />
        <Description>{t('teacher.editor.picker.searchHelp')}</Description>
      </TextField>
      <p className="library-status" role="status">
        {empty
          ? ''
          : status === 'loading'
            ? t('teacher.editor.picker.searching')
            : status === 'error'
              ? t('teacher.editor.picker.libraryError')
              : count === 0
                ? t('teacher.editor.picker.noResults')
                : count !== null
                  ? [
                      searchedFor && searchedFor.toLowerCase() !== query.trim().toLowerCase()
                        ? t('teacher.editor.picker.translated', { query: searchedFor })
                        : '',
                      t('teacher.editor.picker.count', { count: count.toLocaleString('hu-HU') }),
                    ]
                      .filter(Boolean)
                      .join(' ')
                  : ''}
      </p>
      {importError && (
        <p className="field-error-text" role="alert">
          {t('teacher.editor.picker.importError')}
        </p>
      )}
      {shown.length > 0 && (
        <ul className="library-list" aria-label={t('teacher.editor.picker.resultsLabel')}>
          {shown.map((r) => (
            <ResultRow key={r.id} result={r} busy={busyId === r.id} onSelect={() => void select(r)} />
          ))}
        </ul>
      )}
      {!empty && next && (
        <div ref={sentinel} className="library-more">
          {loadingMore && t('teacher.editor.picker.loadingMore')}
        </div>
      )}
      <p className="sr-only" role="status">
        {announce}
      </p>
    </div>
  );
}

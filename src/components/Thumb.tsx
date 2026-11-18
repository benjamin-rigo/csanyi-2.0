import type { CSSProperties } from 'react';

/**
 * Kártya képkerete (galéria, Projektjeim, Admin): a kép egészben látszik, a megmaradó helyet a kép saját,
 * elmosott színei töltik ki (döntésnapló), így nincs szürke sáv a kép két oldalán.
 */
export function Thumb({ src, width, height }: { src: string | null; width?: number | null; height?: number | null }) {
  return (
    <div className="project-thumb" style={src ? ({ '--thumb': `url("${src}")` } as CSSProperties) : undefined}>
      {src && <img src={src} alt="" width={width ?? undefined} height={height ?? undefined} loading="lazy" />}
    </div>
  );
}

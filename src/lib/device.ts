export type Platform = 'ios' | 'android' | 'desktop';

/** A kilépő mozdulat szövegéhez: iPad/iPhone, Android vagy asztali gép. */
export function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  const isIPadOS = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
  if (/iPhone|iPad|iPod/.test(ua) || isIPadOS) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'desktop';
}

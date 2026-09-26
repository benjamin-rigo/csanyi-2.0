const PATHS: Record<string, string> = {
  image:
    'M5 4h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM9 10.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM21 16l-5-5-9 9',
  paw: 'M7 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM12 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM17 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM8 17c0-2.5 1.8-4.5 4-4.5s4 2 4 4.5c0 1.5-1.2 2.5-2.5 2.5h-3C9.2 19.5 8 18.5 8 17z',
  leaf: 'M5 19c0-8 5-13 14-14 0 9-5 14-13 14zM5 19l8-8',
  back: 'M19 12H5M11 6l-6 6 6 6',
  music: 'M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM21 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z',
};

export function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const d = PATHS[name];
  if (!d) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={d} />
    </svg>
  );
}

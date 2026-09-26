import hu from '../content/hu.json';

type Dict = { [key: string]: string | Dict };

/** Szöveg a tartalomfájlból, pontokkal elválasztott kulccsal, {név} helyettesítéssel. */
export function t(key: string, vars: Record<string, string | number> = {}): string {
  const value = key.split('.').reduce<string | Dict | undefined>(
    (node, part) => (node && typeof node === 'object' ? node[part] : undefined),
    hu as Dict,
  );
  if (typeof value !== 'string') {
    if (import.meta.env.DEV) console.warn(`Hiányzó szöveg: ${key}`);
    return key;
  }
  return value.replace(/\{(\w+)\}/g, (_, name: string) => String(vars[name] ?? `{${name}}`));
}

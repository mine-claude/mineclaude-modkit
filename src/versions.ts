// Os PREDICADOS DE VERSÃO do manifesto, no modelo do Fabric: os termos de um texto são E, uma lista é OU
// ("^1.2", ">=1.0 <2", ["1.x", "2.x"]). "^" mantém o major, inclusive o zero. Nome de versão opaco só aceita igualdade.
// GERADO a partir do jogo por `bun tools/modkit/sync.mjs`: não edite à mão.
export type Semantic = { parts: number[]; pre: string[] | null };
export type Predicate = (version: string) => boolean;
// Browser-safe predicates for mod metadata. Fabric-style ranges: terms in a
// string are ANDed, an array is OR. Opaque release names only support equality.
const VERSION = /^[0-9A-Za-z.+-]{1,32}$/;
const NUMBER = /^(0|[1-9][0-9]*)$/;
function semantic(value: unknown): Semantic | null {
  if (typeof value !== 'string' || !VERSION.test(value)) return null;
  const m = /^(\d+(?:\.\d+)*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/.exec(value);
  if (!m) return null;
  const parts = m[1]!.split('.');
  if (parts.length > 8 || parts.some((n: string) => !NUMBER.test(n) || !Number.isSafeInteger(Number(n)))) return null;
  const pre: string[] | null = m[2]?.split('.') ?? null;
  if (pre?.some((n: string) => /^\d+$/.test(n) && (!NUMBER.test(n) || !Number.isSafeInteger(Number(n))))) return null;
  return { parts: parts.map(Number), pre };
}
function compare(a: Semantic, b: Semantic): number {
  for (let i = 0; i < Math.max(a.parts.length, b.parts.length); i++) {
    const x: number = a.parts[i] ?? 0, y: number = b.parts[i] ?? 0;
    if (x !== y) return x < y ? -1 : 1;
  }
  if (!a.pre || !b.pre) return a.pre === b.pre ? 0 : a.pre ? -1 : 1;
  for (let i = 0; i < Math.max(a.pre.length, b.pre.length); i++) {
    const x: string | undefined = a.pre[i], y: string | undefined = b.pre[i];
    if (x === y) continue;
    if (x === undefined || y === undefined) return x === undefined ? -1 : 1;
    const xn = NUMBER.test(x), yn = NUMBER.test(y);
    if (xn && yn) return Number(x) < Number(y) ? -1 : 1;
    if (xn !== yn) return xn ? -1 : 1;
    return x < y ? -1 : 1;
  }
  return 0;
}
export function cmpVersion(a: string, b: string): number {
  const x = semantic(a), y = semantic(b);
  if (!x || !y) {
    if (a === b) return 0;
    throw new Error('cannot order opaque versions; use exact equality');
  }
  return compare(x, y);
}
function termPredicate(term: string): Predicate {
  if (term === '*') return () => true;
  const m = /^(>=|<=|>|<|=|\^|~)?(.+)$/.exec(term);
  if (!m) throw new Error(`invalid version term "${term}"`);
  const op = m[1] ?? '=', value = m[2];
  if (/^(\d+\.)+(?:x|X|\*)$/.test(value)) {
    if (op !== '=') throw new Error('wildcard versions only support equality');
    const prefix: string[] = value.split('.').slice(0, -1);
    if (prefix.length > 8 || prefix.some((n: string) => !NUMBER.test(n) || !Number.isSafeInteger(Number(n)))) throw new Error('invalid wildcard version');
    return (version: string) => { const v = semantic(version); return !!v && prefix.every((n: string, i: number) => Number(n) === (v.parts[i] ?? 0)); };
  }
  if (!VERSION.test(value)) throw new Error(`invalid version "${value}"`);
  const target = semantic(value);
  if (!target) {
    if (op !== '=') throw new Error('opaque versions only support exact equality');
    return (version: string) => version === value;
  }
  return (version: string) => {
    const v = semantic(version);
    if (!v) return false;
    const c = compare(v, target);
    switch (op) {
      case '=': return c === 0;
      case '>': return c > 0;
      case '>=': return c >= 0;
      case '<': return c < 0;
      case '<=': return c <= 0;
      // Like Fabric's SAME_TO_NEXT_MAJOR, including major zero (not npm ^0.x).
      case '^': return c >= 0 && v.parts[0] === target.parts[0];
      case '~': return c >= 0 && v.parts[0] === target.parts[0] && (v.parts[1] ?? 0) === (target.parts[1] ?? 0);
      default: return false;
    }
  };
}
export function versionPredicate(spec: unknown): Predicate {
  const alternatives: unknown[] = Array.isArray(spec) ? spec : [spec];
  if (!alternatives.length || alternatives.length > 16) throw new Error('version alternatives must contain 1..16 strings');
  const predicates: Predicate[] = (alternatives as unknown[]).map((s) => {
    if (typeof s !== 'string' || !s.trim() || s.length > 512) throw new Error('version predicate must be a non-empty string of at most 512 chars');
    const terms: string[] = s.trim().split(/\s+/);
    if (terms.length > 16) throw new Error('at most 16 terms per version predicate');
    const checks: Predicate[] = terms.map(termPredicate);
    return (version: string) => checks.every((test) => test(version));
  });
  return (version: string) => predicates.some((test) => test(version));
}
export function versionOk(spec: unknown, version: string): boolean { return versionPredicate(spec)(version); }

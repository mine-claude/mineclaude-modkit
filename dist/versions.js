// Browser-safe predicates for mod metadata. Fabric-style ranges: terms in a
// string are ANDed, an array is OR. Opaque release names only support equality.
const VERSION = /^[0-9A-Za-z.+-]{1,32}$/;
const NUMBER = /^(0|[1-9][0-9]*)$/;
function semantic(value) {
    if (typeof value !== 'string' || !VERSION.test(value))
        return null;
    const m = /^(\d+(?:\.\d+)*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/.exec(value);
    if (!m)
        return null;
    const parts = m[1].split('.');
    if (parts.length > 8 || parts.some((n) => !NUMBER.test(n) || !Number.isSafeInteger(Number(n))))
        return null;
    const pre = m[2]?.split('.') ?? null;
    if (pre?.some((n) => /^\d+$/.test(n) && (!NUMBER.test(n) || !Number.isSafeInteger(Number(n)))))
        return null;
    return { parts: parts.map(Number), pre };
}
function compare(a, b) {
    for (let i = 0; i < Math.max(a.parts.length, b.parts.length); i++) {
        const x = a.parts[i] ?? 0, y = b.parts[i] ?? 0;
        if (x !== y)
            return x < y ? -1 : 1;
    }
    if (!a.pre || !b.pre)
        return a.pre === b.pre ? 0 : a.pre ? -1 : 1;
    for (let i = 0; i < Math.max(a.pre.length, b.pre.length); i++) {
        const x = a.pre[i], y = b.pre[i];
        if (x === y)
            continue;
        if (x === undefined || y === undefined)
            return x === undefined ? -1 : 1;
        const xn = NUMBER.test(x), yn = NUMBER.test(y);
        if (xn && yn)
            return Number(x) < Number(y) ? -1 : 1;
        if (xn !== yn)
            return xn ? -1 : 1;
        return x < y ? -1 : 1;
    }
    return 0;
}
export function cmpVersion(a, b) {
    const x = semantic(a), y = semantic(b);
    if (!x || !y) {
        if (a === b)
            return 0;
        throw new Error('cannot order opaque versions; use exact equality');
    }
    return compare(x, y);
}
function termPredicate(term) {
    if (term === '*')
        return () => true;
    const m = /^(>=|<=|>|<|=|\^|~)?(.+)$/.exec(term);
    if (!m)
        throw new Error(`invalid version term "${term}"`);
    const op = m[1] ?? '=', value = m[2];
    if (/^(\d+\.)+(?:x|X|\*)$/.test(value)) {
        if (op !== '=')
            throw new Error('wildcard versions only support equality');
        const prefix = value.split('.').slice(0, -1);
        if (prefix.length > 8 || prefix.some((n) => !NUMBER.test(n) || !Number.isSafeInteger(Number(n))))
            throw new Error('invalid wildcard version');
        return (version) => { const v = semantic(version); return !!v && prefix.every((n, i) => Number(n) === (v.parts[i] ?? 0)); };
    }
    if (!VERSION.test(value))
        throw new Error(`invalid version "${value}"`);
    const target = semantic(value);
    if (!target) {
        if (op !== '=')
            throw new Error('opaque versions only support exact equality');
        return (version) => version === value;
    }
    return (version) => {
        const v = semantic(version);
        if (!v)
            return false;
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
export function versionPredicate(spec) {
    const alternatives = Array.isArray(spec) ? spec : [spec];
    if (!alternatives.length || alternatives.length > 16)
        throw new Error('version alternatives must contain 1..16 strings');
    const predicates = alternatives.map((s) => {
        if (typeof s !== 'string' || !s.trim() || s.length > 512)
            throw new Error('version predicate must be a non-empty string of at most 512 chars');
        const terms = s.trim().split(/\s+/);
        if (terms.length > 16)
            throw new Error('at most 16 terms per version predicate');
        const checks = terms.map(termPredicate);
        return (version) => checks.every((test) => test(version));
    });
    return (version) => predicates.some((test) => test(version));
}
export function versionOk(spec, version) { return versionPredicate(spec)(version); }

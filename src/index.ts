// O modkit como BIBLIOTECA: o que `import { ... } from '@mineclaude/modkit'` entrega.
// A CLI é a mesma coisa pela linha de comando (bin/mineclaude-modkit.mjs -> dist/bin.js).
export { walk, shippedPackage, collectFiles, crc32, safeName, makeZip, packageEntries, mcmodName, PackError } from './pack.ts';
export type { ZipEntry, RawPackage, Shipped } from './pack.ts';
export { checkMod } from './check.ts';
export type { CheckOk, CheckBad, CheckResult } from './check.ts';
export { buildMod, BuildError } from './build.ts';
export type { BuiltSide } from './build.ts';
export { newMod, refreshSdk, NewError } from './new.ts';
export { encodePng } from './png.ts';
export type { Pixel } from './png.ts';
export { versionPredicate, versionOk, cmpVersion } from './versions.ts';
export * from './rules.ts';
export { main, VERSION } from './cli.ts';

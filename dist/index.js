// O modkit como BIBLIOTECA: o que `import { ... } from '@mineclaude/modkit'` entrega.
// A CLI é a mesma coisa pela linha de comando (bin/mineclaude-modkit.mjs -> dist/bin.js).
export { walk, shippedPackage, collectFiles, crc32, safeName, makeZip, packageEntries, mcmodName, PackError } from "./pack.js";
export { checkMod } from "./check.js";
export { buildMod, BuildError } from "./build.js";
export { newMod, refreshSdk, NewError } from "./new.js";
export { encodePng } from "./png.js";
export { versionPredicate, versionOk, cmpVersion } from "./versions.js";
export * from "./rules.js";
export { main, VERSION } from "./cli.js";

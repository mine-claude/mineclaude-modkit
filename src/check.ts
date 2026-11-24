// Confere um mod com AS REGRAS DO SERVIDOR, sem precisar de uma cópia do jogo.
//
// O que isto confere é exatamente o que a descoberta de mods do servidor confere antes de rodar qualquer linha do mod:
// o `package.json` (ou o `mod.json`), o id, a versão, as entradas por lado, a pasta privada do servidor, o bloco
// `mineclaude`, as dependências com os predicados de versão e o bloco `config`. Se passar aqui, o servidor aceita o
// arquivo; se reprovar aqui, o servidor reprovaria com a mesma mensagem.
//
// O que isto NÃO faz: CARREGAR o mod. Nada aqui executa o `register(ctx)`, nenhum bloco é registrado, nenhuma textura
// é desenhada. Um erro que só aparece ao carregar (um nome repetido, uma receita inválida, um `ctx` usado no lado
// errado) só aparece no jogo: ponha o `.mcmod` num servidor, ou use `/mod previa <link>`, ou a tela Mods.
import fs from 'node:fs';
import path from 'node:path';
import {
  MOD_ID_RE, VERSION_RE, MCMOD_EXT, MCMOD_SIDES, MCMOD_BLOCK_KEYS, MANIFEST_KEYS, ENVIRONMENTS,
  ENTRY_KINDS, MAX_ENTRIES, ENTRY_RE, MAIN_RE, ASSET_DIRS, isServerPath, checkConfigBlock,
} from './rules.ts';
import { versionPredicate } from './versions.ts';
import { shippedPackage, type RawPackage } from './pack.ts';

export interface CheckOk {
  ok: true; form: 'empacotado' | 'pasta'; id: string; version: string;
  environment: '*' | 'client' | 'server'; entrypoints: Record<string, string | string[]>;
  privateDir: string | null; config: string[]; depends: Record<string, Record<string, unknown>>;
  assetDirs: string[]; warnings: string[];
}
export interface CheckBad { ok: false; error: string; warnings: string[] }
export type CheckResult = CheckOk | CheckBad;
type Fail = (m: string) => never;

const RELATIONS = ['dependencies', 'optional_dependencies', 'recommends', 'suggests', 'conflicts', 'breaks'];

class FailError extends Error {}

/**
 * Confere a pasta de um mod.
 * -> { ok: true, form, id, version, environment, entrypoints, assetDirs, config, depends, warnings }
 *  | { ok: false, error, warnings }
 */
export function checkMod(dir: string): CheckResult {
  const warnings: string[] = [];
  const fail: Fail = (m) => { throw new FailError(m); };
  try {
    const src = path.resolve(dir);
    if (!fs.statSync(src, { throwIfNoEntry: false })?.isDirectory()) fail(`pasta "${dir}" não encontrada`);
    const hasPkg = fs.existsSync(path.join(src, 'package.json'));
    const hasMod = fs.existsSync(path.join(src, 'mod.json'));
    if (!hasPkg && !hasMod) fail('nem package.json nem mod.json nesta pasta: não parece um mod');
    const r = hasPkg ? checkPackaged(src, fail, warnings) : checkFolder(src, fail, warnings);
    const assetDirs = ASSET_DIRS.filter((a) => fs.lstatSync(path.join(src, a), { throwIfNoEntry: false })?.isDirectory());
    return { ok: true, assetDirs, warnings, ...r };
  } catch (e) {
    if (!(e instanceof FailError)) throw e;
    return { ok: false, error: e.message, warnings };
  }
}

// ---------------------------------------------------------------- a forma empacotada (package.json)
function checkPackaged(src: string, fail: Fail, warnings: string[]) {
  let pkg: RawPackage = {};
  try { pkg = JSON.parse(fs.readFileSync(path.join(src, 'package.json'), 'utf8')); } catch (e: any) { fail(`package.json ausente ou inválido (${e.message})`); }
  if (!pkg || typeof pkg !== 'object' || Array.isArray(pkg)) fail('package.json deve ser um objeto');
  // o servidor só vê o package.json REDUZIDO que o `pack` escreve: é esse que vale conferir
  const { shipped, dropped } = shippedPackage(pkg);
  for (const d of dropped) if (d !== 'scripts.build' && d !== 'scripts._sources') warnings.push(`package.json: "${d}" fica FORA do pacote (o servidor não conhece essa chave)`);

  const s = shipped.scripts as Record<string, string> | undefined;
  if (!s || typeof s !== 'object' || Array.isArray(s)) fail('package.json: "scripts" deve ser um objeto { server?, client?, main? } com os arquivos JÁ MONTADOS');
  if (s.server === undefined && s.client === undefined && s.main === undefined) fail(`package.json: scripts precisa de "server" e/ou "client" (e/ou a entrada de conteúdo "main")`);
  for (const k of MCMOD_SIDES) {
    if (s[k] === undefined) continue;
    if (typeof s[k] !== 'string' || !ENTRY_RE.test(s[k])) fail(`package.json: scripts.${k} "${s[k]}" deve ser um caminho .js/.ts dentro da pasta do mod (ex.: dist/${k}/main.js)`);
  }
  let privateDir = null;
  if (s.server !== undefined) {
    privateDir = path.posix.dirname(s.server);
    if (privateDir === '.') fail(`package.json: scripts.server "${s.server}" tem de estar numa pasta (ex.: dist/server/main.js): essa pasta inteira fica privada`);
    for (const k of ['client', 'main']) {
      if (s[k] !== undefined && (s[k] + '/').toLowerCase().startsWith(privateDir.toLowerCase() + '/')) fail(`package.json: scripts.${k} "${s[k]}" está dentro da pasta privada do servidor "${privateDir}/"`);
    }
  }
  const id = shipped.name;
  if (typeof id !== 'string' || !MOD_ID_RE.test(id)) fail(`package.json name "${id}" inválido (esperado [a-z0-9_]+)`);
  const version = shipped.version ?? '0.0.0';
  if (typeof version !== 'string' || !VERSION_RE.test(version)) fail(`version "${version}" inválida (1 a 32 caracteres de [0-9A-Za-z.+-])`);

  const block = shipped.mineclaude;
  if (block !== undefined) {
    if (!block || typeof block !== 'object' || Array.isArray(block)) fail('package.json: "mineclaude" deve ser um objeto');
    for (const k of Object.keys(block)) if (!MCMOD_BLOCK_KEYS.includes(k) && !k.startsWith('_')) fail(`package.json: chave desconhecida "mineclaude.${k}" (conhecidas: ${MCMOD_BLOCK_KEYS.join(', ')})`);
  }
  const config = checkBlock(() => checkConfigBlock(block?.config), fail);
  const depends = checkDeps({ ...block, id }, fail);

  // as entradas existem no disco? (o `pack` também reprova, mas aqui a mensagem vem antes do build)
  const missing = MCMOD_SIDES.filter((k) => s[k] !== undefined && !fs.statSync(path.join(src, ...s[k].split('/')), { throwIfNoEntry: false })?.isFile());
  if (missing.length) warnings.push(`os arquivos montados ainda não existem (${missing.map((k) => `scripts.${k}`).join(', ')}): rode "modkit build" antes de empacotar`);

  const environment = s.main !== undefined || (s.server !== undefined && s.client !== undefined) ? '*' : s.server !== undefined ? 'server' : 'client';
  const folder = path.basename(src);
  if (folder.toLowerCase().endsWith(MCMOD_EXT) && folder.slice(0, -MCMOD_EXT.length) !== id) fail(`a pasta "${folder}" tem de se chamar "${id}${MCMOD_EXT}" (o nome do arquivo é o id do mod)`);

  return { form: 'empacotado' as const, id, version, environment: environment as '*' | 'client' | 'server', entrypoints: { ...s } as Record<string, string>, privateDir, config, depends };
}

// ---------------------------------------------------------------- a forma em pasta (mod.json)
function checkFolder(src: string, fail: Fail, warnings: string[]) {
  let m: RawPackage = {};
  try { m = JSON.parse(fs.readFileSync(path.join(src, 'mod.json'), 'utf8')); } catch (e: any) { fail(`mod.json ausente ou inválido (${e.message})`); }
  if (!m || typeof m !== 'object' || Array.isArray(m)) fail('mod.json deve ser um objeto');
  const id = m.id;
  if (typeof id !== 'string' || !MOD_ID_RE.test(id)) fail(`id "${id}" inválido (esperado [a-z0-9_]+)`);
  if (id !== path.basename(src)) fail(`o id "${id}" tem de ser igual ao nome da pasta ("${path.basename(src)}")`);
  for (const k of Object.keys(m)) {
    if (MANIFEST_KEYS.includes(k) || k.startsWith('_') || k.startsWith('$')) continue;
    warnings.push(`mod.json: chave desconhecida "${k}" (conhecidas: ${MANIFEST_KEYS.join(', ')})`);
  }
  const environment = m.environment ?? '*';
  if (!ENVIRONMENTS.includes(environment)) fail(`environment ${JSON.stringify(environment)} não vale (esperado ${ENVIRONMENTS.map((e) => JSON.stringify(e)).join(', ')})`);
  const version = m.version ?? '0.0.0';
  if (typeof version !== 'string' || !VERSION_RE.test(version)) fail(`version "${version}" inválida (1 a 32 caracteres de [0-9A-Za-z.+-])`);
  const wg = m.worldgenVersion ?? version;
  if (typeof wg !== 'string' || !VERSION_RE.test(wg)) fail(`worldgenVersion "${wg}" inválida`);
  if (m.remote_base !== undefined) fail('remote_base (código remoto) não é conferido aqui: o servidor só o aceita com a permissão do dono');

  const isFile = (f: string) => fs.statSync(path.join(src, ...f.split('/')), { throwIfNoEntry: false })?.isFile();
  const entrypoints: Record<string, string[]> = {};
  if (m.entrypoints === undefined) {
    const main = m.main ?? (isFile('main.ts') ? 'main.ts' : 'main.js');
    if (typeof main !== 'string' || !MAIN_RE.test(main)) fail(`main "${main}" inválido (um arquivo .js/.ts na pasta do mod)`);
    if (!isFile(main)) fail(`o arquivo main "${main}" não existe`);
    entrypoints.main = [main];
  } else {
    const ep = m.entrypoints;
    if (!ep || typeof ep !== 'object' || Array.isArray(ep)) fail('entrypoints deve ser um objeto { main?, server?, client? }');
    for (const k of Object.keys(ep)) if (!ENTRY_KINDS.includes(k)) fail(`chave desconhecida em entrypoints: "${k}" (esperado ${ENTRY_KINDS.join(', ')})`);
    if (m.main !== undefined && ep.main !== undefined) fail('"main" e "entrypoints.main" estão os dois declarados (escolha um)');
    const lists = { ...ep };
    if (m.main !== undefined) {
      if (typeof m.main !== 'string' || !MAIN_RE.test(m.main)) fail(`main "${m.main}" inválido (um arquivo .js/.ts na pasta do mod)`);
      lists.main = [m.main];
    }
    const seen = new Set<string>();
    for (const kind of ENTRY_KINDS) {
      const l = lists[kind];
      if (l === undefined) continue;
      if (!Array.isArray(l) || !l.length) fail(`entrypoints.${kind} deve ser uma lista não vazia de arquivos .js/.ts`);
      if (l.length > MAX_ENTRIES) fail(`entrypoints.${kind}: no máximo ${MAX_ENTRIES} arquivos (recebi ${l.length})`);
      for (const f of l) {
        if (typeof f !== 'string' || !ENTRY_RE.test(f)) fail(`arquivo inválido em entrypoints.${kind}: "${f}" (um caminho .js dentro da pasta do mod, ex.: server/logic.js)`);
        if (seen.has(f)) fail(`o arquivo de entrada "${f}" está listado duas vezes`);
        seen.add(f);
        if (kind !== 'server' && isServerPath(f)) fail(`entrypoints.${kind} "${f}": a pasta server/ é privada (nunca vai ao navegador); mova-o ou declare-o em "server"`);
        if (!isFile(f)) fail(`o arquivo de entrada "${f}" não existe`);
      }
      entrypoints[kind] = [...l];
    }
    if (!Object.keys(entrypoints).length) fail('entrypoints precisa de pelo menos um arquivo (main, server ou client)');
  }
  const config = checkBlock(() => checkConfigBlock(m.config), fail);
  const depends = checkDeps(m, fail);
  warnings.push('mod em pasta: o servidor aceita este formato, mas a forma de distribuição é o `.mcmod` (modkit pack)');
  return { form: 'pasta' as const, id, version, environment: environment as '*' | 'client' | 'server', entrypoints, privateDir: null, config, depends };
}

// ---------------------------------------------------------------- blocos comuns
const checkBlock = <T>(fn: () => T, fail: Fail): T => { try { return fn(); } catch (e: any) { return fail(e.message); } };

function checkDeps(manifest: RawPackage, fail: Fail) {
  if (manifest.depends !== undefined && manifest.dependencies !== undefined) fail('use "depends" ou "dependencies", não os dois');
  const out: Record<string, Record<string, unknown>> = {};
  const written = (kind: string) => (kind === 'dependencies' && manifest.depends !== undefined ? 'depends' : kind);
  for (const kind of RELATIONS) {
    const values = (kind === 'dependencies' ? manifest.dependencies ?? manifest.depends : manifest[kind]) ?? {};
    if (!values || typeof values !== 'object' || Array.isArray(values)) fail(`${written(kind)} deve ser um objeto { "<modid>": "<predicado de versão>" }`);
    const keys = Object.keys(values);
    if (keys.length > 256) fail(`${written(kind)}: no máximo 256 relações`);
    const copied: Record<string, unknown> = {};
    for (const [id, spec] of keys.map((k) => [k, values[k]])) {
      if (!MOD_ID_RE.test(id) || ['__proto__', 'constructor', 'prototype'].includes(id)) fail(`${written(kind)}: id de mod inválido "${id}"`);
      if (id === manifest.id) fail(`${written(kind)}: um mod não pode se referenciar`);
      try { versionPredicate(spec); } catch (e: any) { fail(`${written(kind)}.${id}: ${e.message}`); }
      copied[id] = spec;
    }
    out[kind] = copied;
  }
  for (const id of Object.keys(out.optional_dependencies)) if (Object.prototype.hasOwnProperty.call(out.dependencies, id)) fail(`optional_dependencies.${id}: já é uma dependência obrigatória`);
  const src = manifest.dependency_sources ?? {};
  if (!src || typeof src !== 'object' || Array.isArray(src)) fail('dependency_sources deve ser um objeto');
  for (const [id, url] of Object.entries(src)) {
    if (!MOD_ID_RE.test(id)) fail(`dependency_sources: id de mod inválido "${id}"`);
    if (typeof url !== 'string' || !/^https:\/\/\S{1,2000}$/.test(url)) fail(`dependency_sources.${id}: precisa ser uma URL https:// de um mod.json`);
  }
  return out;
}

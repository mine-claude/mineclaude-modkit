// Monta e empacota um mod em `<id>.mcmod`, sem precisar de uma cópia do jogo.
//
// Um `.mcmod` é um ZIP com o `package.json` do mod mais os scripts JÁ MONTADOS e as pastas de recursos. O zip sai
// DETERMINÍSTICO -- mesma entrada, mesmos bytes -- porque uma Release é remontada a partir de uma tag e o arquivo
// precisa ser o mesmo: entradas em ordem, data fixa (2024-01-01), nomes com barra normal, nenhum campo extra.
//
// Os bytes deste empacotador são os MESMOS que o empacotador do jogo escreve. Isso não é promessa: o repositório do
// jogo tem uma suíte que empacota o mesmo mod dos dois lados e reprova se um único byte diferir.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { ASSET_DIRS, MCMOD_KEYS, MCMOD_SIDES, MCMOD_EXT, ZIP_LIMITS } from './rules.ts';

export interface ZipEntry { name: string; data: Buffer }
/** O package.json de um mod, como vem do disco: JSON, logo sem forma garantida. */
export type RawPackage = Record<string, any>;
export interface Shipped extends RawPackage { scripts?: Record<string, string> }

export class PackError extends Error {}
const fail: (m: string) => never = (m) => { throw new PackError(m); };

// ---------------------------------------------------------------- quais arquivos entram
// Fora do pacote, em qualquer profundidade: arquivos e pastas que começam com ponto, `node_modules`, as pastas de topo
// `types/` e `tests/` (a cópia dos tipos e os testes do autor não são do jogador), os arquivos de configuração do
// editor, qualquer `.d.ts`, outros zips, e um `.ts` que já tem o `.js` compilado ao lado.
const TOP_EXCLUDED = new Set(['types', 'tests']);
const NAME_EXCLUDED = new Set(['tsconfig.json', 'jsconfig.json', 'package-lock.json']);

function isExcluded(name: string, siblings: Set<string>): boolean {
  if (NAME_EXCLUDED.has(name) || /\.d\.ts$/i.test(name) || /\.zip$/i.test(name)) return true;
  return /\.ts$/i.test(name) && siblings.has(name.replace(/\.ts$/i, '.js'));
}

/** Os arquivos de `root/rel`, caminhos relativos com "/". Recusa link simbólico (um link sairia do pacote). */
export function walk(root: string, rel = ''): string[] {
  const found: string[] = [];
  const entries = fs.readdirSync(path.join(root, rel), { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1));
  const siblings = new Set(entries.map((e) => e.name));
  for (const e of entries) {
    const r = rel ? `${rel}/${e.name}` : e.name;
    const st = fs.lstatSync(path.join(root, r));
    if (st.isSymbolicLink()) fail(`link simbólico em "${r}": não sigo links, tire-o da pasta do mod`);
    if (e.name.startsWith('.') || e.name === 'node_modules') continue;
    if (!rel && st.isDirectory() && TOP_EXCLUDED.has(e.name)) continue;
    if (st.isDirectory()) found.push(...walk(root, r));
    else if (st.isFile() && !isExcluded(e.name, siblings)) found.push(r);
  }
  return found;
}

/**
 * O que viaja dentro do pacote: só as chaves que o servidor conhece, e `scripts` reduzido aos lados
 * (`build` e as dependências de desenvolvimento são ferramenta do autor; o servidor recusa o resto).
 * As chaves que começam com "_" passam: são comentário do autor. A ORDEM é a que o autor escreveu.
 * -> { shipped, dropped: [nomes que ficaram fora] }
 */
export function shippedPackage(pkg: RawPackage): { shipped: Shipped; dropped: string[] } {
  const shipped: Shipped = {};
  const dropped: string[] = [];
  for (const [k, v] of Object.entries(pkg)) {
    if (!MCMOD_KEYS.includes(k) && !k.startsWith('_')) { dropped.push(k); continue; }
    if (k === 'scripts' && v && typeof v === 'object' && !Array.isArray(v)) {
      shipped.scripts = {};
      for (const [s, f] of Object.entries(v as Record<string, unknown>)) { if (MCMOD_SIDES.includes(s)) shipped.scripts![s] = f as string; else dropped.push(`scripts.${s}`); }
    } else shipped[k] = v;
  }
  return { shipped, dropped };
}

/**
 * Os arquivos do pacote, em ordem: para cada lado, o script montado (um arquivo solto na raiz) ou a pasta dele
 * inteira; depois cada pasta de recursos que existir.
 */
export function collectFiles(dir: string, scripts: Record<string, string> | undefined): string[] {
  const set = new Set<string>();
  for (const side of MCMOD_SIDES) {
    const script = scripts?.[side];
    if (script === undefined) continue;
    if (!fs.statSync(path.join(dir, ...script.split('/')), { throwIfNoEntry: false })?.isFile()) fail(`scripts.${side} "${script}" não existe (rode o build, ou confira o caminho)`);
    const folder = path.posix.dirname(script);
    if (folder === '.') set.add(script); // um script na raiz: só esse arquivo (nunca a pasta do mod inteira)
    else for (const f of walk(dir, folder)) set.add(f);
  }
  for (const a of ASSET_DIRS) {
    if (fs.lstatSync(path.join(dir, a), { throwIfNoEntry: false })?.isDirectory()) for (const f of walk(dir, a)) set.add(f);
  }
  return [...set].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

// ---------------------------------------------------------------- zip determinístico
const TABLE = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
export function crc32(buf: Uint8Array): number {
  let c = 0xffffffff;
  for (const x of buf) c = TABLE[(c ^ x) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

const DOS_TIME = 0;
const DOS_DATE = ((2024 - 1980) << 9) | (1 << 5) | 1; // 2024-01-01: fixa, para os bytes serem reproduzíveis

export function safeName(name: string): string {
  if (!name || name.includes('\\') || name.startsWith('/') || /^[A-Za-z]:/.test(name) || name.split('/').some((p) => p === '..' || p === '' || p === '.')) {
    fail(`nome de entrada inválido no zip: "${name}"`);
  }
  return name;
}

/** entries: [{ name, data: Buffer }] -> Buffer do zip. */
export function makeZip(entries: readonly ZipEntry[]): Buffer {
  if (entries.length > 0xffff) fail('arquivos demais para o zip');
  const parts: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;
  for (const { name, data } of entries) {
    const nameBuf = Buffer.from(safeName(name), 'utf8');
    const deflated = zlib.deflateRawSync(data);
    const stored = deflated.length >= data.length;
    const body = stored ? data : deflated;
    const method = stored ? 0 : 8;
    const crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x0800, 6); // bit 11: nomes em UTF-8
    local.writeUInt16LE(method, 8); local.writeUInt16LE(DOS_TIME, 10); local.writeUInt16LE(DOS_DATE, 12);
    local.writeUInt32LE(crc, 14); local.writeUInt32LE(body.length, 18); local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26); local.writeUInt16LE(0, 28);
    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0); cd.writeUInt16LE(20, 4); cd.writeUInt16LE(20, 6); cd.writeUInt16LE(0x0800, 8);
    cd.writeUInt16LE(method, 10); cd.writeUInt16LE(DOS_TIME, 12); cd.writeUInt16LE(DOS_DATE, 14);
    cd.writeUInt32LE(crc, 16); cd.writeUInt32LE(body.length, 20); cd.writeUInt32LE(data.length, 24);
    cd.writeUInt16LE(nameBuf.length, 28); cd.writeUInt32LE(offset, 42);
    parts.push(local, nameBuf, body);
    central.push(cd, nameBuf);
    offset += 30 + nameBuf.length + body.length;
  }
  const cdBuf = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(cdBuf.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...parts, cdBuf, end]);
}

/** O conteúdo do `.mcmod` de uma pasta já montada -> { entries, shipped, dropped, id, version }. */
export function packageEntries(dir: string): { entries: ZipEntry[]; shipped: Shipped; dropped: string[]; id: string; version: string } {
  let pkg: RawPackage = {};
  try { pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8')); } catch (e: any) { fail(`package.json ausente ou inválido em ${dir} (${e.message})`); }
  if (!pkg || typeof pkg !== 'object' || Array.isArray(pkg)) fail('package.json deve ser um objeto');
  const { shipped, dropped } = shippedPackage(pkg);
  const files = collectFiles(dir, shipped.scripts);
  const entries: ZipEntry[] = [{ name: 'package.json', data: Buffer.from(JSON.stringify(shipped, null, 2) + '\n') }];
  for (const f of files) entries.push({ name: f, data: fs.readFileSync(path.join(dir, ...f.split('/'))) });
  if (entries.length > ZIP_LIMITS.entries) fail(`arquivos demais (${entries.length} > ${ZIP_LIMITS.entries})`);
  const total = entries.reduce((n: number, e: ZipEntry) => n + e.data.length, 0);
  if (total > ZIP_LIMITS.totalBytes) fail(`o mod é grande demais (${total} > ${ZIP_LIMITS.totalBytes} bytes descompactado)`);
  for (const e of entries) if (e.data.length > ZIP_LIMITS.entryBytes) fail(`"${e.name}" é grande demais (${e.data.length} > ${ZIP_LIMITS.entryBytes} bytes)`);
  return { entries, shipped, dropped, id: pkg.name, version: pkg.version ?? '0.0.0' };
}

export const mcmodName = (id: string): string => `${id}${MCMOD_EXT}`;

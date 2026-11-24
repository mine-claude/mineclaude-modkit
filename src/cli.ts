// mineclaude-modkit: as ferramentas de linha de comando para fazer um mod do MineClaude.
//
//   modkit new <id> [--dir <pasta>] [--js]      cria o repositório de um mod novo (TypeScript, --js para JavaScript)
//   modkit build [pasta]                        monta as entradas declaradas em scripts._sources
//   modkit pack [pasta] [--out x.mcmod] ...     monta e empacota em <id>.mcmod (determinístico)
//   modkit check [pasta] [--json]               confere as regras do servidor, sem precisar do jogo
//   modkit sdk [pasta]                          atualiza o mineclaude-sdk.js e os tipos dentro de um mod
//   modkit help
//
// Precisa do Bun (https://bun.sh). Nada mais: nenhuma dependência, nenhuma cópia do jogo.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { packageEntries, makeZip, PackError, mcmodName } from './pack.ts';
import { checkMod } from './check.ts';
import { buildMod, BuildError } from './build.ts';
import { newMod, refreshSdk, NewError } from './new.ts';
import { MCMOD_EXT } from './rules.ts';

// o package.json fica uma pasta acima de dist/ (e de src/, quando rodado direto pelo Bun)
const PKG = fileURLToPath(new URL('../package.json', import.meta.url));
export const VERSION: string = JSON.parse(fs.readFileSync(PKG, 'utf8')).version;

/**
 * Os comandos que MONTAM as entradas do mod, e por isso precisam do Bun (`Bun.build`).
 * `bin/mineclaude-modkit.mjs` se re-executa com `bun` quando um destes é chamado de dentro do Node.
 * Os outros (`new`, `check`, `sdk`, `help`) só usam `node:fs` e rodam nos dois.
 */
export const NEEDS_BUN: readonly string[] = ['build', 'pack'];

const USAGE = `mineclaude-modkit ${VERSION} — ferramentas de mod do MineClaude

  modkit new <id> [--dir <pasta>] [--js]   cria um mod novo (TypeScript; --js para JavaScript)
  modkit build [pasta]                     monta as entradas (scripts._sources -> scripts)
  modkit pack [pasta] [--out <arquivo>] [--no-build] [--force]
                                           monta e empacota em <id>${MCMOD_EXT} (mesma entrada, mesmos bytes)
  modkit check [pasta] [--json]            confere as regras do servidor, sem o jogo
  modkit sdk [pasta]                       atualiza o mineclaude-sdk.js e o mineclaude-mod.d.ts do mod
  modkit help

A documentação vai junto, em docs/: comece por docs/comece-aqui.md.`;

// o primeiro argumento que não é uma opção nem o valor de uma
const positional = (args: string[], withValue = ['--out', '--dir']): string | undefined =>
  args.find((a, i) => !a.startsWith('--') && !withValue.includes(args[i - 1]!));
const opt = (args: string[], name: string): string | undefined => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const kib = (n: number): string => (n < 1024 * 1024 ? `${(n / 1024).toFixed(1)} KiB` : `${(n / 1024 / 1024).toFixed(2)} MiB`);
const sideText = (e: string): string =>
  e === 'server' ? 'só servidor (invisível para quem joga)' : e === 'client' ? 'só navegador' : 'servidor + navegador';

export function cmdCheck(args: string[]): number {
  const dir = path.resolve(positional(args) ?? '.');
  const r = checkMod(dir);
  if (args.includes('--json')) { console.log(JSON.stringify(r, null, 2)); return r.ok ? 0 : 1; }
  if (!r.ok) {
    console.error(`ERRO: ${r.error}`);
    for (const w of r.warnings) console.error(`  aviso: ${w}`);
    return 1;
  }
  console.log(`mod "${r.id}" versão ${r.version} — ok (forma: ${r.form})`);
  console.log(`  lado: ${sideText(r.environment)}`);
  for (const [k, v] of Object.entries(r.entrypoints)) console.log(`  entrada ${k}: ${Array.isArray(v) ? v.join(', ') : v}`);
  if (r.privateDir) console.log(`  pasta privada (nunca vai ao navegador): ${r.privateDir}/`);
  if (r.assetDirs.length) console.log(`  recursos no pacote: ${r.assetDirs.join(', ')}`);
  if (r.config.length) console.log(`  config: ${r.config.join(', ')}`);
  const deps = Object.entries(r.depends.dependencies ?? {});
  if (deps.length) console.log(`  depende de: ${deps.map(([d, s]) => `${d} ${JSON.stringify(s)}`).join(', ')}`);
  for (const w of r.warnings) console.log(`  aviso: ${w}`);
  console.log('  o que só o jogo vê: carregar o mod de verdade. Instale o .mcmod num servidor, ou use /mod previa.');
  return 0;
}

export async function cmdPack(args: string[]): Promise<number> {
  const dir = path.resolve(positional(args) ?? '.');
  const out = opt(args, '--out');
  if (args.includes('--out') && !out) { console.error('uso: modkit pack [pasta] [--out arquivo.mcmod] [--force] [--no-build]'); return 1; }

  // 1. as regras do servidor ANTES de montar qualquer coisa
  const pre = checkMod(dir);
  if (!pre.ok) { console.error(`ERRO: ${pre.error}`); return 1; }
  if (pre.form !== 'empacotado') { console.error('ERRO: o pack trabalha com um mod na forma empacotada (um package.json com "scripts"); este é um mod em pasta (mod.json)'); return 1; }

  let target = path.resolve(out ?? path.join(dir, mcmodName(pre.id)));
  if (fs.statSync(target, { throwIfNoEntry: false })?.isDirectory()) target = path.join(target, mcmodName(pre.id));
  if (fs.existsSync(target) && !args.includes('--force')) { console.error(`ERRO: ${target} já existe (use --force para sobrescrever)`); return 1; }

  // 2. montar
  if (!args.includes('--no-build')) await buildMod(dir);

  // 3. empacotar e conferir o resultado
  const { entries, shipped, dropped, id, version } = packageEntries(dir);
  const post = checkMod(dir);
  if (!post.ok) { console.error(`ERRO: ${post.error}`); return 1; }
  const zip = makeZip(entries);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, zip);

  console.log(`pacote ${target}`);
  console.log(`  id: ${id}`);
  console.log(`  versão: ${version}`);
  console.log(`  arquivos: ${entries.length}`);
  console.log(`  tamanho: ${kib(zip.length)} (${zip.length} bytes)`);
  console.log(`  lado: ${sideText(post.environment)}`);
  if (dropped.length) console.log(`  fora do pacote (só ferramenta do autor): ${dropped.join(', ')}`);
  if (path.basename(target) !== mcmodName(id)) console.log(`  AVISO: o servidor exige o nome ${mcmodName(id)}; renomeie antes de instalar`);
  if (shipped.scripts?.server) console.log(`  privado: nada de ${path.posix.dirname(shipped.scripts.server)}/ é servido ao navegador`);
  return 0;
}

const COMMANDS: Record<string, (args: string[]) => number | Promise<number>> = {
  new(args) {
    const r = newMod(positional(args), { dir: opt(args, '--dir'), ts: !args.includes('--js') });
    const shown = path.relative(process.cwd(), r.dir) || r.dir;
    const arg = /\s/.test(shown) ? `"${shown}"` : shown;
    console.log(`mod "${r.id}" criado em ${r.dir} (${r.ts ? 'TypeScript' : 'JavaScript'})`);
    console.log(`  próximo passo: modkit pack ${arg}`);
    console.log('  depois: ponha o .mcmod na MODS_DIR do servidor, ou use /mod previa <link> no jogo');
    return 0;
  },
  async build(args) { await buildMod(path.resolve(positional(args) ?? '.')); return 0; },
  pack: cmdPack,
  check: cmdCheck,
  sdk(args) {
    const done = refreshSdk(positional(args));
    console.log(done.length ? `atualizado: ${done.join(', ')}` : 'nada a mudar: o mod já está com a versão desta cópia do modkit');
    return 0;
  },
  help() { console.log(USAGE); return 0; },
};

/** O ponto de entrada da CLI. -> o código de saída. */
export async function main(argv: string[] = process.argv.slice(2)): Promise<number> {
  const [cmd, ...args] = argv;
  if (!cmd || cmd === '--help' || cmd === '-h' || cmd === 'help') { console.log(USAGE); return 0; }
  if (cmd === '--version' || cmd === '-v') { console.log(VERSION); return 0; }
  const run = COMMANDS[cmd];
  if (!run) { console.error(`comando desconhecido: "${cmd}"\n\n${USAGE}`); return 1; }
  try {
    return await run(args);
  } catch (e) {
    if (e instanceof PackError || e instanceof BuildError || e instanceof NewError) { console.error(`ERRO: ${e.message}`); return 1; }
    throw e;
  }
}

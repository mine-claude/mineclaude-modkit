// `modkit new <id>`: cria o repositório de um mod novo que já passa no `check` e já empacota.
//
// O que sai: o `package.json` na forma empacotada (os `scripts` apontam para os arquivos MONTADOS e
// `scripts._sources` para as fontes), as três entradas de exemplo (conteúdo, servidor, navegador), o
// `mineclaude-sdk.js` e o `mineclaude-mod.d.ts` copiados para dentro do mod (autocompletar no editor sem depender
// de nada), uma textura 16x16 pintada aqui, o empacotador de um arquivo em `tools/pack.mjs` e o workflow de Release.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MOD_ID_RE } from './rules.ts';
import { encodePng } from './png.ts';

const KIT = fileURLToPath(new URL('../', import.meta.url));

export class NewError extends Error {}
const fail: (m: string) => never = (m) => { throw new NewError(m); };

// Arte original 16x16: uma gema azul facetada (losango, borda escura, faceta clara em cima à esquerda, brilho).
function gem(x: number, y: number): readonly [number, number, number, number] {
  const d = Math.abs(x - 7.5) + Math.abs(y - 7.5);
  if (d > 7) return [0, 0, 0, 0];
  if (d > 6) return [0x17, 0x4a, 0x6d, 255];
  if (x === 5 && y === 5) return [255, 255, 255, 255];
  if (x < 8 && y < 8) return [0x6f, 0xc4, 0xee, 255];
  return x + y > 15 ? [0x1f, 0x69, 0x9c, 255] : [0x2f, 0x86, 0xc0, 255];
}

/** -> { dir, id, ts } */
export function newMod(id: string | undefined, { dir: dirArg, ts = true }: { dir?: string; ts?: boolean } = {}): { dir: string; id: string; ts: boolean } {
  if (!id) fail('falta o id do mod');
  if (!MOD_ID_RE.test(id) || id === 'mineclaude') fail(`id inválido "${id}" (use só a-z, 0-9 e _; "mineclaude" é o jogo base)`);
  let dir = path.resolve(dirArg ?? id);
  if (dirArg !== undefined && path.basename(dir) !== id) dir = path.join(dir, id);
  if (fs.existsSync(dir)) fail(`"${dir}" já existe (não vou sobrescrever)`);

  const ext = ts ? 'ts' : 'js';
  const tplDir = path.join(KIT, 'templates', ts ? 'mod-ts' : 'mod');
  const fill = (text: string) => text.replaceAll('__ID__', id);
  const read = (...p: string[]) => fs.readFileSync(path.join(...p), 'utf8');
  const write = (rel: string, text: string) => {
    const f = path.join(dir, ...rel.split('/'));
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, text);
  };

  const pkg = {
    name: id,
    version: '0.1.0',
    description: `Mod ${id} do MineClaude.`,
    authors: ['você'],
    private: true,
    mineclaude: { config: { mensagem: 'Brilha!', gemas_por_uso: 1 } },
    scripts: {
      // o que entra no .mcmod: um arquivo montado por lado. A pasta de `server` fica privada inteira.
      main: 'dist/main/main.js',
      server: 'dist/server/main.js',
      client: 'dist/client/main.js',
      // ferramenta do autor (começa com "_", então o servidor ignora e o pacote não o leva): o que montar
      _sources: { main: `src/main.${ext}`, server: `src/server.${ext}`, client: `src/client.${ext}` },
    },
  };
  write('package.json', `${JSON.stringify(pkg, null, 2)}\n`);
  for (const side of ['main', 'server', 'client']) write(`src/${side}.${ext}`, fill(read(tplDir, 'src', `${side}.${ext}`)));
  write(ts ? 'tsconfig.json' : 'jsconfig.json', read(tplDir, ts ? 'tsconfig.json' : 'jsconfig.json'));
  write('README.md', fill(read(KIT, 'templates', 'mod', 'README.md')));
  write('.gitignore', read(KIT, 'templates', 'mod', 'gitignore'));
  write('.github/workflows/release.yml', read(KIT, 'templates', 'release.yml'));
  write('tools/pack.mjs', read(KIT, 'templates', 'pack.mjs'));
  // o contrato, dentro do mod: a casca que o mod importa e os tipos que o editor lê
  write('mineclaude-sdk.js', read(KIT, 'runtime', 'mineclaude-sdk.js'));
  write('mineclaude-mod.d.ts', read(KIT, 'types', 'mineclaude-mod.d.ts'));
  fs.mkdirSync(path.join(dir, 'textures'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'textures', `${id}_gem.png`), encodePng(16, 16, gem));
  return { dir, id, ts };
}

/** `modkit sdk [pasta]`: atualiza a casca e os tipos dentro de um mod que já existe. -> os arquivos reescritos. */
export function refreshSdk(dir?: string): string[] {
  const target = path.resolve(dir ?? '.');
  if (!fs.existsSync(path.join(target, 'package.json')) && !fs.existsSync(path.join(target, 'mod.json'))) {
    fail(`"${target}" não tem package.json nem mod.json: não parece a pasta de um mod`);
  }
  const done: string[] = [];
  const pares: Array<[string[], string]> = [[['runtime', 'mineclaude-sdk.js'], 'mineclaude-sdk.js'], [['types', 'mineclaude-mod.d.ts'], 'mineclaude-mod.d.ts']];
  for (const [from, to] of pares) {
    const want = fs.readFileSync(path.join(KIT, ...from), 'utf8');
    const f = path.join(target, to);
    let have: string | null = null;
    try { have = fs.readFileSync(f, 'utf8'); } catch { /* ainda não existe */ }
    if (have === want) continue;
    fs.writeFileSync(f, want);
    done.push(to);
  }
  return done;
}

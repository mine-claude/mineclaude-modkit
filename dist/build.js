// Monta as entradas do mod: um módulo ES por lado, com o SDK embutido.
//
// O `package.json` declara duas coisas por lado: `scripts.<lado>` é o arquivo MONTADO (o que entra no `.mcmod`) e
// `scripts._sources.<lado>` é a fonte a empacotar. `_sources` começa com "_", então o servidor o ignora e o `pack`
// não o leva no pacote: é ferramenta do autor.
//
// `main` e `client` são buscados e rodados pelo NAVEGADOR, então são montados para o navegador e não podem tocar em
// nada de `node:*` (o jogo recusa). `server` roda só no servidor, onde `node:*` vale, e é montado para o Bun.
//
// O build roda COM A PASTA DO MOD COMO RAIZ. Isso não é detalhe: o Bun escreve o caminho de cada módulo num
// comentário do pacote, relativo à raiz, então montar de outro lugar mudaria os bytes do `.mcmod` (a Release
// deixaria de ser reproduzível) e ainda escreveria o caminho da máquina do autor dentro do arquivo publicado.
import fs from 'node:fs';
import path from 'node:path';
import { MCMOD_SIDES } from "./rules.js";
export class BuildError extends Error {
}
const fail = (m) => { throw new BuildError(m); };
/** -> [{ side, outfile, bytes }] */
export async function buildMod(dir, { clean = true, log = console.log } = {}) {
    if (typeof Bun === 'undefined')
        fail('o build precisa do Bun (https://bun.sh): é ele que monta as entradas');
    let pkg = {};
    try {
        pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
    }
    catch (e) {
        fail(`package.json ausente ou inválido em ${dir} (${e.message})`);
    }
    const sources = pkg.scripts?._sources ?? {};
    const sides = MCMOD_SIDES.filter((s) => sources[s]);
    if (!sides.length)
        fail('package.json: scripts._sources precisa dizer qual arquivo montar por lado (ex.: { "main": "src/main.js" })');
    // só as pastas de saída declaradas são limpas (nunca a pasta do mod)
    if (clean) {
        for (const s of sides) {
            const out = pkg.scripts?.[s];
            if (!out)
                continue;
            const folder = path.posix.dirname(out);
            if (folder !== '.' && !folder.startsWith('..'))
                fs.rmSync(path.join(dir, ...folder.split('/')), { recursive: true, force: true });
        }
    }
    const made = [];
    const back = process.cwd();
    try {
        process.chdir(dir); // a raiz do build: ver a nota no topo deste arquivo
        for (const side of sides) {
            const entry = sources[side];
            const outfile = pkg.scripts?.[side];
            if (!outfile)
                fail(`scripts._sources.${side} existe mas scripts.${side} não (diga onde o arquivo montado vai ficar)`);
            if (!fs.statSync(path.join(dir, ...entry.split('/')), { throwIfNoEntry: false })?.isFile())
                fail(`scripts._sources.${side} "${entry}" não existe`);
            const r = await Bun.build({
                entrypoints: [entry],
                outdir: path.posix.dirname(outfile),
                naming: path.posix.basename(outfile),
                target: side === 'server' ? 'bun' : 'browser',
                format: 'esm',
                minify: false,
            });
            if (!r.success) {
                for (const l of r.logs)
                    console.error(String(l));
                fail(`o build de "${side}" falhou`);
            }
            const bytes = fs.statSync(path.join(dir, ...outfile.split('/'))).size;
            log(`${outfile} (${bytes} bytes)`);
            made.push({ side, outfile, bytes });
        }
    }
    finally {
        process.chdir(back);
    }
    return made;
}

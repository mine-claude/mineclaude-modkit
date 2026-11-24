#!/usr/bin/env node
// O executável do modkit.
//
// O kit roda no Node E no Bun: `new`, `check` e `sdk` só usam `node:fs`. Mas `build` e `pack` MONTAM as entradas do
// mod, e quem monta é o Bun (`Bun.build`) — não há empacotador em Node aqui.
//
// O problema que isto resolve: num `bunx mineclaude-modkit pack`, o `bunx` respeita o `#!/usr/bin/env node` da
// primeira linha e roda este arquivo no NODE, onde `Bun.build` não existe. O comando falhava dizendo que precisava
// do Bun mesmo com o Bun instalado e sendo justamente o Bun que o havia chamado. Então, quando o comando precisa do
// Bun e não estamos nele, este arquivo se re-executa com `bun`, repassando os argumentos, a saída e o código de
// saída. `MODKIT_REEXEC` impede um segundo salto: se o `bun` do PATH não for o Bun, a mensagem é clara em vez de
// virar laço infinito.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { main, NEEDS_BUN } from "./cli.js";
const underBun = typeof globalThis.Bun !== 'undefined';
const cmd = process.argv[2];
if (!underBun && cmd !== undefined && NEEDS_BUN.includes(cmd)) {
    if (process.env.MODKIT_REEXEC === '1') {
        console.error(`ERRO: "${cmd}" precisa do Bun para montar as entradas do mod, e o "bun" do PATH não é o Bun.\n`
            + 'Instale-o em https://bun.sh e rode de novo, ou chame direto: bun <caminho>/bin/mineclaude-modkit.mjs '
            + process.argv.slice(2).join(' '));
        process.exit(1);
    }
    const r = spawnSync('bun', [fileURLToPath(import.meta.url), ...process.argv.slice(2)], {
        stdio: 'inherit', shell: false, env: { ...process.env, MODKIT_REEXEC: '1' },
    });
    if (r.error || r.status === null) {
        const porque = r.error?.code === 'ENOENT'
            ? 'não achei o "bun" no PATH'
            : `o bun não rodou (${r.error?.message ?? 'morto por sinal'})`;
        console.error(`ERRO: "${cmd}" monta as entradas do mod, e para isso precisa do Bun: ${porque}.\n`
            + 'Instale-o em https://bun.sh (os outros comandos, como new e check, funcionam no Node).');
        process.exit(1);
    }
    process.exit(r.status);
}
process.exitCode = await main();

export declare const VERSION: string;
/**
 * Os comandos que MONTAM as entradas do mod, e por isso precisam do Bun (`Bun.build`).
 * `bin/mineclaude-modkit.mjs` se re-executa com `bun` quando um destes é chamado de dentro do Node.
 * Os outros (`new`, `check`, `sdk`, `help`) só usam `node:fs` e rodam nos dois.
 */
export declare const NEEDS_BUN: readonly string[];
export declare function cmdCheck(args: string[]): number;
export declare function cmdPack(args: string[]): Promise<number>;
/** O ponto de entrada da CLI. -> o código de saída. */
export declare function main(argv?: string[]): Promise<number>;

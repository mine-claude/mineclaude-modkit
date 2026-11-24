/** O id de um mod (o `name` do package.json e o nome do arquivo `<id>.mcmod`). */
export declare const MOD_ID_RE: RegExp;
/** A versão de um mod. */
export declare const VERSION_RE: RegExp;
/** A extensão do mod empacotado. */
export declare const MCMOD_EXT = ".mcmod";
/** Os lados que o package.json de um `.mcmod` pode declarar em `scripts`, nesta ordem. */
export declare const MCMOD_SIDES: readonly string[];
/** As únicas chaves de topo que viajam dentro do `.mcmod` (as outras são ferramenta do autor e ficam fora). */
export declare const MCMOD_KEYS: readonly string[];
/** As chaves do bloco `mineclaude` do package.json (a semântica é a mesma do mod.json). */
export declare const MCMOD_BLOCK_KEYS: readonly string[];
/** As chaves de topo que um `mod.json` (mod em pasta) conhece; qualquer outra é um aviso. */
export declare const MANIFEST_KEYS: readonly string[];
/** Onde o mod roda: `*` nos dois lados, `client` só no navegador, `server` só no servidor. */
export declare const ENVIRONMENTS: readonly string[];
/** Os tipos de entrada de um mod em pasta. */
export declare const ENTRY_KINDS: readonly string[];
/** Quantos arquivos de entrada um lado aceita. */
export declare const MAX_ENTRIES = 16;
/** Um arquivo de entrada: um caminho .js/.ts dentro da pasta do mod, sem "..". */
export declare const ENTRY_RE: RegExp;
/** O `main` curto: um arquivo .js/.ts na raiz da pasta do mod. */
export declare const MAIN_RE: RegExp;
/** A pasta privada: nada debaixo de `server/` é servido ao navegador. */
export declare const isServerPath: (rel: string) => boolean;
/** As pastas de recursos que entram no pacote junto com os scripts montados. */
export declare const ASSET_DIRS: readonly string[];
/** Os limites do zip do `.mcmod` (o leitor do servidor recusa acima deles). */
export declare const ZIP_LIMITS: {
    entries: number;
    entryBytes: number;
    totalBytes: number;
    zipBytes: number;
};
/** O bloco `config` (mod.json) ou `mineclaude.config` (package.json): até 50 chaves. */
export declare const MAX_CONFIG_KEYS = 50;
export declare const MAX_CONFIG_STRING = 200;
export declare const CONFIG_KEY_RE: RegExp;
/** Confere um bloco `config`. Devolve as chaves; lança Error com a mesma mensagem que o servidor daria. */
export declare function checkConfigBlock(cfg: unknown): string[];

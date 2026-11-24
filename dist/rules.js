// As regras do servidor que um mod precisa obedecer, como DADOS: nenhuma linha do motor.
// GERADO a partir do jogo por `bun run sdk:sync`: não edite à mão.
//
// São exatamente os valores que a descoberta de mods do servidor usa para aceitar ou recusar um mod, então o que
// `modkit check` aprova aqui é o que o servidor aprova lá. O que NÃO está aqui (carregar o mod de verdade, rodar o
// register, medir a superfície do ctx) só o jogo faz: para isso existe `/mod previa` e a tela Mods.
/** O id de um mod (o `name` do package.json e o nome do arquivo `<id>.mcmod`). */
export const MOD_ID_RE = /^[a-z0-9_]+$/;
/** A versão de um mod. */
export const VERSION_RE = /^[0-9A-Za-z.+-]{1,32}$/;
/** A extensão do mod empacotado. */
export const MCMOD_EXT = ".mcmod";
/** Os lados que o package.json de um `.mcmod` pode declarar em `scripts`, nesta ordem. */
export const MCMOD_SIDES = ["main", "server", "client"];
/** As únicas chaves de topo que viajam dentro do `.mcmod` (as outras são ferramenta do autor e ficam fora). */
export const MCMOD_KEYS = ["name", "version", "description", "author", "authors", "homepage", "license", "scripts", "private", "type", "$schema", "mineclaude"];
/** As chaves do bloco `mineclaude` do package.json (a semântica é a mesma do mod.json). */
export const MCMOD_BLOCK_KEYS = ["depends", "dependencies", "optional_dependencies", "recommends", "suggests", "conflicts", "breaks", "dependency_sources", "config"];
/** As chaves de topo que um `mod.json` (mod em pasta) conhece; qualquer outra é um aviso. */
export const MANIFEST_KEYS = ["id", "name", "description", "authors", "homepage", "version", "worldgenVersion", "main", "entrypoints", "config", "sandbox", "remote_base", "environment", "depends", "dependencies", "optional_dependencies", "recommends", "suggests", "conflicts", "breaks", "dependency_sources", "files", "author", "license", "icon", "contact", "contributors", "custom", "schemaVersion"];
/** Onde o mod roda: `*` nos dois lados, `client` só no navegador, `server` só no servidor. */
export const ENVIRONMENTS = ["*", "client", "server"];
/** Os tipos de entrada de um mod em pasta. */
export const ENTRY_KINDS = ["main", "server", "client"];
/** Quantos arquivos de entrada um lado aceita. */
export const MAX_ENTRIES = 16;
/** Um arquivo de entrada: um caminho .js/.ts dentro da pasta do mod, sem "..". */
export const ENTRY_RE = /^([A-Za-z0-9_][A-Za-z0-9_.-]*\/)*[A-Za-z0-9_][A-Za-z0-9_.-]*\.(js|ts)$/;
/** O `main` curto: um arquivo .js/.ts na raiz da pasta do mod. */
export const MAIN_RE = /^[A-Za-z0-9_][A-Za-z0-9_.-]*\.(js|ts)$/;
/** A pasta privada: nada debaixo de `server/` é servido ao navegador. */
export const isServerPath = (rel) => rel.split('/')[0].toLowerCase() === 'server';
/** As pastas de recursos que entram no pacote junto com os scripts montados. */
export const ASSET_DIRS = ["assets", "lang", "models", "textures", "sounds", "data", "animations"];
/** Os limites do zip do `.mcmod` (o leitor do servidor recusa acima deles). */
export const ZIP_LIMITS = { "entries": 2048, "entryBytes": 33554432, "totalBytes": 134217728, "zipBytes": 167772160 };
/** O bloco `config` (mod.json) ou `mineclaude.config` (package.json): até 50 chaves. */
export const MAX_CONFIG_KEYS = 50;
export const MAX_CONFIG_STRING = 200;
export const CONFIG_KEY_RE = /^[a-z][a-z0-9_]{0,31}$/;
const configTypeOk = (v) => (typeof v === 'number' && Number.isFinite(v)) || typeof v === 'boolean' || (typeof v === 'string' && v.length <= MAX_CONFIG_STRING);
/** Confere um bloco `config`. Devolve as chaves; lança Error com a mesma mensagem que o servidor daria. */
export function checkConfigBlock(cfg) {
    if (cfg === undefined)
        return [];
    if (!cfg || typeof cfg !== 'object' || Array.isArray(cfg))
        throw new Error('config must be an object { key: number | boolean | text }');
    const obj = cfg;
    const keys = Object.keys(obj);
    if (keys.length > MAX_CONFIG_KEYS)
        throw new Error(`config has ${keys.length} keys (at most ${MAX_CONFIG_KEYS})`);
    for (const k of keys) {
        if (!CONFIG_KEY_RE.test(k))
            throw new Error(`config key "${k}" is invalid (expected ${CONFIG_KEY_RE})`);
        if (!configTypeOk(obj[k]))
            throw new Error(`config "${k}" must be a finite number, a boolean or a text up to ${MAX_CONFIG_STRING} characters`);
    }
    return keys;
}

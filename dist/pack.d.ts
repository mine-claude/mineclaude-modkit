export interface ZipEntry {
    name: string;
    data: Buffer;
}
/** O package.json de um mod, como vem do disco: JSON, logo sem forma garantida. */
export type RawPackage = Record<string, any>;
export interface Shipped extends RawPackage {
    scripts?: Record<string, string>;
}
export declare class PackError extends Error {
}
/** Os arquivos de `root/rel`, caminhos relativos com "/". Recusa link simbólico (um link sairia do pacote). */
export declare function walk(root: string, rel?: string): string[];
/**
 * O que viaja dentro do pacote: só as chaves que o servidor conhece, e `scripts` reduzido aos lados
 * (`build` e as dependências de desenvolvimento são ferramenta do autor; o servidor recusa o resto).
 * As chaves que começam com "_" passam: são comentário do autor. A ORDEM é a que o autor escreveu.
 * -> { shipped, dropped: [nomes que ficaram fora] }
 */
export declare function shippedPackage(pkg: RawPackage): {
    shipped: Shipped;
    dropped: string[];
};
/**
 * Os arquivos do pacote, em ordem: para cada lado, o script montado (um arquivo solto na raiz) ou a pasta dele
 * inteira; depois cada pasta de recursos que existir.
 */
export declare function collectFiles(dir: string, scripts: Record<string, string> | undefined): string[];
export declare function crc32(buf: Uint8Array): number;
export declare function safeName(name: string): string;
/** entries: [{ name, data: Buffer }] -> Buffer do zip. */
export declare function makeZip(entries: readonly ZipEntry[]): Buffer;
/** O conteúdo do `.mcmod` de uma pasta já montada -> { entries, shipped, dropped, id, version }. */
export declare function packageEntries(dir: string): {
    entries: ZipEntry[];
    shipped: Shipped;
    dropped: string[];
    id: string;
    version: string;
};
export declare const mcmodName: (id: string) => string;

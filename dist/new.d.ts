export declare class NewError extends Error {
}
/** -> { dir, id, ts } */
export declare function newMod(id: string | undefined, { dir: dirArg, ts }?: {
    dir?: string;
    ts?: boolean;
}): {
    dir: string;
    id: string;
    ts: boolean;
};
/** `modkit sdk [pasta]`: atualiza a casca e os tipos dentro de um mod que já existe. -> os arquivos reescritos. */
export declare function refreshSdk(dir?: string): string[];

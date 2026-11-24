export interface CheckOk {
    ok: true;
    form: 'empacotado' | 'pasta';
    id: string;
    version: string;
    environment: '*' | 'client' | 'server';
    entrypoints: Record<string, string | string[]>;
    privateDir: string | null;
    config: string[];
    depends: Record<string, Record<string, unknown>>;
    assetDirs: string[];
    warnings: string[];
}
export interface CheckBad {
    ok: false;
    error: string;
    warnings: string[];
}
export type CheckResult = CheckOk | CheckBad;
/**
 * Confere a pasta de um mod.
 * -> { ok: true, form, id, version, environment, entrypoints, assetDirs, config, depends, warnings }
 *  | { ok: false, error, warnings }
 */
export declare function checkMod(dir: string): CheckResult;

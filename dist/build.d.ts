export interface BuiltSide {
    side: string;
    outfile: string;
    bytes: number;
}
export declare class BuildError extends Error {
}
/** -> [{ side, outfile, bytes }] */
export declare function buildMod(dir: string, { clean, log }?: {
    clean?: boolean;
    log?: (m: string) => void;
}): Promise<BuiltSide[]>;

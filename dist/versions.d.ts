export type Semantic = {
    parts: number[];
    pre: string[] | null;
};
export type Predicate = (version: string) => boolean;
export declare function cmpVersion(a: string, b: string): number;
export declare function versionPredicate(spec: unknown): Predicate;
export declare function versionOk(spec: unknown, version: string): boolean;

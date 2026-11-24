export declare const VERSION: string;
export declare function cmdCheck(args: string[]): number;
export declare function cmdPack(args: string[]): Promise<number>;
/** O ponto de entrada da CLI. -> o código de saída. */
export declare function main(argv?: string[]): Promise<number>;

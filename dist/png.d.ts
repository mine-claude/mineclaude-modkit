/** pixel(x, y) -> [r, g, b, a] */
export type Pixel = (x: number, y: number) => readonly [number, number, number, number];
export declare function encodePng(w: number, h: number, pixel: Pixel): Buffer;

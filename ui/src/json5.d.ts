// json5 2.1 has no bundled type definitions
declare module 'json5' {
    export function parse(text: string): unknown;
}

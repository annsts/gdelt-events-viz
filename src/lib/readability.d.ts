declare module '@mozilla/readability' {
    export class Readability {
        constructor(document: Document, options?: object);
        parse(): Readability.ParseResult | null;
    }

    export namespace Readability {
        interface ParseResult {
            title: string;
            content: string;
            length: number;
            excerpt: string;
            byline: string;
            dir: string;
            siteName: string;
            lang: string;
        }
    }
}
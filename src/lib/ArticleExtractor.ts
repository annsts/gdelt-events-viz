"use server";
import axios from 'axios';
import { parse, parseISO, format } from 'date-fns';
import * as cheerio from 'cheerio';
import { detect } from 'langdetect';
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import { resolve as urlResolve } from 'url';
import { decode } from 'html-entities';

interface ExtractedArticle {
    title: string | null;
    author: string | null;
    publish_date: string | null;
    description: string | null;
    text: string | null;
    top_image: string | null;
    language: string | null;
    error?: string;
}


class ArticleExtractor {
    private url: string | null;
    private html_content: string;
    private $: cheerio.Root | null;
    private readability_doc: Readability.ParseResult | null;

    constructor(content: string) {
        this.url = content.trim().startsWith('http://') || content.trim().startsWith('https://') ? content : null;
        this.html_content = this.url ? '' : content;
        this.$ = null;
        this.readability_doc = null;
    }

    private async init(): Promise<void> {
        if (this.url) {
            this.html_content = await this.fetchContent(this.url);
        } else {
            this.html_content = this.html_content || '';
        }
        this.$ = cheerio.load(this.html_content);
        const dom = new JSDOM(this.html_content);
        this.readability_doc = new Readability(dom.window.document).parse();
    }

    private async fetchContent(url: string, retries: number = 3): Promise<string> {
        for (let i = 0; i < retries; i++) {
            try {
                const response = await axios.get(url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                    },
                    timeout: 10000
                });
                return response.data;
            } catch (error) {
                console.error(`Error fetching ${url} (attempt ${i + 1}/${retries}): ${(error as Error).message}`);
                if (i === retries - 1) {
                    throw error;
                }
                await new Promise(resolve => setTimeout(resolve, 1000)); 
            }
        }
        return "";
    }

    public async extract(): Promise<ExtractedArticle> {
        try {
            await this.init();
            const result: ExtractedArticle = {
                title: this.extractTitle(),
                author: this.extractAuthor(),
                publish_date: this.extractPublishDate(),
                description: this.extractDescription(),
                text: this.extractMainText(),
                top_image: this.extractTopImage(),
                language: this.detectLanguage()
            };
    
            const crucialFields: (keyof ExtractedArticle)[] = ['title', 'text'];
            const missingFields = crucialFields.filter(field => !result[field]);
    
            if (missingFields.length > 0) {
                console.warn(`Missing crucial fields: ${missingFields.join(', ')}`);
                result.error = `Missing crucial fields: ${missingFields.join(', ')}`;
            }
    
            return result;
        } catch (error) {
            console.error(`Error extracting article: ${(error as Error).message}`);
            return {
                title: null,
                author: null,
                publish_date: null,
                description: null,
                text: null,
                top_image: null,
                language: null,
                error: (error as Error).message
            };
        }
    }

    private extractTitle(): string | null {
        const methods = [
            () => this.$?.('meta[property="og:title"]').attr('content'),
            () => this.$?.('title').text(),
            () => this.readability_doc?.title
        ];
        return this.tryMethods(methods);
    }

    private extractAuthor(): string {
        const methods = [
            () => this.$?.('meta[name="author"]').attr('content'),
            () => this.$?.('meta[property="article:author"]').attr('content'),
            () => this.$?.('p.byline, span.byline, p.author, span.author').first().text().trim(),
            () => {
                const jsonLdAuthor = this.extractFromJsonLd('author');
                if (jsonLdAuthor) {
                    if (Array.isArray(jsonLdAuthor)) {
                        return jsonLdAuthor.map(author => (author as any).name || author).join(', ');
                    } else if (typeof jsonLdAuthor === 'object') {
                        return (jsonLdAuthor as any).name || JSON.stringify(jsonLdAuthor);
                    }
                    return jsonLdAuthor as string;
                }
                return null;
            }
        ];
        return this.tryMethods(methods) || 'Unknown Author';
    }

    private extractPublishDate(): string | null {
        const methods = [
            () => this.parseDate(this.$?.('meta[property="article:published_time"]').attr('content')),
            () => this.parseDate(this.$?.('meta[property="og:pubdate"]').attr('content')),
            () => this.parseDate(this.$?.('time').attr('datetime')),
            () => this.extractDateFromUrl(),
            () => this.parseDate(this.extractFromJsonLd('datePublished') as string)
        ];
        return this.tryMethods(methods);
    }
    
    private parseDate(dateString: string | undefined): string | null {
        if (!dateString) return null;
        try {
            const date = parseISO(dateString);
            return isNaN(date.getTime()) ? null : format(date, 'yyyy-MM-dd HH:mm:ss');
        } catch (error) {
            console.error(`Error parsing date: ${dateString}`);
            return null;
        }
    }

    private extractDescription(): string | null {
        const methods = [
            () => this.$?.('meta[name="description"]').attr('content'),
            () => this.$?.('meta[property="og:description"]').attr('content'),
            () => this.$?.('meta[name="twitter:description"]').attr('content'),
            () => {
                const jsonLdDescription = this.extractFromJsonLd('description');
                return typeof jsonLdDescription === 'string' ? jsonLdDescription : null;
            },
            () => this.$?.('p.article-description, p.standfirst').first().text().trim(),
            () => {
                const firstParagraph = this.$?.('article p').first().text().trim();
                return firstParagraph && firstParagraph.length > 50 ? firstParagraph : null;
            }
        ];
        return this.tryMethods(methods);
    }

    private extractMainText(): string | null {
        const methods = [
            () => this.readability_doc?.content,
            () => this.$?.('article').text(),
            () => this.$?.('div.content, div.article-body').text(),
            () => this.$?.('p').map((i, el) => cheerio(el).text()).get().join(' ') ?? null
        ];
        const text = this.tryMethods(methods);
        return text ? this.cleanText(text) : null;
    }

    private extractTopImage(): string | null {
        const methods = [
            () => this.$?.('meta[property="og:image"]').attr('content'),
            () => this.$?.('img.article, img.main, img.hero').first().attr('src'),
            () => this.extractFromJsonLd('image') as string
        ];
        const imageUrl = this.tryMethods(methods);
        return this.url && imageUrl ? urlResolve(this.url, imageUrl) : imageUrl;
    }

    private detectLanguage(): string | null {
        try {
            const text = this.extractMainText();
            if (text) {
                const detectionResult = detect(text.substring(0, 1000));
                if (detectionResult && detectionResult.length > 0) {
                    return detectionResult[0].lang;
                }
            }
            return null;
        } catch (error) {
            console.error(`Error detecting language: ${(error as Error).message}`);
            return null;
        }
    }

    private extractFromJsonLd(key: string): string | object | null {
        const scripts = this.$?.('script[type="application/ld+json"]');
        if (!scripts || !scripts.length) return null;
    
        for (let i = 0; i < scripts.length; i++) {
            try {
                const scriptContent = this.$?.(scripts[i]).html() ?? null;
                if (scriptContent) {
                    const data = JSON.parse(scriptContent);
                    const findValue = (obj: any): any => {
                        if (obj[key]) return obj[key];
                        for (let k in obj) {
                            if (typeof obj[k] === 'object') {
                                const found = findValue(obj[k]);
                                if (found) return found;
                            }
                        }
                        return null;
                    };
                    const result = findValue(data);
                    if (result) return result;
                }
            } catch (error) {
                console.error(`Error parsing JSON-LD: ${(error as Error).message}`);
            }
        }
        return null;
    }

    private extractDateFromUrl(): string | null {
        if (this.url) {
            const match = this.url.match(/\/(\d{4}\/\d{2}\/\d{2})\//);
            if (match) {
                return parse(match[1].replace(/\//g, '-'), 'yyyy-MM-dd', new Date()).toISOString();
            }
        }
        return null;
    }

    private tryMethods(methods: (() => string | undefined | null)[]): string | null {
        for (const method of methods) {
            try {
                const result = method();
                if (result !== undefined && result !== null) {
                    return result;
                }
            } catch (error) {
                console.error(`Error in method: ${(error as Error).message}`);
            }
        }
        return null;
    }

    private cleanText(text: string): string {
        if (!text) return '';

        // Decode HTML entities
        text = decode(text);
    
        // Remove script and style elements
        text = text.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, '');
    
        // Replace block-level elements with newlines
        text = text.replace(/<\/?(p|div|h[1-6]|li|blockquote|section|article|header|footer|nav|figure|figcaption|aside|details|summary|address)[^>]*>/gi, '\n');
    
        // Remove all other HTML tags
        text = text.replace(/<[^>]+>/g, '');
    
        // Remove common image-related phrases
        text = text.replace(/\bGetty Images\b/g, '');
    
        // Replace multiple newlines or spaces with a single space
        text = text.replace(/[\s\n]+/g, ' ').trim();
    
        // Normalize line breaks
        text = text.split(/\n+/).map(line => line.trim()).filter(Boolean).join('\n\n');
    
        return text.trim();
    }
}
export default ArticleExtractor; 

export async function extractArticle(content: string): Promise<ExtractedArticle> {
    const extractor = new ArticleExtractor(content);
    return await extractor.extract();
}
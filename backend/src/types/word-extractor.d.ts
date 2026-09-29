declare module "word-extractor" {
  export interface ExtractedDocument {
    getBody(): string;
    getFooters(): string;
    getHeaders(): string;
    getFootnotes(): string;
    getEndnotes(): string;
    getAnnotations(): string;
  }

  export default class WordExtractor {
    extract(input: Buffer | string): Promise<ExtractedDocument>;
  }
}

// 为没有类型定义的第三方库提供声明
declare module 'pdf-parse' {
  interface PDFData {
    numpages: number;
    numrender: number;
    info: Record<string, any>;
    metadata: Record<string, any>;
    text: string;
    version: string;
  }
  
  function parse(dataBuffer: Buffer, options?: Record<string, any>): Promise<PDFData>;
  export = parse;
}

declare module 'papaparse' {
  interface ParseConfig {
    delimiter?: string;
    newline?: string;
    quoteChar?: string;
    escapeChar?: string;
    header?: boolean;
    dynamicTyping?: boolean;
    preview?: number;
    encoding?: string;
    worker?: boolean;
    comments?: boolean | string;
    step?: (results: ParseResult, parser: Parser) => void;
    complete?: (results: ParseResult, file: File) => void;
    error?: (error: Error, file: File) => void;
    download?: boolean;
    skipEmptyLines?: boolean;
    chunk?: (results: ParseResult, parser: Parser) => void;
    fastMode?: boolean;
    beforeFirstChunk?: (chunk: string) => string | void;
    withCredentials?: boolean;
    transform?: (value: string, field: string | number) => any;
    delimitersToGuess?: string[];
  }
  
  interface UnparseConfig {
    quotes?: boolean | boolean[];
    quoteChar?: string;
    escapeChar?: string;
    delimiter?: string;
    header?: boolean;
    newline?: string;
    skipEmptyLines?: boolean;
    columns?: string[];
  }
  
  interface ParseMeta {
    delimiter: string;
    linebreak: string;
    aborted: boolean;
    fields: string[];
    truncated: boolean;
    cursor: number;
  }
  
  interface ParseResult {
    data: any[];
    errors: any[];
    meta: ParseMeta;
  }
  
  interface Parser {
    abort: () => void;
    pause: () => void;
    resume: () => void;
  }
  
  export function parse(input: string, config?: ParseConfig): ParseResult;
  export function unparse(data: any, config?: UnparseConfig): string;
}

// 为mammoth.js提供声明
declare module 'mammoth' {
  interface ConversionResult {
    value: string;
    messages: any[];
  }
  
  export function extractRawText(options: { path?: string, buffer?: Buffer }): Promise<ConversionResult>;
  export function convertToHtml(options: { path?: string, buffer?: Buffer }): Promise<ConversionResult>;
} 
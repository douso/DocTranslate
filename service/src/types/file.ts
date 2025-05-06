export enum FileType {
  TXT = 'txt',
  MARKDOWN = 'md',
  WORD = 'docx',
  CSV = 'csv',
  EXCEL = 'xlsx',
  PDF = 'pdf',
  SRT = 'srt',
  JSON = 'json'
}

export interface FileInfo {
  originalname: string;
  filename: string;
  path: string;
  size: number;
  mimetype: string;
  extension: string;
  type: FileType;
  options?: TranslationOptions;
}

export interface TranslationTask {
  id: string;
  fileInfo: FileInfo;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  createdAt: string;
  updatedAt: string;
  outputPath?: string;
  error?: string;
  retryCount: number;
  fingerprint: string;
}

export interface TranslationOptions {
  sourceLanguage?: string;
  targetLanguage: string;
  preserveFormatting?: boolean;
}

export interface TranslationResult {
  originalText: string;
  translatedText: string;
  success: boolean;
  error?: string;
}

// 任务状态
export type TaskStatus = 'pending' | 'processing' | 'completed' | 'failed'; 
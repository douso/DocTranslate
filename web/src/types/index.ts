// 文件类型枚举
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

// 翻译任务状态
export type TaskStatus = 'pending' | 'processing' | 'completed' | 'failed';

// 文件信息接口
export interface FileInfo {
  originalname: string;
  filename: string;
  path: string;
  size: number;
  mimetype: string;
  extension: string;
  type: FileType;
}

// 翻译任务接口
export interface TranslationTask {
  id: string;
  fileInfo: FileInfo;
  status: TaskStatus;
  progress: number;
  createdAt: string;
  updatedAt: string;
  outputPath?: string;
  error?: string;
  retryCount: number;
}

// 翻译选项接口
export interface TranslationOptions {
  sourceLanguage?: string;
  targetLanguage: string;
  preserveFormatting?: boolean;
}

// 批量翻译状态接口
export interface BatchTranslationStatus {
  batchId: string;
  taskIds: string[];
  completedCount: number;
  failedCount: number;
  totalCount: number;
  progress: number;
  status: TaskStatus;
}

// 翻译结果接口
export interface TranslationResult {
  originalText: string;
  translatedText: string;
  success: boolean;
  error?: string;
} 
import { FileType } from '../types/file';
import logger from '../utils/logger';

// 提示词接口
export interface PromptTemplate {
  name: string;
  content: string;
  description?: string;
}

// 不同文件类型的翻译提示词
const translationPrompts: Record<FileType, PromptTemplate> = {
  [FileType.TXT]: {
    name: 'text_translation',
    content: '请将以下文本翻译成{targetLanguage}{preserveFormatting}:\n\n{text}',
    description: '通用文本翻译提示词'
  },
  [FileType.MARKDOWN]: {
    name: 'markdown_translation',
    content: '请将以下Markdown文本翻译成{targetLanguage}，保持所有的Markdown格式、代码块和链接不变:\n\n{text}',
    description: 'Markdown文档翻译提示词'
  },
  [FileType.WORD]: {
    name: 'word_translation',
    content: '请将以下Word文档内容翻译成{targetLanguage}{preserveFormatting}:\n\n{text}',
    description: 'Word文档翻译提示词'
  },
  [FileType.CSV]: {
    name: 'csv_translation',
    content: '请将以下CSV单元格内容翻译成{targetLanguage}，保持数字、日期和ID不变:\n\n{text}',
    description: 'CSV单元格翻译提示词'
  },
  [FileType.EXCEL]: {
    name: 'excel_translation',
    content: '请将以下Excel单元格内容翻译成{targetLanguage}，保持数字、日期和ID不变:\n\n{text}',
    description: 'Excel单元格翻译提示词'
  },
  [FileType.PDF]: {
    name: 'pdf_translation',
    content: '请将以下PDF文本翻译成{targetLanguage}{preserveFormatting}:\n\n{text}',
    description: 'PDF文档翻译提示词'
  },
  [FileType.SRT]: {
    name: 'srt_translation',
    content: '请将以下字幕内容翻译成{targetLanguage}，确保翻译简洁明了，适合字幕显示:\n\n{text}',
    description: 'SRT字幕翻译提示词'
  },
  [FileType.JSON]: {
    name: 'json_translation',
    content: '请将以下JSON字符串内容翻译成{targetLanguage}，只翻译值，不要翻译键，不要翻译JSON结构:\n\n{text}',
    description: 'JSON字符串翻译提示词'
  }
};

// 通用提示词模板
const generalPrompts: Record<string, PromptTemplate> = {
  system_translation: {
    name: 'system_translation',
    content: '你是一个专业的文档翻译助手，请将用户提供的文本从{sourceLanguage}翻译成{targetLanguage}。翻译要准确、地道，保持原文的风格和意思。',
    description: '系统翻译提示词'
  },
  error_correction: {
    name: 'error_correction',
    content: '以下是一段机器翻译的文本，请修正其中的错误，使翻译更加流畅自然:\n\n{text}',
    description: '翻译纠错提示词'
  }
};

/**
 * 获取特定文件类型的翻译提示词
 * @param fileType 文件类型
 * @param params 替换参数
 * @returns 处理后的提示词
 */
export function getTranslationPrompt(fileType: FileType, params: Record<string, string>): string {
  const template = translationPrompts[fileType];
  
  if (!template) {
    logger.warn(`未找到文件类型 ${fileType} 的提示词模板，使用默认提示词`);
    return getGeneralPrompt('system_translation', params);
  }
  
  return replacePromptParams(template.content, params);
}

/**
 * 获取通用提示词
 * @param name 提示词名称
 * @param params 替换参数
 * @returns 处理后的提示词
 */
export function getGeneralPrompt(name: string, params: Record<string, string>): string {
  const template = generalPrompts[name];
  
  if (!template) {
    logger.warn(`未找到名称为 ${name} 的通用提示词模板`);
    return '';
  }
  
  return replacePromptParams(template.content, params);
}

/**
 * 替换提示词中的参数
 * @param template 提示词模板
 * @param params 替换参数
 * @returns 处理后的提示词
 */
function replacePromptParams(template: string, params: Record<string, string>): string {
  let result = template;
  
  // 处理保留格式的特殊参数
  if ('preserveFormatting' in params) {
    const preserveFormatting = params.preserveFormatting === 'true' 
      ? '，保持原文的格式、段落和标点符号' 
      : '';
    result = result.replace('{preserveFormatting}', preserveFormatting);
  }
  
  // 替换其他参数
  for (const [key, value] of Object.entries(params)) {
    if (key !== 'preserveFormatting') {
      result = result.replace(new RegExp(`{${key}}`, 'g'), value);
    }
  }
  
  return result;
}

/**
 * 获取所有提示词模板
 * @returns 所有提示词模板
 */
export function getAllPromptTemplates(): Record<string, PromptTemplate[]> {
  return {
    translation: Object.values(translationPrompts),
    general: Object.values(generalPrompts)
  };
} 
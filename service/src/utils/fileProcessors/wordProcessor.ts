import mammoth from 'mammoth';
import fs from 'fs-extra';
import { TranslationOptions } from '../../types/file';
import { translateText } from '../../services/openaiService';
import logger from '../logger';

// 处理Word文件
export async function processWordFile(filePath: string, options: TranslationOptions): Promise<string> {
  try {
    // 提取文本
    const result = await mammoth.extractRawText({ path: filePath });
    const content = result.value;
    
    // 翻译内容
    const translatedContent = await translateText({
      text: content,
      targetLanguage: options.targetLanguage,
      sourceLanguage: options.sourceLanguage,
      preserveFormatting: options.preserveFormatting
    });
    
    // 返回翻译后的内容
    return translatedContent;
    
    // 注意：此实现只返回翻译后的纯文本
    // 如果需要保持格式，需要更复杂的处理
    // 可能需要将翻译后的内容重新插入到Word文档中
  } catch (error) {
    logger.error({ error }, 'Word文件处理失败');
    throw new Error(`Word文件处理失败: ${(error as Error).message}`);
  }
} 
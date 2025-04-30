import fs from 'fs-extra';
import iconv from 'iconv-lite';
import { TranslationOptions } from '../../types/file';
import { translateText } from '../../services/openaiService';
import logger from '../logger';
import { updateTaskStatus } from '../../services/translationService';

// 文本分块大小（字符数）
const CHUNK_SIZE = 3000;

// 处理TXT文件
export async function processTxtFile(filePath: string, options: TranslationOptions, taskId?: string): Promise<string> {
  try {
    // 如果有taskId，则更新进度为5%（表示开始读取文件）
    if (taskId) {
      updateTaskStatus(taskId, 'processing', 5);
    }

    // 读取文件
    const buffer = await fs.readFile(filePath);
    
    // 尝试检测编码并转换为utf8
    let content: string;
    try {
      // 先尝试utf8
      content = buffer.toString('utf8');
    } catch (error) {
      // 如果失败，尝试其他编码
      logger.warn(`文件不是utf8编码，尝试检测编码并转换...`);
      content = iconv.decode(buffer, 'gbk');
    }
    
    // 如果有taskId，则更新进度为10%（表示文件读取和编码转换完成）
    if (taskId) {
      updateTaskStatus(taskId, 'processing', 10);
    }
    
    // 分割文本为适合翻译的块
    const chunks = splitTextIntoChunks(content, CHUNK_SIZE);
    
    // 如果有taskId，则更新进度为15%（表示分块完成）
    if (taskId) {
      updateTaskStatus(taskId, 'processing', 15);
    }
    
    // 翻译每个块
    const translatedChunks = [];
    for (let i = 0; i < chunks.length; i++) {
      logger.info(`翻译TXT块: ${i + 1}/${chunks.length}`);
      
      // 计算翻译进度（15%~95%范围内）
      if (taskId) {
        const progress = 15 + Math.round((i / chunks.length) * 80);
        updateTaskStatus(taskId, 'processing', progress);
      }
      
      const translatedChunk = await translateText({
        text: chunks[i],
        targetLanguage: options.targetLanguage,
        sourceLanguage: options.sourceLanguage,
        preserveFormatting: options.preserveFormatting
      });
      
      translatedChunks.push(translatedChunk);
    }
    
    // 如果有taskId，则更新进度为95%（表示翻译完成，即将合并结果）
    if (taskId) {
      updateTaskStatus(taskId, 'processing', 95);
    }
    
    // 合并翻译结果
    return translatedChunks.join('');
  } catch (error) {
    logger.error({ error }, 'TXT文件处理失败');
    
    // 如果有taskId，则更新任务状态为失败
    if (taskId) {
      updateTaskStatus(taskId, 'failed', 0, undefined, (error as Error).message);
    }
    
    throw new Error(`TXT文件处理失败: ${(error as Error).message}`);
  }
}

// 按大小分割文本，但保持段落完整
function splitTextIntoChunks(text: string, maxChunkSize: number): string[] {
  const chunks: string[] = [];
  const lines = text.split(/\r?\n/);
  
  let currentChunk = '';
  
  for (const line of lines) {
    // 如果当前行加上当前块超过最大块大小，并且当前块不为空，则创建新块
    if (currentChunk.length + line.length > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk);
      currentChunk = '';
    }
    
    // 添加当前行到当前块
    currentChunk += line + '\n';
    
    // 如果当前块已经接近最大大小，则创建新块
    if (currentChunk.length >= maxChunkSize) {
      chunks.push(currentChunk);
      currentChunk = '';
    }
  }
  
  // 添加最后一个块（如果有）
  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }
  
  return chunks;
} 
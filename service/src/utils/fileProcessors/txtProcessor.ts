import fs from 'fs-extra';
import iconv from 'iconv-lite';
import { TranslationOptions } from '../../types/file';
import { translateText } from '../../services/openaiService';
import logger from '../logger';

// 文本分块大小（字符数）
const CHUNK_SIZE = 3000;

// 处理TXT文件
export async function processTxtFile(filePath: string, options: TranslationOptions): Promise<string> {
  try {
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
    
    // 分割文本为适合翻译的块
    const chunks = splitTextIntoChunks(content, CHUNK_SIZE);
    
    // 翻译每个块
    const translatedChunks = await Promise.all(
      chunks.map(async (chunk, index) => {
        logger.info(`翻译TXT块: ${index + 1}/${chunks.length}`);
        return await translateText({
          text: chunk,
          targetLanguage: options.targetLanguage,
          sourceLanguage: options.sourceLanguage,
          preserveFormatting: options.preserveFormatting
        });
      })
    );
    
    // 合并翻译结果
    return translatedChunks.join('');
  } catch (error) {
    logger.error({ error }, 'TXT文件处理失败');
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
import fs from 'fs-extra';
import { TranslationOptions } from '../../types/file';
import { translateText } from '../../services/openaiService';
import logger from '../logger';

// 支持的块大小（字符数）
const CHUNK_SIZE = 3000;

// 处理Markdown文件
export async function processMarkdownFile(filePath: string, options: TranslationOptions): Promise<string> {
  try {
    // 读取文件
    const content = await fs.readFile(filePath, 'utf8');
    
    // 分割Markdown为可管理的块，同时保留结构
    const chunks = splitMarkdownIntoChunks(content, CHUNK_SIZE);
    
    // 翻译每个块
    const translatedChunks = await Promise.all(
      chunks.map(async (chunk, index) => {
        logger.info(`翻译Markdown块: ${index + 1}/${chunks.length}`);
        return await translateText({
          text: chunk,
          targetLanguage: options.targetLanguage,
          sourceLanguage: options.sourceLanguage,
          preserveFormatting: true // Markdown格式必须保留
        });
      })
    );
    
    // 合并翻译结果
    return translatedChunks.join('');
  } catch (error) {
    logger.error({ error }, 'Markdown文件处理失败');
    throw new Error(`Markdown文件处理失败: ${(error as Error).message}`);
  }
}

// 分割Markdown为可管理的块，同时保持段落、标题和代码块的结构
function splitMarkdownIntoChunks(markdown: string, maxChunkSize: number): string[] {
  const chunks: string[] = [];
  // 正则表达式匹配Markdown元素（标题、代码块、列表等）
  const elements = markdown.split(/(?=#{1,6}\s|```)/);
  
  let currentChunk = '';
  
  for (let element of elements) {
    // 检查是否是代码块
    const isCodeBlock = element.startsWith('```');
    
    // 如果当前元素加上当前块会超过最大块大小，并且当前块不为空，
    // 则结束当前块（除非当前元素是代码块的一部分，代码块不应被分割）
    if (currentChunk.length + element.length > maxChunkSize && currentChunk.length > 0 && !isCodeBlock) {
      chunks.push(currentChunk);
      currentChunk = '';
    }
    
    // 如果当前元素本身就大于最大块大小，且不是代码块，则需要进一步拆分
    if (element.length > maxChunkSize && !isCodeBlock) {
      // 按段落分割
      const paragraphs = element.split(/\n\n+/);
      
      for (const paragraph of paragraphs) {
        if (currentChunk.length + paragraph.length + 2 > maxChunkSize && currentChunk.length > 0) {
          chunks.push(currentChunk);
          currentChunk = '';
        }
        
        currentChunk += paragraph + '\n\n';
        
        if (currentChunk.length >= maxChunkSize) {
          chunks.push(currentChunk);
          currentChunk = '';
        }
      }
    } else {
      // 添加完整元素到当前块
      currentChunk += element;
      
      // 如果当前块已经足够大，则创建新块
      if (currentChunk.length >= maxChunkSize && !isCodeBlock) {
        chunks.push(currentChunk);
        currentChunk = '';
      }
    }
  }
  
  // 添加最后一个块（如果有）
  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }
  
  return chunks;
} 
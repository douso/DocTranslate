import mammoth from 'mammoth';
import fs from 'fs-extra';
import path from 'path';
import { TranslationOptions } from '../../types/file';
import { translateText } from '../../services/openaiService';
import logger from '../logger';

// 块大小（字符数）
const CHUNK_SIZE = 3000;

// 处理Word文件
export async function processWordFile(filePath: string, options: TranslationOptions): Promise<string> {
  try {
    // 提取文本
    const result = await mammoth.extractRawText({ path: filePath });
    const content = result.value;
    
    logger.info(`Word文件包含 ${content.length} 个字符`);
    
    // 分割文本为块
    const chunks = splitTextIntoChunks(content, CHUNK_SIZE);
    
    // 翻译每个块
    const translatedChunks = await Promise.all(
      chunks.map(async (chunk, index) => {
        logger.info(`翻译Word块: ${index + 1}/${chunks.length}`);
        return await translateText({
          text: chunk,
          targetLanguage: options.targetLanguage,
          sourceLanguage: options.sourceLanguage,
          preserveFormatting: options.preserveFormatting
        });
      })
    );
    
    // 合并翻译结果
    const translatedContent = translatedChunks.join('');
    
    // 创建临时文件存储翻译后的内容
    const tempDir = process.env.TEMP_DIR || 'temp';
    fs.ensureDirSync(tempDir);
    const tempFilePath = path.join(tempDir, `${path.basename(filePath, path.extname(filePath))}_translated.txt`);
    
    // 写入文件
    await fs.writeFile(tempFilePath, translatedContent, 'utf8');
    
    // 返回临时文件路径
    return tempFilePath;
    
    // 注意：此实现只返回翻译后的纯文本
    // 如果需要保持格式，需要更复杂的处理
    // 可能需要将翻译后的内容重新插入到Word文档中
  } catch (error) {
    logger.error({ error }, 'Word文件处理失败');
    throw new Error(`Word文件处理失败: ${(error as Error).message}`);
  }
}

// 按大小分割文本，但保持段落完整
function splitTextIntoChunks(text: string, maxChunkSize: number): string[] {
  const chunks: string[] = [];
  const paragraphs = text.split(/\r?\n\r?\n/);
  
  let currentChunk = '';
  
  for (const paragraph of paragraphs) {
    // 如果当前段落加上当前块超过最大块大小，并且当前块不为空，则创建新块
    if (currentChunk.length + paragraph.length > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk);
      currentChunk = '';
    }
    
    // 处理特别长的段落（超过最大块大小的段落需要进一步分割）
    if (paragraph.length > maxChunkSize) {
      // 如果当前块不为空，先添加到结果中
      if (currentChunk.length > 0) {
        chunks.push(currentChunk);
        currentChunk = '';
      }
      
      // 按句子分割长段落
      const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph];
      
      let sentenceChunk = '';
      for (const sentence of sentences) {
        if (sentenceChunk.length + sentence.length > maxChunkSize) {
          chunks.push(sentenceChunk);
          sentenceChunk = '';
        }
        
        sentenceChunk += sentence;
        
        if (sentenceChunk.length >= maxChunkSize) {
          chunks.push(sentenceChunk);
          sentenceChunk = '';
        }
      }
      
      if (sentenceChunk.length > 0) {
        currentChunk = sentenceChunk;
      }
    } else {
      // 添加段落到当前块
      currentChunk += paragraph + '\n\n';
      
      // 如果当前块已经接近最大大小，则创建新块
      if (currentChunk.length >= maxChunkSize) {
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
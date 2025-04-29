import fs from 'fs-extra';
import { TranslationOptions } from '../../types/file';
import { translateText } from '../../services/openaiService';
import logger from '../logger';

interface SubtitleBlock {
  index: number;
  timeCode: string;
  text: string[];
}

// 处理SRT字幕文件
export async function processSrtFile(filePath: string, options: TranslationOptions): Promise<string> {
  try {
    // 读取SRT文件
    const content = await fs.readFile(filePath, 'utf8');
    
    // 解析SRT字幕
    const subtitles = parseSrt(content);
    logger.info(`SRT文件包含 ${subtitles.length} 个字幕块`);
    
    // 按字幕块翻译
    const translatedSubtitles = await Promise.all(
      subtitles.map(async (subtitle, index) => {
        // 每10个字幕块打印一次日志，避免日志过多
        if (index % 10 === 0) {
          logger.info(`翻译字幕块: ${index + 1} 到 ${Math.min(index + 10, subtitles.length)}/${subtitles.length}`);
        }
        
        // 合并字幕文本行以便翻译
        const text = subtitle.text.join('\n');
        
        // 翻译字幕文本
        const translatedText = await translateText({
          text,
          targetLanguage: options.targetLanguage,
          sourceLanguage: options.sourceLanguage,
          preserveFormatting: true
        });
        
        // 分割翻译后的文本为行
        const translatedLines = translatedText.split('\n');
        
        // 创建翻译后的字幕块
        return {
          ...subtitle,
          text: translatedLines
        };
      })
    );
    
    // 将翻译后的字幕块转换回SRT格式
    const translatedContent = generateSrt(translatedSubtitles);
    
    return translatedContent;
  } catch (error) {
    logger.error({ error }, 'SRT文件处理失败');
    throw new Error(`SRT文件处理失败: ${(error as Error).message}`);
  }
}

// 解析SRT格式
function parseSrt(content: string): SubtitleBlock[] {
  const blocks: SubtitleBlock[] = [];
  
  // 按空行分割
  const parts = content.trim().split(/\r?\n\r?\n/);
  
  for (const part of parts) {
    const lines = part.split(/\r?\n/);
    
    // 至少需要三行（索引，时间码，文本）
    if (lines.length < 3) continue;
    
    // 第一行是索引
    const index = parseInt(lines[0]);
    
    // 第二行是时间码
    const timeCode = lines[1];
    
    // 剩余行是字幕文本
    const text = lines.slice(2);
    
    blocks.push({
      index,
      timeCode,
      text
    });
  }
  
  return blocks;
}

// 生成SRT格式
function generateSrt(subtitles: SubtitleBlock[]): string {
  return subtitles
    .map(subtitle => {
      return [
        subtitle.index,
        subtitle.timeCode,
        ...subtitle.text,
        '' // 添加空行
      ].join('\n');
    })
    .join('\n');
} 
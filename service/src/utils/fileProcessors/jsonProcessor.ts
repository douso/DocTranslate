import fs from 'fs-extra';
import { TranslationOptions } from '../../types/file';
import { translateText } from '../../services/openaiService';
import logger from '../logger';

// 处理JSON文件
export async function processJsonFile(filePath: string, options: TranslationOptions): Promise<string> {
  try {
    // 读取JSON文件
    const content = await fs.readFile(filePath, 'utf8');
    
    // 解析JSON
    const jsonData = JSON.parse(content);
    
    // 翻译JSON对象
    const translatedData = await translateJsonObject(jsonData, options);
    
    // 转换回JSON字符串，保持格式
    return JSON.stringify(translatedData, null, 2);
  } catch (error) {
    logger.error({ error }, 'JSON文件处理失败');
    throw new Error(`JSON文件处理失败: ${(error as Error).message}`);
  }
}

// 递归翻译JSON对象
async function translateJsonObject(obj: any, options: TranslationOptions, path: string = ''): Promise<any> {
  // 如果是数组，则递归翻译每个元素
  if (Array.isArray(obj)) {
    logger.info(`处理JSON数组，路径: ${path || 'root'}, 元素数: ${obj.length}`);
    
    const translatedArray = [];
    for (let i = 0; i < obj.length; i++) {
      const elementPath = path ? `${path}[${i}]` : `[${i}]`;
      translatedArray.push(await translateJsonObject(obj[i], options, elementPath));
    }
    return translatedArray;
  }
  
  // 如果是对象，则递归翻译每个属性
  if (obj !== null && typeof obj === 'object') {
    logger.info(`处理JSON对象，路径: ${path || 'root'}, 属性数: ${Object.keys(obj).length}`);
    
    const translatedObj: Record<string, any> = {};
    for (const key of Object.keys(obj)) {
      const propPath = path ? `${path}.${key}` : key;
      translatedObj[key] = await translateJsonObject(obj[key], options, propPath);
    }
    return translatedObj;
  }
  
  // 如果是字符串且不是空字符串，则翻译
  if (typeof obj === 'string' && obj.trim() !== '') {
    // 跳过可能是日期、ID、URL等的值
    if (shouldSkipTranslation(obj)) {
      return obj;
    }
    
    logger.info(`翻译JSON字符串，路径: ${path || 'root'}, 长度: ${obj.length}`);
    return await translateText({
      text: obj,
      targetLanguage: options.targetLanguage,
      sourceLanguage: options.sourceLanguage,
      preserveFormatting: false
    });
  }
  
  // 其他类型（数字、布尔值等）直接返回
  return obj;
}

// 判断字符串是否应该跳过翻译
function shouldSkipTranslation(value: string): boolean {
  // 日期格式
  const dateRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/;
  if (dateRegex.test(value)) return true;
  
  // URL格式
  const urlRegex = /^(https?:\/\/|www\.)[^\s]+$/;
  if (urlRegex.test(value)) return true;
  
  // 邮箱格式
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (emailRegex.test(value)) return true;
  
  // ID格式（纯数字或看起来像UUID的字符串）
  const idRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (/^\d+$/.test(value) || idRegex.test(value)) return true;
  
  // 代码片段（以{}、[]、<>开头结尾的可能是代码）
  const codeRegex = /^[{[<].*[}\]>]$/s;
  if (codeRegex.test(value)) return true;
  
  return false;
} 
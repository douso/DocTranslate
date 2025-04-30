import fs from 'fs-extra';
import { TranslationOptions } from '../../types/file';
import { translateText } from '../../services/openaiService';
import logger from '../logger';
import { updateTaskStatus } from '../../services/translationService';

// 处理JSON文件
export async function processJsonFile(filePath: string, options: TranslationOptions, taskId?: string): Promise<string> {
  try {
    // 如果有taskId，更新进度为5%（表示开始处理）
    if (taskId) {
      updateTaskStatus(taskId, 'processing', 5);
    }
    
    // 读取JSON文件
    const content = await fs.readFile(filePath, 'utf8');
    
    // 如果有taskId，更新进度为15%（表示文件读取完成）
    if (taskId) {
      updateTaskStatus(taskId, 'processing', 15);
    }
    
    // 解析JSON
    const jsonData = JSON.parse(content);
    
    // 如果有taskId，更新进度为20%（表示JSON解析完成）
    if (taskId) {
      updateTaskStatus(taskId, 'processing', 20);
    }
    
    // 翻译JSON对象
    const translatedData = await translateJsonObject(jsonData, options, '', taskId);
    
    // 如果有taskId，更新进度为90%（表示翻译完成）
    if (taskId) {
      updateTaskStatus(taskId, 'processing', 90);
    }
    
    // 转换回JSON字符串，保持格式
    return JSON.stringify(translatedData, null, 2);
  } catch (error) {
    logger.error({ error }, 'JSON文件处理失败');
    
    // 如果有taskId，更新任务状态为失败
    if (taskId) {
      updateTaskStatus(taskId, 'failed', 0, undefined, (error as Error).message);
    }
    
    throw new Error(`JSON文件处理失败: ${(error as Error).message}`);
  }
}

// 统计需要翻译的字符串总数
function countStringsToTranslate(obj: any): number {
  if (Array.isArray(obj)) {
    return obj.reduce((count: number, item) => count + countStringsToTranslate(item), 0);
  }
  
  if (obj !== null && typeof obj === 'object') {
    return Object.values(obj).reduce((count: number, value) => count + countStringsToTranslate(value), 0);
  }
  
  if (typeof obj === 'string' && obj.trim() !== '' && !shouldSkipTranslation(obj)) {
    return 1;
  }
  
  return 0;
}

// 递归翻译JSON对象
async function translateJsonObject(
  obj: any, 
  options: TranslationOptions, 
  path: string = '', 
  taskId?: string, 
  context: { totalStrings?: number; processedStrings?: number } = {}
): Promise<any> {
  // 第一次调用时计算总字符串数量
  if (!context.totalStrings) {
    context.totalStrings = countStringsToTranslate(obj);
    context.processedStrings = 0;
    logger.info(`JSON文件包含 ${context.totalStrings} 个需要翻译的字符串`);
  }
  
  // 如果是数组，则递归翻译每个元素
  if (Array.isArray(obj)) {
    logger.info(`处理JSON数组，路径: ${path || 'root'}, 元素数: ${obj.length}`);
    
    const translatedArray = [];
    for (let i = 0; i < obj.length; i++) {
      const elementPath = path ? `${path}[${i}]` : `[${i}]`;
      translatedArray.push(await translateJsonObject(obj[i], options, elementPath, taskId, context));
    }
    return translatedArray;
  }
  
  // 如果是对象，则递归翻译每个属性
  if (obj !== null && typeof obj === 'object') {
    logger.info(`处理JSON对象，路径: ${path || 'root'}, 属性数: ${Object.keys(obj).length}`);
    
    const translatedObj: Record<string, any> = {};
    for (const key of Object.keys(obj)) {
      const propPath = path ? `${path}.${key}` : key;
      translatedObj[key] = await translateJsonObject(obj[key], options, propPath, taskId, context);
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
    
    // 更新已处理的字符串数量
    if (context.processedStrings !== undefined && context.totalStrings !== undefined) {
      context.processedStrings++;
      
      // 更新进度（20%-90%范围）
      if (taskId && context.totalStrings > 0) {
        const progress = 20 + Math.round((context.processedStrings / context.totalStrings) * 70);
        updateTaskStatus(taskId, 'processing', progress);
      }
    }
    
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
import fs from 'fs-extra';
import xlsx from 'xlsx';
import path from 'path';
import { TranslationOptions } from '../../types/file';
import { translateText } from '../../services/openaiService';
import logger from '../logger';
import { updateTaskStatus } from '../../services/translationService';

// 块大小（每批处理的单元格数）
const BATCH_SIZE = 10; // 增大批量大小
// 每批次最大并发翻译数
const MAX_CONCURRENT_TRANSLATIONS = 5;
// 最小翻译字符阈值
const MIN_CHAR_LENGTH = 3;
// 最大翻译字符长度
const MAX_CHAR_LENGTH = 5000;

// 处理Excel文件
export async function processExcelFile(filePath: string, options: TranslationOptions, taskId?: string): Promise<string> {
  try {
    // 读取Excel文件
    const workbook = xlsx.readFile(filePath);
    
    // 获取所有工作表
    const sheetNames = workbook.SheetNames;
    logger.info(`Excel文件包含 ${sheetNames.length} 个工作表`);
    
    // 如果有taskId，则更新进度为5%（表示开始处理）
    if (taskId) {
      updateTaskStatus(taskId, 'processing', 5);
    }
    
    // 处理每个工作表
    for (let sheetIndex = 0; sheetIndex < sheetNames.length; sheetIndex++) {
      const sheetName = sheetNames[sheetIndex];
      logger.info(`处理工作表: "${sheetName}" (${sheetIndex + 1}/${sheetNames.length})`);
      
      // 将工作表转为JSON
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = xlsx.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });
      
      if (!jsonData || jsonData.length === 0) {
        logger.info(`工作表 "${sheetName}" 为空或无有效数据，跳过`);
        continue;
      }
      
      // 获取列名
      const headers = Object.keys(jsonData[0] || {});
      
      if (headers.length === 0) {
        logger.info(`工作表 "${sheetName}" 没有有效的列，跳过`);
        continue;
      }
      
      // 确定需要翻译的列（排除数字和日期列）
      const columnsToTranslate = determineColumnsToTranslate(jsonData, headers);
      
      logger.info(`在工作表 "${sheetName}" 中需要翻译的列: ${columnsToTranslate.join(', ')}`);
      
      if (columnsToTranslate.length === 0) {
        logger.info(`工作表 "${sheetName}" 没有需要翻译的列，跳过`);
        continue;
      }
      
      // 计算当前工作表的进度权重
      const progressWeight = 90 / sheetNames.length; // 总进度的90%分配给工作表处理
      const startProgress = 5 + (sheetIndex / sheetNames.length) * 90;
      
      // 批量处理翻译
      const translatedData = await processBatchTranslation(
        jsonData, 
        columnsToTranslate, 
        options, 
        taskId,
        startProgress,
        progressWeight
      );
      
      // 更新工作表
      const newWorksheet = xlsx.utils.json_to_sheet(translatedData);
      workbook.Sheets[sheetName] = newWorksheet;
      
      // 更新进度 - 当前工作表处理完成
      if (taskId) {
        const currentProgress = 5 + ((sheetIndex + 1) / sheetNames.length) * 90;
        updateTaskStatus(taskId, 'processing', Math.round(currentProgress));
      }
    }
    
    // 创建临时文件存储翻译后的Excel
    const tempDir = process.env.TEMP_DIR || 'temp';
    fs.ensureDirSync(tempDir);
    const tempFilePath = path.join(tempDir, `${path.basename(filePath, path.extname(filePath))}_translated${path.extname(filePath)}`);
    
    // 写入文件
    xlsx.writeFile(workbook, tempFilePath);
    
    // 如果有taskId，更新进度为99%（表示即将完成）
    if (taskId) {
      updateTaskStatus(taskId, 'processing', 99);
    }
    
    return tempFilePath;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error(`Excel文件处理失败: ${errorMsg}`);
    // 如果有taskId，更新任务状态为失败
    if (taskId) {
      updateTaskStatus(taskId, 'failed', 0, undefined, errorMsg);
    }
    throw new Error(`Excel文件处理失败: ${errorMsg}`);
  }
}

// 确定需要翻译的列
function determineColumnsToTranslate(jsonData: Record<string, any>[], headers: string[]): string[] {
  // 检查每列的数据特征，筛选出需要翻译的文本列
  return headers.filter(header => {
    // 样本数，取前10行或全部行数
    const sampleSize = Math.min(10, jsonData.length);
    let textCount = 0;
    let totalValidValues = 0;
    
    // 统计每列中有意义的文本数据
    for (let i = 0; i < sampleSize; i++) {
      const value = jsonData[i][header];
      if (value === undefined || value === null || value === '') continue;
      
      totalValidValues++;
      
      if (
        typeof value === 'string' && 
        !isDateString(value) && 
        !isNumericString(value) &&
        value.length >= MIN_CHAR_LENGTH
      ) {
        textCount++;
      }
    }
    
    // 如果有效值中的文本比例超过50%，则认为该列需要翻译
    return totalValidValues > 0 && (textCount / totalValidValues) > 0.5;
  });
}

// 批量处理翻译
async function processBatchTranslation(
  jsonData: Record<string, any>[], 
  columnsToTranslate: string[], 
  options: TranslationOptions,
  taskId?: string,
  startProgress: number = 0,
  progressWeight: number = 90
): Promise<Record<string, any>[]> {
  const translatedData = [...jsonData]; // 复制原始数据
  const totalRows = jsonData.length;
  
  // 按批次处理，每批BATCH_SIZE行
  for (let batchIndex = 0; batchIndex < totalRows; batchIndex += BATCH_SIZE) {
    const batchEnd = Math.min(batchIndex + BATCH_SIZE, totalRows);
    logger.info(`处理行 ${batchIndex + 1} 至 ${batchEnd} (共${totalRows}行)`);
    
    // 整理需要翻译的文本和它们的位置
    const textsToTranslate: { text: string; rowIndex: number; column: string }[] = [];
    
    for (let rowIndex = batchIndex; rowIndex < batchEnd; rowIndex++) {
      for (const column of columnsToTranslate) {
        const cellValue = jsonData[rowIndex][column];
        if (
          cellValue && 
          typeof cellValue === 'string' && 
          cellValue.trim() !== '' && 
          cellValue.length >= MIN_CHAR_LENGTH &&
          cellValue.length <= MAX_CHAR_LENGTH
        ) {
          textsToTranslate.push({
            text: cellValue,
            rowIndex,
            column
          });
        }
      }
    }
    
    // 如果批次中没有需要翻译的文本，跳过此批次
    if (textsToTranslate.length === 0) continue;
    
    // 对相似内容去重，减少API调用
    const uniqueTexts = deduplicateTexts(textsToTranslate);
    
    // 获取唯一文本及其位置映射
    const uniqueTextsMap = new Map<string, { text: string; positions: { rowIndex: number; column: string }[] }>();
    
    uniqueTexts.forEach(item => {
      const existing = uniqueTextsMap.get(item.text);
      if (existing) {
        existing.positions.push({ rowIndex: item.rowIndex, column: item.column });
      } else {
        uniqueTextsMap.set(item.text, {
          text: item.text,
          positions: [{ rowIndex: item.rowIndex, column: item.column }]
        });
      }
    });
    
    // 批量翻译唯一文本
    const uniqueTextsList = Array.from(uniqueTextsMap.values());
    logger.info(`批量翻译 ${uniqueTextsList.length} 个唯一文本`);
    
    // 更新进度 - 当前批次开始
    if (taskId) {
      const batchProgress = startProgress + progressWeight * (batchIndex / totalRows);
      updateTaskStatus(taskId, 'processing', Math.round(batchProgress));
    }
    
    // 将翻译任务分批进行并发处理
    await processWithConcurrency(
      uniqueTextsList, 
      translatedData, 
      jsonData, 
      options, 
      taskId,
      startProgress + progressWeight * (batchIndex / totalRows),
      progressWeight / Math.ceil(totalRows / BATCH_SIZE)
    );
    
    // 更新进度 - 当前批次完成
    if (taskId) {
      const batchProgress = startProgress + progressWeight * ((batchIndex + BATCH_SIZE) / totalRows);
      updateTaskStatus(taskId, 'processing', Math.min(Math.round(batchProgress), Math.round(startProgress + progressWeight)));
    }
  }
  
  return translatedData;
}

// 并发处理翻译任务
async function processWithConcurrency(
  textItems: Array<{ text: string; positions: { rowIndex: number; column: string }[] }>,
  translatedData: Record<string, any>[],
  originalData: Record<string, any>[],
  options: TranslationOptions,
  taskId?: string,
  startProgress: number = 0,
  progressWeight: number = 10
): Promise<void> {
  // 将任务分成多个批次进行处理，每个批次最多MAX_CONCURRENT_TRANSLATIONS个任务
  for (let i = 0; i < textItems.length; i += MAX_CONCURRENT_TRANSLATIONS) {
    const currentBatch = textItems.slice(i, i + MAX_CONCURRENT_TRANSLATIONS);
    
    try {
      // 记录开始时间
      const startTime = Date.now();
      logger.info(`开始并发翻译批次 ${Math.floor(i / MAX_CONCURRENT_TRANSLATIONS) + 1}，共 ${currentBatch.length} 个文本`);
      
      // 更新进度 - 当前并发批次开始
      if (taskId) {
        const batchProgress = startProgress + (i / textItems.length) * progressWeight;
        updateTaskStatus(taskId, 'processing', Math.round(batchProgress));
      }
      
      // 创建所有翻译任务的Promise
      const translationPromises = currentBatch.map(async ({ text, positions }) => {
        try {
          const translatedText = await translateText({
            text,
            targetLanguage: options.targetLanguage,
            sourceLanguage: options.sourceLanguage,
            preserveFormatting: false
          });
          
          return { text, positions, translatedText, success: true };
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          logger.error(`翻译失败: "${text.substring(0, 50)}..."，错误: ${errorMsg}`);
          return { text, positions, success: false };
        }
      });
      
      // 并发执行所有翻译任务
      const results = await Promise.all(translationPromises);
      
      // 处理翻译结果
      results.forEach(result => {
        if (result.success && 'translatedText' in result) {
          // 将翻译结果应用到所有相同内容的单元格
          result.positions.forEach(({ rowIndex, column }) => {
            translatedData[rowIndex][column] = result.translatedText;
          });
        } else {
          // 标记翻译失败
          result.positions.forEach(({ rowIndex, column }) => {
            translatedData[rowIndex][column] = `[翻译失败] ${originalData[rowIndex][column]}`;
          });
        }
      });
      
      // 记录完成时间和处理速度
      const endTime = Date.now();
      const timeSpent = (endTime - startTime) / 1000;
      logger.info(`完成批次 ${Math.floor(i / MAX_CONCURRENT_TRANSLATIONS) + 1} 的翻译，耗时 ${timeSpent.toFixed(2)} 秒，平均每个文本 ${(timeSpent / currentBatch.length).toFixed(2)} 秒`);
      
      // 更新进度 - 当前并发批次完成
      if (taskId) {
        const batchProgress = startProgress + ((i + MAX_CONCURRENT_TRANSLATIONS) / textItems.length) * progressWeight;
        updateTaskStatus(taskId, 'processing', Math.min(Math.round(batchProgress), Math.round(startProgress + progressWeight)));
      }
      
      // 控制请求频率，避免API限流
      if (i + MAX_CONCURRENT_TRANSLATIONS < textItems.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(`批次处理失败: ${errorMsg}`);
      // 即使部分失败，也继续处理下一批
    }
  }
}

// 去除相似或重复的文本，减少API调用
function deduplicateTexts(texts: { text: string; rowIndex: number; column: string }[]): typeof texts {
  const uniqueTexts = new Map<string, typeof texts[0]>();
  
  texts.forEach(item => {
    const normalizedText = normalizeText(item.text);
    if (!uniqueTexts.has(normalizedText)) {
      uniqueTexts.set(normalizedText, item);
    }
  });
  
  return Array.from(uniqueTexts.values());
}

// 标准化文本用于比较（去除多余空格等）
function normalizeText(text: string): string {
  return text.trim().replace(/\s+/g, ' ').toLowerCase();
}

// 判断字符串是否是日期格式
function isDateString(value: string): boolean {
  // 检查常见的日期格式
  const datePatterns = [
    /^\d{4}-\d{2}-\d{2}$/, // yyyy-mm-dd
    /^\d{2}-\d{2}-\d{4}$/, // dd-mm-yyyy or mm-dd-yyyy
    /^\d{2}\/\d{2}\/\d{4}$/, // mm/dd/yyyy or dd/mm/yyyy
    /^\d{4}\/\d{2}\/\d{2}$/, // yyyy/mm/dd
    /^\d{2}\.\d{2}\.\d{4}$/ // dd.mm.yyyy
  ];
  
  return datePatterns.some(pattern => pattern.test(value));
}

// 判断字符串是否是数字格式
function isNumericString(value: string): boolean {
  return /^-?\d+(\.\d+)?$/.test(value) || // 整数或小数
         /^-?\d{1,3}(,\d{3})*(\.\d+)?$/.test(value); // 带千位分隔符的数字
} 
import fs from 'fs-extra';
import papa from 'papaparse';
import { TranslationOptions } from '../../types/file';
import { translateText } from '../../services/openaiService';
import logger from '../logger';
import { updateTaskStatus } from '../../services/translationService';

// 处理CSV文件
export async function processCsvFile(filePath: string, options: TranslationOptions, taskId?: string): Promise<string> {
  try {
    // 如果有taskId，更新进度为5%（表示开始处理）
    if (taskId) {
      updateTaskStatus(taskId, 'processing', 5);
    }
    
    // 读取文件
    const content = await fs.readFile(filePath, 'utf8');
    
    // 如果有taskId，更新进度为10%（表示文件读取完成）
    if (taskId) {
      updateTaskStatus(taskId, 'processing', 10);
    }
    
    // 解析CSV
    const parsed = papa.parse(content, { header: true });
    const rows = parsed.data as Record<string, string>[];
    const headers = parsed.meta.fields || [];
    
    // 如果有taskId，更新进度为15%（表示CSV解析完成）
    if (taskId) {
      updateTaskStatus(taskId, 'processing', 15);
    }
    
    logger.info(`正在处理CSV文件，共 ${rows.length} 行, ${headers.length} 列`);
    
    // 需要翻译的列（排除数字和日期列）
    const columnsToTranslate = headers.filter(header => {
      // 检查第一行数据，判断列是否需要翻译
      if (rows.length > 0) {
        const firstRowValue = rows[0][header];
        // 如果为空或者是数字或特殊格式，则不翻译
        if (!firstRowValue || !isNaN(Number(firstRowValue)) || isDate(firstRowValue)) {
          return false;
        }
        return true;
      }
      return false;
    });
    
    // 如果有taskId，更新进度为20%（表示列分析完成）
    if (taskId) {
      updateTaskStatus(taskId, 'processing', 20);
    }
    
    logger.info(`需要翻译的列: ${columnsToTranslate.join(', ')}`);
    
    // 翻译每个单元格
    const translatedRows = [];
    for (let i = 0; i < rows.length; i++) {
      logger.info(`翻译第 ${i + 1}/${rows.length} 行`);
      
      // 计算当前进度（20%-95%之间）
      if (taskId) {
        const progress = 20 + Math.round((i / rows.length) * 75);
        updateTaskStatus(taskId, 'processing', progress);
      }
      
      const row = rows[i];
      const translatedRow: Record<string, string> = {};
      
      // 处理每一列
      for (const header of headers) {
        // 如果此列需要翻译
        if (columnsToTranslate.includes(header)) {
          const cellContent = row[header];
          
          if (cellContent && cellContent.trim() !== '') {
            translatedRow[header] = await translateText({
              text: cellContent,
              targetLanguage: options.targetLanguage,
              sourceLanguage: options.sourceLanguage,
              preserveFormatting: false
            });
          } else {
            translatedRow[header] = cellContent; // 保留空值
          }
        } else {
          // 不需要翻译的列直接保留原值
          translatedRow[header] = row[header];
        }
      }
      
      translatedRows.push(translatedRow);
    }
    
    // 如果有taskId，更新进度为95%（表示翻译完成，准备生成CSV）
    if (taskId) {
      updateTaskStatus(taskId, 'processing', 95);
    }
    
    // 将数据转回CSV格式
    const translatedCsv = papa.unparse(translatedRows, { header: true });
    
    return translatedCsv;
  } catch (error) {
    logger.error({ error }, 'CSV文件处理失败');
    
    // 如果有taskId，更新任务状态为失败
    if (taskId) {
      updateTaskStatus(taskId, 'failed', 0, undefined, (error as Error).message);
    }
    
    throw new Error(`CSV文件处理失败: ${(error as Error).message}`);
  }
}

// 判断字符串是否是日期格式
function isDate(value: string): boolean {
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
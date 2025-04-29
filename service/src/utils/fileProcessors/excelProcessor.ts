import fs from 'fs-extra';
import xlsx from 'xlsx';
import path from 'path';
import { TranslationOptions } from '../../types/file';
import { translateText } from '../../services/openaiService';
import logger from '../logger';

// 处理Excel文件
export async function processExcelFile(filePath: string, options: TranslationOptions): Promise<string> {
  try {
    // 读取Excel文件
    const workbook = xlsx.readFile(filePath);
    
    // 获取所有工作表
    const sheetNames = workbook.SheetNames;
    logger.info(`Excel文件包含 ${sheetNames.length} 个工作表`);
    
    // 处理每个工作表
    for (const sheetName of sheetNames) {
      logger.info(`处理工作表: "${sheetName}"`);
      
      // 将工作表转为JSON
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = xlsx.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });
      
      if (jsonData.length === 0) {
        logger.info(`工作表 "${sheetName}" 为空，跳过`);
        continue;
      }
      
      // 获取列名
      const headers = Object.keys(jsonData[0]);
      
      if (headers.length === 0) {
        logger.info(`工作表 "${sheetName}" 没有有效的列，跳过`);
        continue;
      }
      
      // 确定需要翻译的列（排除数字和日期列）
      const columnsToTranslate = headers.filter(header => {
        // 检查是否有有效的行数据
        if (jsonData.length === 0) return false;
        
        // 检查第一行数据，判断列是否需要翻译
        const firstRowValue = jsonData[0][header];
        // 如果为空、是数字或日期，则不翻译
        if (
          firstRowValue === undefined || 
          firstRowValue === null || 
          firstRowValue === '' ||
          typeof firstRowValue === 'number' || 
          firstRowValue instanceof Date ||
          (typeof firstRowValue === 'string' && isDateString(firstRowValue))
        ) {
          return false;
        }
        return typeof firstRowValue === 'string';
      });
      
      logger.info(`在工作表 "${sheetName}" 中需要翻译的列: ${columnsToTranslate.join(', ')}`);
      
      if (columnsToTranslate.length === 0) {
        logger.info(`工作表 "${sheetName}" 没有需要翻译的列，跳过`);
        continue;
      }
      
      // 翻译每个单元格
      const translatedData = await Promise.all(
        jsonData.map(async (row, index) => {
          logger.info(`翻译工作表 "${sheetName}" 第 ${index + 1}/${jsonData.length} 行`);
          const translatedRow: Record<string, any> = { ...row };
          
          // 处理每个需要翻译的列
          for (const column of columnsToTranslate) {
            const cellValue = row[column];
            
            if (cellValue && typeof cellValue === 'string' && cellValue.trim() !== '') {
              try {
                translatedRow[column] = await translateText({
                  text: cellValue,
                  targetLanguage: options.targetLanguage,
                  sourceLanguage: options.sourceLanguage,
                  preserveFormatting: false
                });
              } catch (error) {
                const errorMsg = error instanceof Error ? error.message : String(error);
                logger.error(`翻译单元格值失败: ${cellValue}, 错误: ${errorMsg}`);
                translatedRow[column] = `[翻译失败] ${cellValue}`;
              }
            }
          }
          
          return translatedRow;
        })
      );
      
      // 更新工作表
      const newWorksheet = xlsx.utils.json_to_sheet(translatedData);
      workbook.Sheets[sheetName] = newWorksheet;
    }
    
    // 创建临时文件存储翻译后的Excel
    const tempDir = process.env.TEMP_DIR || 'temp';
    fs.ensureDirSync(tempDir);
    const tempFilePath = path.join(tempDir, `${path.basename(filePath, path.extname(filePath))}_translated${path.extname(filePath)}`);
    
    // 写入文件
    xlsx.writeFile(workbook, tempFilePath);
    
    return tempFilePath;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error(`Excel文件处理失败: ${errorMsg}`);
    throw new Error(`Excel文件处理失败: ${errorMsg}`);
  }
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
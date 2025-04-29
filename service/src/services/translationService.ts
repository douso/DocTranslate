import fs from 'fs-extra';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger';
import { translateText } from './openaiService';
import { FileInfo, FileType, TranslationTask, TranslationOptions, TranslationResult } from '../types/file';
import { parseFileType } from '../middlewares/uploadMiddleware';
import { processTxtFile } from '../utils/fileProcessors/txtProcessor';
import { processMarkdownFile } from '../utils/fileProcessors/markdownProcessor';
import { processWordFile } from '../utils/fileProcessors/wordProcessor';
import { processCsvFile } from '../utils/fileProcessors/csvProcessor';
import { processExcelFile } from '../utils/fileProcessors/excelProcessor';
import { processPdfFile } from '../utils/fileProcessors/pdfProcessor';
import { processSrtFile } from '../utils/fileProcessors/srtProcessor';
import { processJsonFile } from '../utils/fileProcessors/jsonProcessor';

// 存储任务队列
const tasks: Record<string, TranslationTask> = {};

// 获取输出目录
const outputDir = process.env.OUTPUT_DIR || 'outputs';
fs.ensureDirSync(path.resolve(process.cwd(), outputDir));

// 获取临时目录
const tempDir = process.env.TEMP_DIR || 'temp';
fs.ensureDirSync(path.resolve(process.cwd(), tempDir));

// 翻译并发限制
const MAX_CONCURRENT_TASKS = parseInt(process.env.MAX_CONCURRENT_TASKS || '3');
const MAX_RETRY_COUNT = parseInt(process.env.MAX_RETRY_COUNT || '3');

// 当前正在处理的任务数
let currentRunningTasks = 0;

// 任务处理函数映射
const fileProcessors: Record<FileType, (filePath: string, options: TranslationOptions) => Promise<string>> = {
  [FileType.TXT]: processTxtFile,
  [FileType.MARKDOWN]: processMarkdownFile,
  [FileType.WORD]: processWordFile,
  [FileType.CSV]: processCsvFile,
  [FileType.EXCEL]: processExcelFile,
  [FileType.PDF]: processPdfFile,
  [FileType.SRT]: processSrtFile,
  [FileType.JSON]: processJsonFile
};

// 创建翻译任务
export function createTranslationTask(fileInfo: FileInfo, options: TranslationOptions): string {
  const taskId = uuidv4();
  const task: TranslationTask = {
    id: taskId,
    fileInfo,
    status: 'pending',
    progress: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    retryCount: 0
  };

  tasks[taskId] = task;
  processQueue();
  return taskId;
}

// 获取任务状态
export function getTaskStatus(taskId: string): TranslationTask | null {
  return tasks[taskId] || null;
}

// 获取所有任务
export function getAllTasks(): TranslationTask[] {
  return Object.values(tasks);
}

// 处理任务队列
function processQueue(): void {
  // 找出待处理的任务
  const pendingTasks = Object.values(tasks)
    .filter(task => task.status === 'pending')
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  // 检查是否有可以处理的任务
  if (pendingTasks.length > 0 && currentRunningTasks < MAX_CONCURRENT_TASKS) {
    const task = pendingTasks[0];
    startTranslation(task.id);
  }
}

// 开始翻译任务
async function startTranslation(taskId: string): Promise<void> {
  const task = tasks[taskId];
  if (!task || task.status !== 'pending') {
    return;
  }

  try {
    // 更新任务状态
    task.status = 'processing';
    task.updatedAt = new Date();
    currentRunningTasks++;

    // 根据文件类型选择处理器
    const processor = fileProcessors[task.fileInfo.type];
    if (!processor) {
      throw new Error(`不支持的文件类型: ${task.fileInfo.type}`);
    }

    logger.info(`开始处理文件: ${task.fileInfo.originalname}, 类型: ${task.fileInfo.type}`);

    // 处理文件
    const result = await processor(task.fileInfo.path, {
      targetLanguage: task.fileInfo.options?.targetLanguage || 'Chinese',
      sourceLanguage: task.fileInfo.options?.sourceLanguage,
      preserveFormatting: task.fileInfo.options?.preserveFormatting !== false
    });

    // 处理特殊文件类型的输出结果
    let outputPath = '';
    if (task.fileInfo.type === FileType.EXCEL || task.fileInfo.type === FileType.WORD || task.fileInfo.type === FileType.PDF) {
      // 这些二进制文件类型，处理器会直接返回生成的文件路径
      outputPath = result;
      
      // 将临时文件复制到输出目录
      const outputFilename = `${path.parse(task.fileInfo.originalname).name}_translated${path.extname(task.fileInfo.originalname)}`;
      const finalOutputPath = path.join(outputDir, outputFilename);
      await fs.copy(result, finalOutputPath);
      
      // 更新输出路径为最终路径
      outputPath = finalOutputPath;
    } else {
      // 文本类型文件，创建输出文件
      const outputFilename = `${path.parse(task.fileInfo.originalname).name}_translated${path.extname(task.fileInfo.originalname)}`;
      outputPath = path.join(outputDir, outputFilename);
      await fs.writeFile(outputPath, result, 'utf8');
    }

    // 更新任务状态
    task.outputPath = path.relative(process.cwd(), outputPath);
    task.progress = 100;
    task.status = 'completed';
    task.updatedAt = new Date();
    
    logger.info(`文件处理完成: ${task.fileInfo.originalname}, 输出路径: ${task.outputPath}`);

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error({ taskId, fileName: task.fileInfo.originalname }, `翻译任务失败: ${errorMsg}`);
    
    // 检查是否需要重试
    if (task.retryCount < MAX_RETRY_COUNT) {
      task.retryCount++;
      task.status = 'pending';
      task.updatedAt = new Date();
      logger.info({ taskId, retryCount: task.retryCount, fileName: task.fileInfo.originalname }, 
        `任务失败，将进行重试 (${task.retryCount}/${MAX_RETRY_COUNT})`);
    } else {
      task.status = 'failed';
      task.error = errorMsg;
      task.updatedAt = new Date();
    }
  } finally {
    currentRunningTasks--;
    // 处理下一个任务
    processQueue();
  }
}

// 删除任务
export function deleteTask(taskId: string): boolean {
  if (!tasks[taskId]) {
    return false;
  }

  // 删除输出文件
  if (tasks[taskId].outputPath && fs.existsSync(tasks[taskId].outputPath)) {
    try {
      fs.removeSync(tasks[taskId].outputPath);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error({ taskId }, `删除任务输出文件失败: ${errorMsg}`);
    }
  }

  delete tasks[taskId];
  return true;
} 
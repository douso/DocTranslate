import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs-extra';
import asyncHandler from 'express-async-handler';
import { FileInfo, TranslationOptions } from '../types/file';
import { createTranslationTask, getAllTasks } from '../services/translationService';
import { parseFileType } from '../middlewares/uploadMiddleware';
import { AppError } from '../middlewares/errorMiddleware';
import logger from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import { saveBatchTask } from '../services/batchService';
import archiver from 'archiver';
import { getTask } from '../models/translationTask';

// 批量创建翻译任务
export const createBatchTranslation = asyncHandler(async (req: Request, res: Response) => {
  if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
    throw new Error('请上传至少一个文件');
  }

  // 翻译选项
  const options: TranslationOptions = {
    targetLanguage: req.body.targetLanguage || 'Chinese',
    sourceLanguage: req.body.sourceLanguage,
    preserveFormatting: req.body.preserveFormatting !== 'false',
  };

  // 获取请求中的浏览器指纹
  const fingerprint = req.headers['x-browser-fingerprint'] as string || 'unknown';

  const files = req.files;
  const batchId = uuidv4();
  const taskIds: string[] = [];

  // 为每个文件创建翻译任务
  for (const file of files) {
    const ext = path.extname(file.originalname).toLowerCase().substring(1);
    
    const fileInfo: FileInfo = {
      originalname: file.originalname,
      filename: file.filename,
      path: file.path,
      size: file.size,
      mimetype: file.mimetype,
      extension: ext,
      type: parseFileType(file.originalname),
      options: options  // 添加翻译选项
    };
    
    const taskId = createTranslationTask(fileInfo, fingerprint);
    taskIds.push(taskId);
  }

  // 保存批量任务信息
  saveBatchTask(batchId, taskIds);

  res.status(201).json({
    message: '批量翻译任务创建成功',
    batchId,
    taskIds,
    status: 'pending'
  });
});

// 获取批量翻译进度
export const getBatchProgress = asyncHandler(async (req: Request, res: Response) => {
  const { taskIds } = req.body;
  
  if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
    throw new AppError('请提供有效的任务ID列表', 400);
  }
  
  // 获取所有任务
  const allTasks = getAllTasks();
  
  // 筛选出请求的任务
  const requestedTasks = allTasks.filter(task => taskIds.includes(task.id));
  
  // 计算总体进度
  const totalTasks = requestedTasks.length;
  const completedTasks = requestedTasks.filter(task => task.status === 'completed').length;
  const failedTasks = requestedTasks.filter(task => task.status === 'failed').length;
  const processingTasks = requestedTasks.filter(task => task.status === 'processing').length;
  const pendingTasks = requestedTasks.filter(task => task.status === 'pending').length;
  
  // 计算总体进度百分比
  const overallProgress = totalTasks > 0 
    ? Math.round((completedTasks / totalTasks) * 100) 
    : 0;
  
  res.json({
    totalTasks,
    completedTasks,
    failedTasks,
    processingTasks,
    pendingTasks,
    overallProgress,
    tasks: requestedTasks
  });
});

/**
 * 处理批量下载请求
 * 将多个翻译结果打包为zip文件
 * 文件名使用原始文件名，重名时添加序号
 */
export const downloadBatchResults = asyncHandler(async (req: Request, res: Response) => {
  const { taskIds } = req.body;
  
  if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
    throw new AppError('无效的任务ID列表', 400);
  }
  
  // 获取指纹ID，用于安全验证
  const fingerprint = req.headers['x-browser-fingerprint'] as string || 'unknown';
  
  // 创建临时目录用于存放重命名后的文件
  const tempDir = path.join(process.cwd(), 'temp', 'batch-downloads', Date.now().toString());
  fs.ensureDirSync(tempDir);
  
  // 创建zip文件
  const zipPath = path.join(tempDir, 'translations.zip');
  const output = fs.createWriteStream(zipPath);
  const archive = archiver('zip', {
    zlib: { level: 9 } // 设置压缩级别
  });
  
  // 监听输出流关闭事件
  output.on('close', () => {
    logger.info(`批量下载完成，共 ${archive.pointer()} 字节`);
    
    // 发送zip文件
    res.download(zipPath, 'translations.zip', (err) => {
      if (err) {
        logger.error('发送zip文件时出错:', err);
      }
      
      // 删除临时文件
      setTimeout(() => {
        fs.remove(tempDir).catch(err => {
          logger.error('删除临时目录失败:', err);
        });
      }, 1000);
    });
  });
  
  // 处理错误
  archive.on('error', (err) => {
    throw new AppError(`创建归档时出错: ${err.message}`, 500);
  });
  
  // 将输出流接入归档
  archive.pipe(output);
  
  // 用于跟踪文件名，防止重复
  const usedFileNames = new Map<string, number>();
  
  // 遍历任务ID
  for (const taskId of taskIds) {
    const task = getTask(taskId);
    
    // 跳过不存在的任务
    if (!task) {
      logger.warn(`任务 ${taskId} 不存在，跳过`);
      continue;
    }
    
    // 跳过未完成的任务
    if (task.status !== 'completed' || !task.outputPath) {
      logger.warn(`任务 ${taskId} 未完成或没有输出路径，跳过`);
      continue;
    }
    
    // 验证指纹是否匹配，防止访问他人任务
    if (!task.fingerprint || task.fingerprint !== fingerprint) {
      logger.warn(`任务 ${taskId} 的指纹不匹配，跳过`);
      continue;
    }
    
    // 获取原始文件名
    const originalFileName = `${path.parse(task.fileInfo.originalname).name}${path.extname(task.outputPath)}`;
    let fileName = originalFileName;
    
    // 检查文件名是否重复，如果重复则添加序号
    if (usedFileNames.has(originalFileName)) {
      const count = usedFileNames.get(originalFileName)! + 1;
      usedFileNames.set(originalFileName, count);
      
      // 在文件名和扩展名之间添加序号
      const ext = path.extname(originalFileName);
      const baseName = path.basename(originalFileName, ext);
      fileName = `${baseName}_${count}${ext}`;
    } else {
      usedFileNames.set(originalFileName, 1);
    }
    
    // 获取翻译结果文件路径
    const outputPath = path.resolve(process.cwd(), task.outputPath);
    
    // 检查文件是否存在
    if (!fs.existsSync(outputPath)) {
      logger.warn(`任务 ${taskId} 的输出文件不存在: ${outputPath}`);
      continue;
    }
    
    // 将文件添加到归档
    archive.file(outputPath, { name: fileName });
    logger.info(`已添加文件: ${fileName}`);
  }
  
  // 完成归档
  archive.finalize();
}); 
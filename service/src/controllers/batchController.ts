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
    
    const taskId = createTranslationTask(fileInfo, options);
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

// 下载批量翻译结果（打包为zip文件）
export const downloadBatchResults = asyncHandler(async (req: Request, res: Response) => {
  const { taskIds } = req.body;
  
  if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
    throw new AppError('请提供有效的任务ID列表', 400);
  }
  
  // 获取所有任务
  const allTasks = getAllTasks();
  
  // 筛选出已完成的任务
  const completedTasks = allTasks.filter(
    task => taskIds.includes(task.id) && task.status === 'completed' && task.outputPath
  );
  
  if (completedTasks.length === 0) {
    throw new AppError('没有找到已完成的翻译任务或文件不存在', 404);
  }
  
  // 如果只有一个文件，直接返回
  if (completedTasks.length === 1 && completedTasks[0].outputPath) {
    const task = completedTasks[0];
    const outputPath = task.outputPath;
    
    if (!outputPath || !fs.existsSync(outputPath)) {
      throw new AppError('翻译结果文件不存在', 404);
    }
    
    res.download(outputPath, path.basename(outputPath));
    return;
  }
  
  // 多个文件，应该打包成zip，但这里需要额外的库
  // 在实际项目中，可以使用 'archiver' 库创建zip文件
  // 以下是伪代码示例：
  /*
  const archiver = require('archiver');
  const archive = archiver('zip', { zlib: { level: 9 } });
  
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', 'attachment; filename=translations.zip');
  
  archive.pipe(res);
  
  for (const task of completedTasks) {
    if (task.outputPath && fs.existsSync(task.outputPath)) {
      archive.file(task.outputPath, { name: path.basename(task.outputPath) });
    }
  }
  
  archive.finalize();
  */
  
  // 由于缺少必要的库，暂时返回文件路径列表
  res.json({
    message: '请安装 archiver 库以支持打包下载',
    files: completedTasks.map(task => ({
      taskId: task.id,
      filename: task.fileInfo.originalname,
      outputPath: task.outputPath
    }))
  });
}); 
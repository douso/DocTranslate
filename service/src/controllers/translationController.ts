import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs-extra';
import asyncHandler from 'express-async-handler';
import { FileInfo, FileType, TranslationOptions } from '../types/file';
import { createTranslationTask, getTaskStatus, getAllTasks, deleteTask } from '../services/translationService';
import { parseFileType } from '../middlewares/uploadMiddleware';
import logger from '../utils/logger';
import { AppError } from '../middlewares/errorMiddleware';

// 创建翻译任务
export const createTranslation = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) {
    throw new Error('请上传文件');
  }

  const file = req.file;
  const ext = path.extname(file.originalname).toLowerCase().substring(1);
  
  // 翻译选项
  const options: TranslationOptions = {
    targetLanguage: req.body.targetLanguage || 'Chinese',
    sourceLanguage: req.body.sourceLanguage,
    preserveFormatting: req.body.preserveFormatting !== 'false',
  };
  
  // 创建文件信息
  const fileInfo: FileInfo = {
    originalname: file.originalname,
    filename: file.filename,
    path: file.path,
    size: file.size,
    mimetype: file.mimetype,
    extension: ext,
    type: parseFileType(file.originalname),
    options: options
  };
  
  // 创建翻译任务
  const taskId = createTranslationTask(fileInfo, options);
  
  res.status(201).json({
    message: '翻译任务创建成功',
    taskId,
    status: 'pending'
  });
});

// 获取任务状态
export const getTranslationStatus = asyncHandler(async (req: Request, res: Response) => {
  const { taskId } = req.params;
  
  const task = getTaskStatus(taskId);
  
  if (!task) {
    res.status(404).json({ message: '未找到任务' });
    return;
  }
  
  res.json({
    task
  });
});

// 获取所有任务
export const getAllTranslations = asyncHandler(async (req: Request, res: Response) => {
  const tasks = getAllTasks();
  
  res.json({
    tasks
  });
});

// 删除任务
export const deleteTranslation = asyncHandler(async (req: Request, res: Response) => {
  const { taskId } = req.params;
  
  const result = deleteTask(taskId);
  
  if (!result) {
    res.status(404).json({ message: '未找到任务' });
    return;
  }
  
  res.json({
    message: '任务已删除'
  });
});

// 下载翻译结果
export const downloadTranslation = asyncHandler(async (req: Request, res: Response) => {
  const { taskId } = req.params;
  
  const task = getTaskStatus(taskId);
  
  if (!task) {
    throw new AppError('未找到任务', 404);
  }
  
  if (task.status !== 'completed') {
    throw new AppError('任务尚未完成', 400);
  }
  
  if (!task.outputPath) {
    throw new AppError('无可下载的翻译结果', 404);
  }
  
  const outputPath = path.resolve(process.cwd(), task.outputPath);
  
  if (!fs.existsSync(outputPath)) {
    throw new AppError('翻译结果文件不存在', 404);
  }
  
  res.download(outputPath, path.basename(outputPath));
}); 
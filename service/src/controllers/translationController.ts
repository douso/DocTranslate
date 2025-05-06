import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs-extra';
import asyncHandler from 'express-async-handler';
import { FileInfo, FileType, TranslationOptions } from '../types/file';
import { createTranslationTask, getTaskStatus, deleteTask, getAllTasks, retryTranslationTask } from '../services/translationService';
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
  
  // 获取请求中的浏览器指纹
  const fingerprint = req.headers['x-browser-fingerprint'] as string || 'unknown';
  
  // 创建翻译任务
  const taskId = createTranslationTask(fileInfo, fingerprint);
  
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

// 获取所有翻译任务
export const getUserTasks = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 获取请求中的浏览器指纹
    const fingerprint = req.headers['x-browser-fingerprint'] as string || 'unknown';
    
    // 查询与该指纹关联的任务
    const allTasks = getAllTasks();
    const tasks = allTasks.filter(task => {
      // 由于历史数据可能没有指纹字段，这里做兼容处理
      if (!('fingerprint' in task)) {
        return false; // 默认不显示没有指纹字段的任务
      }
      return task.fingerprint === fingerprint;
    });
    
    res.json({ tasks });
  } catch (error) {
    next(error);
  }
};

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
  
  res.download(outputPath, `${path.parse(task.fileInfo.originalname).name}${path.extname(task.outputPath)}`);
});

// 重新翻译任务
export const retryTranslation = asyncHandler(async (req: Request, res: Response) => {
  const { taskId } = req.params;
  
  // 获取指纹ID，用于安全验证
  const fingerprint = req.headers['x-browser-fingerprint'] as string || 'unknown';
  
  // 获取任务
  const task = getTaskStatus(taskId);
  
  if (!task) {
    throw new AppError('未找到任务', 404);
  }
  
  // 验证指纹是否匹配
  if (task.fingerprint && task.fingerprint !== 'unknown' && task.fingerprint !== fingerprint) {
    throw new AppError('无权访问此任务', 403);
  }
  
  // 确认任务状态允许重新翻译
  if (task.status !== 'completed' && task.status !== 'failed') {
    throw new AppError(`任务状态为 ${task.status}，不能重新翻译`, 400);
  }
  
  const success = await retryTranslationTask(taskId);
  
  if (!success) {
    throw new AppError('重新翻译任务失败', 500);
  }
  
  res.json({
    message: '任务已加入重新翻译队列',
    taskId,
    status: 'pending'
  });
}); 
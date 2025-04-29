import { Request, Response } from 'express';
import os from 'os';
import fs from 'fs-extra';
import path from 'path';
import asyncHandler from 'express-async-handler';
import { getAllTasks } from '../services/translationService';
import logger from '../utils/logger';

// 获取系统状态
export const getSystemStatus = asyncHandler(async (req: Request, res: Response) => {
  // 获取CPU使用情况
  const cpus = os.cpus();
  const cpuCount = cpus.length;
  const cpuModel = cpus[0].model;
  const loadAvg = os.loadavg();
  
  // 获取内存使用情况
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  const memoryUsage = Math.round((usedMemory / totalMemory) * 100);
  
  // 获取目录大小信息
  const uploadDir = process.env.UPLOAD_DIR || 'uploads';
  const tempDir = process.env.TEMP_DIR || 'temp';
  const outputDir = process.env.OUTPUT_DIR || 'outputs';
  
  const uploadSize = await getDirSize(path.resolve(process.cwd(), uploadDir));
  const tempSize = await getDirSize(path.resolve(process.cwd(), tempDir));
  const outputSize = await getDirSize(path.resolve(process.cwd(), outputDir));
  
  // 获取任务统计
  const tasks = getAllTasks();
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(task => task.status === 'completed').length;
  const failedTasks = tasks.filter(task => task.status === 'failed').length;
  const processingTasks = tasks.filter(task => task.status === 'processing').length;
  const pendingTasks = tasks.filter(task => task.status === 'pending').length;
  
  // OpenAI API状态
  const openaiApiKey = process.env.OPENAI_API_KEY 
    ? '已配置' 
    : '未配置';
  const openaiModel = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
  
  res.json({
    system: {
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      uptime: Math.floor(os.uptime() / 60), // 分钟
      cpuCount,
      cpuModel,
      loadAvg: loadAvg.map(load => load.toFixed(2)),
      totalMemory: formatBytes(totalMemory),
      freeMemory: formatBytes(freeMemory),
      usedMemory: formatBytes(usedMemory),
      memoryUsage: `${memoryUsage}%`
    },
    storage: {
      uploadDir,
      uploadSize: formatBytes(uploadSize),
      tempDir,
      tempSize: formatBytes(tempSize),
      outputDir,
      outputSize: formatBytes(outputSize),
      totalSize: formatBytes(uploadSize + tempSize + outputSize)
    },
    tasks: {
      totalTasks,
      completedTasks,
      failedTasks,
      processingTasks,
      pendingTasks
    },
    config: {
      openaiApiKey,
      openaiModel,
      maxConcurrentTasks: process.env.MAX_CONCURRENT_TASKS || '3',
      maxRetryCount: process.env.MAX_RETRY_COUNT || '3'
    }
  });
});

// 清理临时文件
export const cleanupTempFiles = asyncHandler(async (req: Request, res: Response) => {
  const tempDir = process.env.TEMP_DIR || 'temp';
  const tempPath = path.resolve(process.cwd(), tempDir);
  
  if (fs.existsSync(tempPath)) {
    const files = await fs.readdir(tempPath);
    
    for (const file of files) {
      await fs.remove(path.join(tempPath, file));
    }
    
    logger.info(`已清理临时目录: ${tempPath}`);
  }
  
  res.json({
    success: true,
    message: `已清理临时目录: ${tempPath}`
  });
});

// 获取目录大小
async function getDirSize(dir: string): Promise<number> {
  if (!fs.existsSync(dir)) {
    return 0;
  }
  
  let size = 0;
  const files = await fs.readdir(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stats = await fs.stat(filePath);
    
    if (stats.isDirectory()) {
      size += await getDirSize(filePath);
    } else {
      size += stats.size;
    }
  }
  
  return size;
}

// 格式化字节数
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
} 
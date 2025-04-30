import fs from 'fs-extra';
import path from 'path';
import cron from 'node-cron';
import logger from './logger';
import { getAllTasks } from '../models/translationTask';
import { deleteTask } from '../services/translationService';
import { TASK_CONFIG } from '../config/env'

// 临时文件目录
const TEMP_DIR = path.join(process.cwd(), 'temp');

/**
 * 清理临时目录
 */
const cleanTempDirectory = async (): Promise<void> => {
  try {
    if (fs.existsSync(TEMP_DIR)) {
      logger.info('开始清理临时目录...');
      await fs.emptyDir(TEMP_DIR);
      logger.info('临时目录清理完成');
    }
  } catch (error) {
    logger.error('清理临时目录时出错:', error);
  }
};

/**
 * 清理过期任务
 */
const cleanExpiredTasks = async (): Promise<void> => {
  try {
    logger.info('开始清理过期任务...');
    
    const tasks = getAllTasks();
    const now = new Date().getTime();
    let removedCount = 0;
    
    for (const task of tasks) {
      const createdTime = new Date(task.createdAt).getTime();
      const age = now - createdTime;
      
      // 如果任务超过过期时间，删除它
      if (age > TASK_CONFIG.taskExpiryTime) {
        logger.info(`删除过期任务 ${task.id} (${task.fileInfo.originalname})`);
        deleteTask(task.id);
        removedCount++;
      }
    }
    
    logger.info(`共清理 ${removedCount} 个过期任务`);
  } catch (error) {
    logger.error('清理过期任务时出错:', error);
  }
};

/**
 * 启动定时清理任务
 * 默认在每天凌晨0点执行
 */
export const startCleanupSchedule = (): void => {
  const cronSchedule = process.env.CLEANUP_CRON || '0 0 * * *'; // 默认每天0点
  
  logger.info(`设置定时清理任务，计划: ${cronSchedule}`);
  
  cron.schedule(cronSchedule, async () => {
    logger.info('执行定时清理任务...');
    
    try {
      // 清理过期任务
      await cleanExpiredTasks();
      
      // 清理临时目录
      await cleanTempDirectory();
      
      logger.info('定时清理任务完成');
    } catch (error) {
      logger.error('执行定时清理任务时出错:', error);
    }
  });
  
  logger.info('定时清理任务已启动');
};

/**
 * 手动触发清理（用于测试或API调用）
 */
export const triggerManualCleanup = async (): Promise<void> => {
  logger.info('手动触发清理任务...');
  
  try {
    // 清理过期任务
    await cleanExpiredTasks();
    
    // 清理临时目录
    await cleanTempDirectory();
    
    logger.info('手动清理任务完成');
  } catch (error) {
    logger.error('执行手动清理任务时出错:', error);
    throw error;
  }
}; 
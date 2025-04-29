import fs from 'fs-extra';
import path from 'path';
import logger from '../utils/logger';

// 存储批量任务信息的结构
interface BatchTask {
  batchId: string;
  taskIds: string[];
  createdAt: Date;
}

// 内存中存储批量任务
const batchTasks: Record<string, BatchTask> = {};

/**
 * 保存批量任务信息
 * @param batchId 批量任务ID
 * @param taskIds 包含的任务ID列表
 * @returns 批量任务对象
 */
export function saveBatchTask(batchId: string, taskIds: string[]): BatchTask {
  const batchTask: BatchTask = {
    batchId,
    taskIds,
    createdAt: new Date()
  };
  
  batchTasks[batchId] = batchTask;
  logger.info({ batchId, taskCount: taskIds.length }, '创建批量任务');
  
  return batchTask;
}

/**
 * 获取批量任务信息
 * @param batchId 批量任务ID
 * @returns 批量任务对象，如果不存在则返回null
 */
export function getBatchTask(batchId: string): BatchTask | null {
  return batchTasks[batchId] || null;
}

/**
 * 获取所有批量任务
 * @returns 批量任务列表
 */
export function getAllBatchTasks(): BatchTask[] {
  return Object.values(batchTasks);
}

/**
 * 删除批量任务
 * @param batchId 批量任务ID
 * @returns 是否删除成功
 */
export function deleteBatchTask(batchId: string): boolean {
  if (!batchTasks[batchId]) {
    return false;
  }
  
  delete batchTasks[batchId];
  logger.info({ batchId }, '删除批量任务');
  
  return true;
} 
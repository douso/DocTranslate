import { defineStore } from 'pinia';
import type { TranslationTask, TranslationOptions, BatchTranslationStatus } from '../types';
import * as api from '../api';

interface TranslationState {
  tasks: TranslationTask[];
  currentTask: TranslationTask | null;
  batchStatus: BatchTranslationStatus | null;
  loading: boolean;
  error: string | null;
}

export const useTranslationStore = defineStore('translation', {
  state: (): TranslationState => ({
    tasks: [],
    currentTask: null,
    batchStatus: null,
    loading: false,
    error: null
  }),
  
  actions: {
    // 重置状态
    resetState() {
      this.tasks = [];
      this.currentTask = null;
      this.batchStatus = null;
      this.error = null;
    },
    
    // 设置加载状态
    setLoading(loading: boolean) {
      this.loading = loading;
    },
    
    // 设置错误
    setError(error: string | null) {
      this.error = error;
    },
    
    // 获取所有任务
    async fetchAllTasks() {
      try {
        this.setLoading(true);
        this.tasks = await api.getAllTasks();
      } catch (error) {
        this.setError((error as Error).message);
      } finally {
        this.setLoading(false);
      }
    },
    
    // 单文件翻译
    async translateFile(file: File, options: TranslationOptions) {
      try {
        this.setLoading(true);
        this.setError(null);
        
        const response = await api.translateFile(file, options);
        
        if (response && response.taskId) {
          // 获取任务状态
          await this.checkTaskStatus(response.taskId);
        }
        
        return response;
      } catch (error) {
        this.setError((error as Error).message);
        throw error;
      } finally {
        this.setLoading(false);
      }
    },
    
    // 批量翻译
    async translateBatch(files: File[], options: TranslationOptions) {
      try {
        this.setLoading(true);
        this.setError(null);
        
        const response = await api.translateBatch(files, options);
        
        if (response && response.batchId && response.taskIds) {
          // 保存批量任务状态
          this.batchStatus = {
            batchId: response.batchId,
            taskIds: response.taskIds,
            completedCount: 0,
            failedCount: 0,
            totalCount: response.taskIds.length,
            progress: 0,
            status: 'pending'
          };
          
          // 监控进度
          this.monitorBatchProgress(response.batchId, response.taskIds);
        }
        
        return response;
      } catch (error) {
        this.setError((error as Error).message);
        throw error;
      } finally {
        this.setLoading(false);
      }
    },
    
    // 检查任务状态
    async checkTaskStatus(taskId: string) {
      try {
        const task = await api.getTaskStatus(taskId);
        this.currentTask = task;
        return task;
      } catch (error) {
        this.setError(`获取任务状态失败: ${(error as Error).message}`);
        throw error;
      }
    },
    
    // 监控批量任务进度
    async monitorBatchProgress(batchId: string, taskIds: string[]) {
      try {
        const status = await api.getBatchProgress(batchId, taskIds);
        this.batchStatus = status;
        
        // 如果任务未完成，继续监控
        if (status.status !== 'completed' && status.status !== 'failed') {
          setTimeout(() => {
            this.monitorBatchProgress(batchId, taskIds);
          }, 3000);
        } else {
          // 任务完成后更新任务列表
          await this.fetchAllTasks();
        }
      } catch (error) {
        this.setError(`获取批量任务进度失败: ${(error as Error).message}`);
      }
    },
    
    // 删除任务
    async deleteTask(taskId: string) {
      try {
        this.setLoading(true);
        await api.deleteTask(taskId);
        // 更新任务列表
        await this.fetchAllTasks();
      } catch (error) {
        this.setError(`删除任务失败: ${(error as Error).message}`);
      } finally {
        this.setLoading(false);
      }
    },
    
    // 下载翻译结果
    downloadTranslation(taskId: string) {
      api.downloadTranslation(taskId);
    },
    
    // 下载批量翻译结果
    async downloadBatchResults(taskIds: string[]) {
      try {
        this.setLoading(true);
        await api.downloadBatchResults(taskIds);
      } catch (error) {
        this.setError(`下载批量结果失败: ${(error as Error).message}`);
      } finally {
        this.setLoading(false);
      }
    }
  }
}); 
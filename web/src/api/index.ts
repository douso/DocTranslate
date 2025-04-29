import axios from 'axios';
import type { TranslationOptions, TranslationTask, BatchTranslationStatus } from '../types';

const API_BASE_URL = 'http://localhost:3000/api';

// 创建axios实例
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 错误处理
api.interceptors.response.use(
  response => response,
  error => {
    const errorMessage = error.response?.data?.message || error.message || '请求出错';
    console.error('API请求错误:', errorMessage);
    return Promise.reject(error);
  }
);

// 文件上传配置
export const uploadConfig = {
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'multipart/form-data'
  }
};

// 单文件翻译
export const translateFile = async (file: File, options: TranslationOptions) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('targetLanguage', options.targetLanguage);
  
  if (options.sourceLanguage) {
    formData.append('sourceLanguage', options.sourceLanguage);
  }
  
  if (options.preserveFormatting !== undefined) {
    formData.append('preserveFormatting', String(options.preserveFormatting));
  }
  
  const response = await axios.post(`${API_BASE_URL}/translations`, formData, uploadConfig);
  return response.data;
};

// 批量翻译
export const translateBatch = async (files: File[], options: TranslationOptions) => {
  const formData = new FormData();
  
  files.forEach(file => {
    formData.append('files', file);
  });
  
  formData.append('targetLanguage', options.targetLanguage);
  
  if (options.sourceLanguage) {
    formData.append('sourceLanguage', options.sourceLanguage);
  }
  
  if (options.preserveFormatting !== undefined) {
    formData.append('preserveFormatting', String(options.preserveFormatting));
  }
  
  const response = await axios.post(`${API_BASE_URL}/translations/batch`, formData, uploadConfig);
  return response.data;
};

// 获取任务状态
export const getTaskStatus = async (taskId: string) => {
  const response = await api.get<{ task: TranslationTask }>(`/translations/${taskId}`);
  return response.data.task;
};

// 获取批量任务进度
export const getBatchProgress = async (batchId: string, taskIds: string[]) => {
  const response = await api.post<{ status: BatchTranslationStatus }>('/translations/batch/progress', {
    batchId,
    taskIds
  });
  return response.data.status;
};

// 获取所有任务
export const getAllTasks = async () => {
  const response = await api.get<{ tasks: TranslationTask[] }>('/translations');
  return response.data.tasks;
};

// 删除任务
export const deleteTask = async (taskId: string) => {
  const response = await api.delete(`/translations/${taskId}`);
  return response.data;
};

// 下载翻译结果
export const downloadTranslation = (taskId: string) => {
  window.open(`${API_BASE_URL}/translations/${taskId}/download`, '_blank');
};

// 下载批量翻译结果
export const downloadBatchResults = async (taskIds: string[]) => {
  const response = await api.post('/translations/batch/download', { taskIds }, { responseType: 'blob' });
  
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'translations.zip');
  document.body.appendChild(link);
  link.click();
  
  // 清理
  window.URL.revokeObjectURL(url);
  document.body.removeChild(link);
}; 
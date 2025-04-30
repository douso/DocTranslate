import { v4 as uuidv4 } from 'uuid';
import fs from 'fs-extra';
import path from 'path';
import { FileInfo, TaskStatus } from '../types/file';

// 任务存储路径
const TASKS_DIR = path.join(process.cwd(), 'data', 'tasks');

// 确保目录存在
fs.ensureDirSync(TASKS_DIR);

// 翻译任务模型
export interface TranslationTask {
  id: string;
  fileInfo: FileInfo;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
  progress: number;
  outputPath?: string;
  error?: string;
  fingerprint: string; // 添加浏览器指纹ID字段
}

// 创建新任务
export const createTask = (fileInfo: FileInfo, fingerprint: string = 'unknown'): TranslationTask => {
  const id = uuidv4();
  const now = new Date().toISOString();
  
  const task: TranslationTask = {
    id,
    fileInfo,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
    progress: 0,
    fingerprint, // 保存用户指纹
  };
  
  // 确保任务目录存在
  const taskDir = path.join(TASKS_DIR, id);
  fs.ensureDirSync(taskDir);
  
  // 保存任务信息
  saveTask(task);
  
  return task;
};

// 保存任务到文件
export const saveTask = (task: TranslationTask): void => {
  const taskPath = path.join(TASKS_DIR, task.id, 'task.json');
  fs.writeJsonSync(taskPath, task, { spaces: 2 });
};

// 获取任务
export const getTask = (taskId: string): TranslationTask | null => {
  const taskPath = path.join(TASKS_DIR, taskId, 'task.json');
  
  if (!fs.existsSync(taskPath)) {
    return null;
  }
  
  return fs.readJsonSync(taskPath);
};

// 获取所有任务
export const getAllTasks = (): TranslationTask[] => {
  if (!fs.existsSync(TASKS_DIR)) {
    return [];
  }
  
  const taskDirs = fs.readdirSync(TASKS_DIR);
  const tasks: TranslationTask[] = [];
  
  for (const dir of taskDirs) {
    const taskPath = path.join(TASKS_DIR, dir, 'task.json');
    
    if (fs.existsSync(taskPath)) {
      try {
        const task = fs.readJsonSync(taskPath);
        tasks.push(task);
      } catch (error) {
        console.error(`Error reading task ${dir}:`, error);
      }
    }
  }
  
  // 按创建时间降序排序
  return tasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

// 根据指纹获取任务
export const getTasksByFingerprint = (fingerprint: string): TranslationTask[] => {
  const allTasks = getAllTasks();
  return allTasks.filter(task => task.fingerprint === fingerprint);
};

// 更新任务状态
export const updateTaskStatus = (taskId: string, status: TaskStatus, progress: number = 0, outputPath?: string, error?: string): TranslationTask | null => {
  const task = getTask(taskId);
  
  if (!task) {
    return null;
  }
  
  task.status = status;
  task.progress = progress;
  task.updatedAt = new Date().toISOString();
  
  if (outputPath) {
    task.outputPath = outputPath;
  }
  
  if (error) {
    task.error = error;
  }
  
  saveTask(task);
  
  return task;
};

// 删除任务
export const deleteTask = (taskId: string): boolean => {
  const taskDir = path.join(TASKS_DIR, taskId);
  
  if (!fs.existsSync(taskDir)) {
    return false;
  }

  const task = getTask(taskId);
  
  try {
    // 上传源文件
    if (task) {
      fs.removeSync(path.join(task.fileInfo.path))
    }
    fs.removeSync(taskDir);
    return true;
  } catch (error) {
    console.error(`Error deleting task ${taskId}:`, error);
    return false;
  }
}; 
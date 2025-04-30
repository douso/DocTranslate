import express from 'express';
import { 
  createTranslation, 
  getTranslationStatus, 
  getUserTasks,
  deleteTranslation,
  downloadTranslation,
  retryTranslation
} from '../controllers/translationController';
import {
  createBatchTranslation,
  getBatchProgress,
  downloadBatchResults
} from '../controllers/batchController';
import { upload } from '../middlewares/uploadMiddleware';

const router = express.Router();

// 单文件翻译
router.post('/', upload.single('file'), createTranslation);

// 批量翻译
router.post('/batch', upload.array('files', 10), createBatchTranslation);

// 获取批量翻译进度
router.post('/batch/progress', getBatchProgress);

// 下载批量翻译结果
router.post('/batch/download', downloadBatchResults);

// 获取所有翻译任务
router.get('/', getUserTasks);

// 获取任务状态
router.get('/:taskId', getTranslationStatus);

// 删除任务
router.delete('/:taskId', deleteTranslation);

// 下载单个翻译文件
router.get('/:taskId/download', downloadTranslation);

// 重新翻译任务
router.post('/:taskId/retry', retryTranslation);

export default router; 
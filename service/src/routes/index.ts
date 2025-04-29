import express, { Request, Response } from 'express';
import translationRoutes from './translationRoutes';
import { getPromptTemplates, testPromptTemplate } from '../controllers/promptController';
import { getSystemStatus, cleanupTempFiles } from '../controllers/systemController';

const router = express.Router();

// 健康检查
router.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', message: '服务正常运行' });
});

// 翻译路由
router.use('/translations', translationRoutes);

// 提示词路由
router.get('/prompts', getPromptTemplates);
router.post('/prompts/test', testPromptTemplate);

// 系统路由
router.get('/system/status', getSystemStatus);
router.post('/system/cleanup', cleanupTempFiles);

export default router; 
import express, { Express } from 'express';
import cors from 'cors';
import fs from 'fs-extra';
import path from 'path';
import logger from './utils/logger';
import { errorHandler } from './middlewares/errorMiddleware';
import apiRoutes from './routes';
import { validateConfig, SERVER_CONFIG, FILE_CONFIG } from './config/env';
import { testOpenAIConnection } from './services/openaiService';
import './app';

// 初始化应用
const app: Express = express();

// 验证配置
if (!validateConfig()) {
  logger.error('配置验证失败，请检查环境变量');
  process.exit(1);
}

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 确保必要的目录存在
fs.ensureDirSync(path.resolve(process.cwd(), FILE_CONFIG.uploadDir));
fs.ensureDirSync(path.resolve(process.cwd(), FILE_CONFIG.tempDir));
fs.ensureDirSync(path.resolve(process.cwd(), FILE_CONFIG.outputDir));

// 路由
app.use('/api', apiRoutes);

// 静态文件服务
app.use('/uploads', express.static(path.join(process.cwd(), FILE_CONFIG.uploadDir)));
app.use('/outputs', express.static(path.join(process.cwd(), FILE_CONFIG.outputDir)));

// 404处理
app.use((req, res) => {
  res.status(404).json({ message: '请求的资源不存在' });
});

// 错误处理中间件
app.use(errorHandler);

// 启动服务器
const PORT = SERVER_CONFIG.port;
const server = app.listen(PORT, async () => {
  logger.info(`服务器运行在 http://localhost:${PORT}`);
  logger.info(`环境: ${SERVER_CONFIG.env}`);
  
  // 测试OpenAI API连接
  try {
    const isConnected = await testOpenAIConnection();
    if (!isConnected) {
      logger.warn('OpenAI API连接测试失败，翻译功能可能无法正常工作');
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error(`OpenAI API连接测试异常: ${errorMsg}`);
  }
});

// 优雅退出
process.on('SIGTERM', () => {
  logger.info('SIGTERM 信号接收，关闭服务器');
  server.close(() => {
    logger.info('服务器已关闭');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT 信号接收，关闭服务器');
  server.close(() => {
    logger.info('服务器已关闭');
    process.exit(0);
  });
});

export default app; 
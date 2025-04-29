import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs-extra';
import logger from '../utils/logger';

// 尝试加载环境变量
try {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    logger.info('成功加载.env文件');
  } else {
    logger.warn('.env文件不存在，使用默认配置或环境变量');
  }
} catch (error) {
  const errorMsg = error instanceof Error ? error.message : String(error);
  logger.error(`加载.env文件时出错: ${errorMsg}`);
}

// OpenAI配置
export const OPENAI_CONFIG = {
  apiKey: process.env.OPENAI_API_KEY || '',
  model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
  baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
};

// 服务器配置
export const SERVER_CONFIG = {
  port: parseInt(process.env.PORT || '3000', 10),
  env: process.env.NODE_ENV || 'development'
};

// 文件上传配置
export const FILE_CONFIG = {
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10', 10) * 1024 * 1024, // 默认10MB
  uploadDir: process.env.UPLOAD_DIR || 'uploads',
  tempDir: process.env.TEMP_DIR || 'temp',
  outputDir: process.env.OUTPUT_DIR || 'outputs'
};

// 任务配置
export const TASK_CONFIG = {
  maxConcurrentTasks: parseInt(process.env.MAX_CONCURRENT_TASKS || '3', 10),
  maxRetryCount: parseInt(process.env.MAX_RETRY_COUNT || '3', 10)
};

// 验证配置
export function validateConfig(): boolean {
  let isValid = true;
  
  // 验证OpenAI配置
  if (!OPENAI_CONFIG.apiKey) {
    logger.error('缺少OPENAI_API_KEY配置，请在.env文件中设置');
    isValid = false;
  }
  
  // 验证API基础URL
  if (!OPENAI_CONFIG.baseUrl) {
    logger.error('缺少OPENAI_BASE_URL配置，使用默认值: https://api.openai.com/v1');
  } else if (!OPENAI_CONFIG.baseUrl.startsWith('http')) {
    logger.error(`无效的OPENAI_BASE_URL: ${OPENAI_CONFIG.baseUrl}，必须以http或https开头`);
    isValid = false;
  }
  
  // 验证模型名称
  if (!OPENAI_CONFIG.model) {
    logger.error('缺少OPENAI_MODEL配置，使用默认值: gpt-3.5-turbo');
  }
  
  // 创建必要的目录
  [FILE_CONFIG.uploadDir, FILE_CONFIG.tempDir, FILE_CONFIG.outputDir].forEach(dir => {
    const dirPath = path.resolve(process.cwd(), dir);
    if (!fs.existsSync(dirPath)) {
      try {
        fs.mkdirSync(dirPath, { recursive: true });
        logger.info(`已创建目录: ${dirPath}`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger.error(`创建目录失败: ${dirPath}, 错误: ${errorMsg}`);
        isValid = false;
      }
    }
  });
  
  // 输出配置信息
  logger.info(`OpenAI配置: API URL=${OPENAI_CONFIG.baseUrl}, 模型=${OPENAI_CONFIG.model}`);
  logger.info(`文件配置: 上传目录=${FILE_CONFIG.uploadDir}, 临时目录=${FILE_CONFIG.tempDir}, 输出目录=${FILE_CONFIG.outputDir}`);
  
  return isValid;
} 
import { startCleanupSchedule } from './utils/taskCleaner';
import { restoreTasksFromStorage } from './services/translationService';
import logger from './utils/logger';

// 在服务启动时恢复任务数据
logger.info('正在恢复任务数据...');
restoreTasksFromStorage();
logger.info('任务数据恢复完成');

// 启动定时清理任务
startCleanupSchedule(); 
import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { getAllPromptTemplates, PromptTemplate } from '../services/promptService';
import { AppError } from '../middlewares/errorMiddleware';
import logger from '../utils/logger';

// 获取所有提示词模板
export const getPromptTemplates = asyncHandler(async (req: Request, res: Response) => {
  const templates = getAllPromptTemplates();
  
  res.json({
    success: true,
    data: templates
  });
});

// 测试提示词模板
export const testPromptTemplate = asyncHandler(async (req: Request, res: Response) => {
  const { templateName, templateContent, params } = req.body;
  
  if (!templateContent || typeof templateContent !== 'string') {
    throw new AppError('提示词模板内容不能为空', 400);
  }
  
  if (!params || typeof params !== 'object') {
    throw new AppError('参数必须是一个对象', 400);
  }
  
  try {
    // 替换提示词中的参数
    let result = templateContent;
    
    // 处理保留格式的特殊参数
    if ('preserveFormatting' in params) {
      const preserveFormatting = params.preserveFormatting === 'true' 
        ? '，保持原文的格式、段落和标点符号' 
        : '';
      result = result.replace('{preserveFormatting}', preserveFormatting);
    }
    
    // 替换其他参数
    for (const [key, value] of Object.entries(params)) {
      if (key !== 'preserveFormatting' && typeof value === 'string') {
        result = result.replace(new RegExp(`{${key}}`, 'g'), value);
      }
    }
    
    res.json({
      success: true,
      data: {
        templateName: templateName || '测试模板',
        originalContent: templateContent,
        processedContent: result,
        params
      }
    });
  } catch (error) {
    logger.error({ error }, '提示词模板测试失败');
    throw new AppError(`提示词模板测试失败: ${(error as Error).message}`, 500);
  }
}); 
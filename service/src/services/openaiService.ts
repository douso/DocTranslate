import OpenAI from 'openai';
import logger from '../utils/logger';
import { FileType } from '../types/file';
import { getTranslationPrompt, getGeneralPrompt } from './promptService';
import { OPENAI_CONFIG } from '../config/env';

// 初始化OpenAI客户端
const openai = new OpenAI({
  apiKey: OPENAI_CONFIG.apiKey,
  baseURL: OPENAI_CONFIG.baseUrl
});

interface TranslateOptions {
  sourceLanguage?: string; // 如果不提供，模型会自动检测
  targetLanguage: string;
  preserveFormatting?: boolean;
  text: string;
  fileType?: FileType; // 文件类型，用于选择合适的提示词
  model?: string;
}

type OpenAIResponse = OpenAI.Chat.Completions.ChatCompletion & {
  _request_id?: string | null;
  error?: {
    message: string;
    code: number;
    metadata: any;

  }
}

export async function translateText(options: TranslateOptions): Promise<string> {
  const {
    sourceLanguage,
    targetLanguage,
    preserveFormatting = true,
    text,
    fileType,
    model = OPENAI_CONFIG.model
  } = options;

  if (!text || text.trim() === '') {
    return '';
  }

  try {
    // 验证API密钥
    if (!OPENAI_CONFIG.apiKey) {
      throw new Error('缺少OpenAI API密钥。请在环境变量或.env文件中设置OPENAI_API_KEY');
    }

    // 构建提示词参数
    const promptParams = {
      sourceLanguage: sourceLanguage || '自动检测',
      targetLanguage,
      preserveFormatting: preserveFormatting ? 'true' : 'false',
      text
    };

    // 获取提示词
    let systemPrompt = '';
    let userPrompt = '';
    
    // 如果有指定文件类型，使用特定的翻译提示词
    if (fileType) {
      systemPrompt = getGeneralPrompt('system_translation', promptParams);
      userPrompt = getTranslationPrompt(fileType, promptParams);
    } else {
      // 否则使用通用提示词
      systemPrompt = getGeneralPrompt('system_translation', promptParams);
      userPrompt = `请将以下${sourceLanguage ? sourceLanguage + '语言的' : ''}文本翻译成${targetLanguage}`;
      
      if (preserveFormatting) {
        userPrompt += '，保持原文的格式、段落和标点符号';
      }
      
      userPrompt += ':\n\n' + text;
    }

    // 调用OpenAI API
    logger.info(`调用OpenAI API翻译 (长度: ${text.length}字符, 目标语言: ${targetLanguage})`);
    
    const response: OpenAIResponse = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: userPrompt
        }
      ],
      temperature: 0.3,
      max_tokens: 4000
    });

    // 判断是否存在错误
    if (response.error) {
      throw new Error(`OpenAI API错误: ${response.error.message}`);
    }

    // 验证响应并获取回复内容
    if (!response || !response.choices || response.choices.length === 0) {
      throw new Error('API返回了空响应或无效的响应格式');
    }

    if (!response.choices[0].message || !response.choices[0].message.content) {
      throw new Error('API返回的消息内容为空');
    }

    const translatedText = response.choices[0].message.content;
    logger.info(`翻译完成 (原文长度: ${text.length}字符, 译文长度: ${translatedText.length}字符)`);
    
    return translatedText;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error(`翻译文本时出错: ${errorMsg}`);
    
    // 如果是特定的API错误，给出更详细的信息
    if (error instanceof OpenAI.APIError) {
      logger.error(`OpenAI API错误: 状态码: ${error.status}, 类型: ${error.type}`);
      if (error.status === 401) {
        throw new Error('OpenAI API认证失败，请检查您的API密钥');
      } else if (error.status === 429) {
        throw new Error('OpenAI API调用次数超限或额度不足');
      } else if (error.status >= 500) {
        throw new Error('OpenAI服务器错误，请稍后重试');
      }
    }
    
    throw new Error(`翻译失败: ${errorMsg}`);
  }
}

// 测试OpenAI API连接
export async function testOpenAIConnection(): Promise<boolean> {
  try {
    logger.info('测试OpenAI API连接...');
    
    if (!OPENAI_CONFIG.apiKey) {
      logger.error('缺少OpenAI API密钥，无法测试连接');
      return false;
    }
    
    // 使用简单的模型列表API进行测试
    const response = await openai.models.list();
    
    if (response && response.data && response.data.length > 0) {
      const availableModels = response.data.map(model => model.id).join(', ');
      logger.info(`OpenAI API连接成功，可用模型: ${availableModels.substring(0, 100)}${availableModels.length > 100 ? '...' : ''}`);
      
      // 检查指定的模型是否可用
      const modelExists = response.data.some(model => model.id === OPENAI_CONFIG.model);
      if (!modelExists) {
        logger.warn(`配置的模型 ${OPENAI_CONFIG.model} 不在可用模型列表中，可能导致API调用失败`);
      } else {
        logger.info(`配置的模型 ${OPENAI_CONFIG.model} 可用`);
      }
      
      return true;
    } else {
      logger.error('OpenAI API返回了空的模型列表');
      return false;
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    
    if (error instanceof OpenAI.APIError) {
      logger.error(`OpenAI API连接测试失败: 状态码: ${error.status}, 类型: ${error.type}, 消息: ${errorMsg}`);
      
      if (error.status === 401) {
        logger.error('OpenAI API认证失败，请检查您的API密钥');
      } else if (error.status === 429) {
        logger.error('OpenAI API调用次数超限或额度不足');
      }
    } else {
      logger.error(`OpenAI API连接测试失败: ${errorMsg}`);
    }
    
    return false;
  }
} 
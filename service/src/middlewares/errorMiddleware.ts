import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

interface ErrorResponse {
  message: string;
  stack?: string;
}

class AppError extends Error {
  statusCode: number;
  
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = 500;
  
  if ('statusCode' in err) {
    statusCode = err.statusCode;
  }
  
  logger.error(
    `请求处理错误: ${err.message}, URL: ${req.originalUrl}, Method: ${req.method}${
      err.stack ? `\nStack: ${err.stack}` : ''
    }`
  );
  
  const errorResponse: ErrorResponse = {
    message: err.message || '服务器内部错误',
  };
  
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
  }
  
  res.status(statusCode).json(errorResponse);
};

export { errorHandler, AppError }; 
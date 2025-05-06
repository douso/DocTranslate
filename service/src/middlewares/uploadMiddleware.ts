import multer from 'multer';
import path from 'path';
import fs from 'fs-extra';
import { Request } from 'express';
import { AppError } from './errorMiddleware';
import { FileType } from '../types/file';

// 确保上传目录存在
const uploadDir = process.env.UPLOAD_DIR || 'uploads';
fs.ensureDirSync(path.resolve(process.cwd(), uploadDir));

// 配置存储选项
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.resolve(process.cwd(), uploadDir));
  },
  filename: (req, file, cb) => {
    // 生成唯一文件名
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// 文件过滤器
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const ext = path.extname(file.originalname).toLowerCase().substring(1);
  const allowedTypes = Object.values(FileType);
  
  if (allowedTypes.includes(ext as FileType)) {
    cb(null, true);
  } else {
    cb(new AppError(`不支持的文件类型: ${ext}，支持的类型: ${allowedTypes.join(', ')}`, 400) as any);
  }
};

// 大小限制，默认10MB
const maxSize = parseInt(process.env.MAX_FILE_SIZE || '10') * 1024 * 1024;

// 创建上传中间件
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: maxSize
  }
});

// 解析文件类型
export const parseFileType = (filename: string): FileType => {
  const ext = path.extname(filename).toLowerCase().substring(1);
  return ext as FileType;
}; 
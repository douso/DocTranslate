# 文档翻译服务 (Doc Translator)

这是一个功能强大的文档翻译服务，支持多种文件格式，利用OpenAI API提供高质量的翻译结果。

## 功能特点

- 支持多种文件格式（Markdown, JSON, YAML, HTML, TXT等）
- 批量文件处理
- 翻译任务队列管理
- 自定义提示词模板
- 语言自动检测
- 保留原文格式

## 系统要求

- Node.js 18+
- npm 或 yarn

## 安装

```bash
# 克隆仓库
git clone <仓库地址>
cd DocTranslator/service

# 安装依赖
npm install
# 或
yarn install
```

## 环境变量配置

在项目根目录创建`.env`文件，包含以下配置：

```
# OpenAI配置
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-3.5-turbo
OPENAI_BASE_URL=https://api.openai.com/v1

# 服务器配置
PORT=3000
NODE_ENV=development

# 文件上传配置
MAX_FILE_SIZE=10          # 最大文件大小(MB)
UPLOAD_DIR=uploads        # 上传文件存储目录
TEMP_DIR=temp             # 临时文件目录
OUTPUT_DIR=outputs        # 输出文件目录

# 任务配置
MAX_CONCURRENT_TASKS=3    # 最大并发任务数
MAX_RETRY_COUNT=3         # 失败任务最大重试次数
```

## 使用方法

### 开发模式

```bash
npm run dev
# 或
yarn dev
```

### 构建项目

```bash
npm run build
# 或
yarn build
```

### 启动服务

```bash
npm start
# 或
yarn start
```

## API接口

### 文件翻译

```
POST /api/translate/file
```

参数:
- `file`: 要翻译的文件（必需）
- `targetLanguage`: 目标语言（必需）
- `sourceLanguage`: 源语言（可选，默认自动检测）
- `preserveFormatting`: 是否保留格式（可选，默认为true）

### 文本翻译

```
POST /api/translate/text
```

参数:
- `text`: 要翻译的文本（必需）
- `targetLanguage`: 目标语言（必需）
- `sourceLanguage`: 源语言（可选，默认自动检测）
- `preserveFormatting`: 是否保留格式（可选，默认为true）

### 批量翻译

```
POST /api/translate/batch
```

参数:
- `files`: 要翻译的文件数组（必需）
- `targetLanguage`: 目标语言（必需）
- `sourceLanguage`: 源语言（可选，默认自动检测）
- `preserveFormatting`: 是否保留格式（可选，默认为true）

### 获取任务状态

```
GET /api/tasks/:taskId
```

参数:
- `taskId`: 任务ID（必需）

## 项目结构

```
service/
├── src/
│   ├── config/           # 配置
│   ├── controllers/      # 控制器
│   ├── middlewares/      # 中间件
│   ├── models/           # 数据模型
│   ├── processors/       # 文件处理器
│   ├── routes/           # 路由
│   ├── services/         # 服务
│   ├── types/            # 类型定义
│   ├── utils/            # 工具函数
│   └── index.ts          # 入口文件
├── .env                  # 环境变量
├── .env.example          # 环境变量示例
├── .gitignore            # Git忽略文件
├── package.json          # 项目依赖
└── tsconfig.json         # TypeScript配置
```

## 贡献

欢迎提交问题和拉取请求！

## 许可证

[MIT](LICENSE) 
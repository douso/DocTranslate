declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: 'development' | 'production' | 'test';
    PORT: string;
    OPENAI_API_KEY: string;
    OPENAI_MODEL: string;
    OPENAI_BASE_URL: string;
    MAX_FILE_SIZE: string;
    UPLOAD_DIR: string;
    TEMP_DIR: string;
    OUTPUT_DIR: string;
    MAX_CONCURRENT_TASKS: string;
    MAX_RETRY_COUNT: string;
  }
} 
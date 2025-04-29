<script setup lang="ts">
import { ref, reactive } from 'vue';
import { ElMessage, ElLoading } from 'element-plus';
import { Upload } from '@element-plus/icons-vue';
import { useTranslationStore } from '../stores/translation';
import type { TranslationOptions } from '../types';

const store = useTranslationStore();

// 文件
const fileRef = ref<HTMLInputElement | null>(null);
const file = ref<File | null>(null);
const filePreview = ref<string>('');

// 表单
const form = reactive<TranslationOptions>({
  targetLanguage: 'Chinese',
  sourceLanguage: '',
  preserveFormatting: true
});

// 语言选项
const languageOptions = [
  { value: 'Chinese', label: '中文' },
  { value: 'English', label: '英文' },
  { value: 'Japanese', label: '日文' },
  { value: 'Korean', label: '韩文' },
  { value: 'French', label: '法文' },
  { value: 'German', label: '德文' },
  { value: 'Spanish', label: '西班牙文' },
  { value: 'Russian', label: '俄文' }
];

// 上传文件
const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    file.value = target.files[0];
    previewFile(file.value);
  }
};

// 拖拽上传
const handleDrop = (event: DragEvent) => {
  event.preventDefault();
  event.stopPropagation();
  
  if (event.dataTransfer && event.dataTransfer.files.length > 0) {
    file.value = event.dataTransfer.files[0];
    previewFile(file.value);
  }
};

// 阻止默认拖放行为
const handleDragOver = (event: DragEvent) => {
  event.preventDefault();
  event.stopPropagation();
};

// 预览文件
const previewFile = (file: File) => {
  const reader = new FileReader();
  
  reader.onload = (e) => {
    if (e.target && typeof e.target.result === 'string') {
      filePreview.value = e.target.result;
    }
  };
  
  // 根据文件类型选择预览方式
  const fileType = file.name.split('.').pop()?.toLowerCase() || '';
  
  if (['txt', 'md', 'json', 'srt'].includes(fileType)) {
    reader.readAsText(file);
  } else {
    filePreview.value = `文件类型: ${fileType} 暂不支持预览，但可以翻译`;
  }
};

// 提交翻译
const handleSubmit = async () => {
  if (!file.value) {
    ElMessage.warning('请先上传文件');
    return;
  }
  
  const loading = ElLoading.service({
    lock: true,
    text: '正在提交翻译任务...',
    background: 'rgba(255, 255, 255, 0.7)'
  });
  
  try {
    const response = await store.translateFile(file.value, form);
    
    ElMessage.success('翻译任务已提交，请在任务列表中查看进度');
    
    // 重置表单
    file.value = null;
    filePreview.value = '';
    if (fileRef.value) {
      fileRef.value.value = '';
    }
  } catch (error) {
    ElMessage.error('提交翻译任务失败');
    console.error(error);
  } finally {
    loading.close();
  }
};
</script>

<template>
  <div class="translate-container">
    <h1>文档翻译</h1>
    
    <el-card class="form-card">
      <el-form :model="form" label-position="top">
        <el-form-item label="目标语言">
          <el-select v-model="form.targetLanguage" placeholder="请选择目标语言">
            <el-option
              v-for="option in languageOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </el-form-item>
        
        <el-form-item label="源语言 (可选，默认自动检测)">
          <el-select v-model="form.sourceLanguage" placeholder="请选择源语言" clearable>
            <el-option
              v-for="option in languageOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </el-form-item>
        
        <el-form-item>
          <el-checkbox v-model="form.preserveFormatting">
            保留原文格式
          </el-checkbox>
        </el-form-item>
      </el-form>
    </el-card>
    
    <div 
      class="upload-area" 
      @dragover="handleDragOver" 
      @drop="handleDrop"
    >
      <input
        ref="fileRef"
        type="file"
        @change="handleFileChange"
        accept=".txt,.md,.docx,.csv,.xlsx,.pdf,.srt,.json"
        style="display: none"
      />
      
      <div v-if="!file" class="upload-prompt">
        <el-icon><Upload /></el-icon>
        <h3>拖拽文件到此处或点击上传</h3>
        <p>支持的格式: TXT, Markdown, Word, CSV, Excel, PDF, SRT, JSON</p>
        <el-button type="primary" @click="fileRef?.click()">
          选择文件
        </el-button>
      </div>
      
      <div v-else class="file-info">
        <div class="file-header">
          <h3>{{ file.name }}</h3>
          <span class="file-size">{{ (file.size / 1024).toFixed(2) }} KB</span>
        </div>
        
        <div class="preview-section">
          <h4>文件预览</h4>
          <pre class="preview-content">{{ filePreview }}</pre>
        </div>
        
        <div class="action-buttons">
          <el-button @click="file = null; filePreview = ''; if (fileRef) fileRef.value = ''">
            重新选择
          </el-button>
          <el-button type="primary" @click="handleSubmit">
            开始翻译
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.translate-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

h1 {
  margin-bottom: 24px;
  font-size: 1.75rem;
  color: #303133;
}

.form-card {
  margin-bottom: 24px;
}

.upload-area {
  border: 2px dashed #dcdfe6;
  border-radius: 8px;
  padding: 30px;
  text-align: center;
  transition: border-color 0.3s;
  min-height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.upload-area:hover {
  border-color: #409eff;
}

.upload-prompt {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.upload-prompt .el-icon {
  font-size: 48px;
  color: #c0c4cc;
}

.file-info {
  width: 100%;
}

.file-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid #ebeef5;
}

.file-size {
  color: #909399;
  font-size: 0.9rem;
}

.preview-section {
  text-align: left;
  margin-bottom: 24px;
}

.preview-content {
  background-color: #f5f7fa;
  padding: 16px;
  border-radius: 4px;
  max-height: 200px;
  overflow-y: auto;
  white-space: pre-wrap;
  font-size: 0.9rem;
  color: #606266;
}

.action-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style> 
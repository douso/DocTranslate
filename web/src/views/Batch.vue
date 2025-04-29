<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { ElMessage, ElLoading } from 'element-plus';
import { Upload, Delete, Document, VideoPlay } from '@element-plus/icons-vue';
import { useTranslationStore } from '../stores/translation';
import type { TranslationOptions } from '../types';

const store = useTranslationStore();

// 文件列表
const fileListRef = ref<HTMLInputElement | null>(null);
const fileList = ref<File[]>([]);

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

// 计算总文件大小
const totalSize = computed(() => {
  const size = fileList.value.reduce((acc: number, file: File) => acc + file.size, 0);
  return (size / (1024 * 1024)).toFixed(2);
});

// 上传文件
const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    fileList.value = [...fileList.value, ...Array.from(target.files)];
  }
};

// 拖拽上传
const handleDrop = (event: DragEvent) => {
  event.preventDefault();
  event.stopPropagation();
  
  if (event.dataTransfer && event.dataTransfer.files.length > 0) {
    fileList.value = [...fileList.value, ...Array.from(event.dataTransfer.files)];
  }
};

// 阻止默认拖放行为
const handleDragOver = (event: DragEvent) => {
  event.preventDefault();
  event.stopPropagation();
};

// 移除文件
const removeFile = (index: number) => {
  fileList.value.splice(index, 1);
};

// 清空文件列表
const clearFileList = () => {
  fileList.value = [];
  if (fileListRef.value) {
    fileListRef.value.value = '';
  }
};

// 提交批量翻译
const handleSubmit = async () => {
  if (fileList.value.length === 0) {
    ElMessage.warning('请先上传文件');
    return;
  }
  
  const loading = ElLoading.service({
    lock: true,
    text: '正在提交批量翻译任务...',
    background: 'rgba(255, 255, 255, 0.7)'
  });
  
  try {
    const response = await store.translateBatch(fileList.value, form);
    
    ElMessage.success('批量翻译任务已提交，请在任务列表中查看进度');
    
    // 重置表单
    clearFileList();
  } catch (error) {
    ElMessage.error('提交批量翻译任务失败');
    console.error(error);
  } finally {
    loading.close();
  }
};

// 获取文件图标
const getFileIcon = (fileName: string) => {
  const extension = fileName.split('.').pop()?.toLowerCase() || '';
  
  switch (extension) {
    case 'txt':
      return Document;
    case 'md':
      return Document;
    case 'docx':
      return Document;
    case 'csv':
      return Document;
    case 'xlsx':
      return Document;
    case 'pdf':
      return Document;
    case 'srt':
      return VideoPlay;
    case 'json':
      return Document;
    default:
      return Document;
  }
};
</script>

<template>
  <div class="batch-container">
    <div class="section-title">
      <h2>批量翻译</h2>
      <div class="title-actions">
        <el-tooltip content="刷新页面" placement="top">
          <el-button 
            type="primary" 
            icon="Refresh" 
            circle 
            @click="() => { fileList = []; store.batchStatus = null; }"
          />
        </el-tooltip>
      </div>
    </div>
    
    <el-card class="form-card" shadow="hover">
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
        ref="fileListRef"
        type="file"
        @change="handleFileChange"
        accept=".txt,.md,.docx,.csv,.xlsx,.pdf,.srt,.json"
        multiple
        style="display: none"
      />
      
      <div v-if="fileList.length === 0" class="upload-prompt">
        <el-icon><Upload /></el-icon>
        <h3>拖拽文件到此处或点击上传</h3>
        <p>支持的格式: TXT, Markdown, Word, CSV, Excel, PDF, SRT, JSON</p>
        <p>支持批量上传多个文件</p>
        <el-button type="primary" @click="fileListRef?.click()" icon="Plus">
          选择文件
        </el-button>
      </div>
      
      <div v-else class="file-list-container">
        <div class="file-list-header">
          <h3>已选择 {{ fileList.length }} 个文件（总计 {{ totalSize }} MB）</h3>
          <el-button type="primary" @click="fileListRef?.click()" icon="Plus">
            添加更多文件
          </el-button>
        </div>
        
        <el-table 
          :data="fileList" 
          style="width: 100%" 
          border 
          stripe 
          max-height="300"
          :header-cell-style="{backgroundColor: '#f5f7fa'}"
        >
          <el-table-column label="文件名" prop="name" min-width="280">
            <template #default="{ row }">
              <div class="file-name">
                <el-icon><component :is="getFileIcon(row.name)" /></el-icon>
                <el-tooltip :content="row.name" placement="top" :disabled="row.name.length < 30">
                  <span class="filename-text">{{ row.name }}</span>
                </el-tooltip>
              </div>
            </template>
          </el-table-column>
          
          <el-table-column label="大小" width="120" align="right">
            <template #default="{ row }">
              {{ (row.size / 1024).toFixed(2) }} KB
            </template>
          </el-table-column>
          
          <el-table-column label="操作" width="80" align="center">
            <template #default="{ $index }">
              <el-tooltip content="移除文件" placement="top">
                <el-button 
                  type="danger" 
                  size="small" 
                  @click="removeFile($index)"
                  icon="Delete"
                  circle
                />
              </el-tooltip>
            </template>
          </el-table-column>
        </el-table>
        
        <div class="action-buttons">
          <el-button @click="clearFileList" icon="DeleteFilled">清空列表</el-button>
          <el-button type="primary" @click="handleSubmit" icon="Upload">开始批量翻译</el-button>
        </div>
      </div>
    </div>
    
    <el-card v-if="store.batchStatus" class="batch-status-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <h3>批量任务进度</h3>
        </div>
      </template>
      
      <el-descriptions border :column="2">
        <el-descriptions-item label="任务ID">
          <el-tag size="small">{{ store.batchStatus.batchId }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="store.batchStatus.status === 'completed' ? 'success' : 
                        store.batchStatus.status === 'failed' ? 'danger' : 'warning'">
            {{ store.batchStatus.status }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="总文件数">{{ store.batchStatus.totalCount }}</el-descriptions-item>
        <el-descriptions-item label="已完成">{{ store.batchStatus.completedCount }}</el-descriptions-item>
        <el-descriptions-item label="失败">{{ store.batchStatus.failedCount }}</el-descriptions-item>
      </el-descriptions>
      
      <div class="progress-container">
        <el-progress 
          :percentage="store.batchStatus.progress" 
          :status="store.batchStatus.status === 'failed' ? 'exception' : 
                  store.batchStatus.status === 'completed' ? 'success' : ''"
          :stroke-width="18"
        />
      </div>
      
      <div class="status-actions" v-if="store.batchStatus.status === 'completed'">
        <el-button 
          type="success" 
          @click="store.downloadBatchResults(store.batchStatus.taskIds)"
          icon="Download"
        >
          下载所有翻译结果
        </el-button>
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.batch-container {
  max-width: 900px;
  margin: 0 auto;
  padding: 20px;
}

.section-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-title h2 {
  font-size: 1.5rem;
  color: #303133;
  margin: 0;
  font-weight: 600;
}

.title-actions {
  display: flex;
  gap: 8px;
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
  margin-bottom: 24px;
  background-color: #f9f9f9;
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
  color: #909399;
}

.file-list-container {
  width: 100%;
}

.file-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.file-name {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filename-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 250px;
  display: inline-block;
}

.action-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
}

.batch-status-card {
  margin-top: 24px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.progress-container {
  margin: 20px 0;
}

.status-actions {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}
</style> 
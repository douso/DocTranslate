<template>
  <el-dialog
    v-model="visible"
    fullscreen
    destroy-on-close
    center
    :title="title"
  >
    <div class="file-preview-container">
      <!-- 根据文件类型自动选择合适的预览组件 -->
      <component
        :is="previewComponent"
        v-if="previewComponent"
        :fileUrl="currentUrl"
        :fileType="fileExtension"
      />
      <div v-else-if="loading" class="loading-container">
        <el-icon class="loading"><Loading /></el-icon>
        <span>正在加载文件预览...</span>
      </div>
      <div v-else class="error-container">
        <el-icon><WarningFilled /></el-icon>
        <span>{{ error || `不支持的文件类型: ${fileExtension}` }}</span>
      </div>
    </div>
    <el-backtop target=".el-dialog.is-fullscreen"/>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, shallowRef, defineAsyncComponent } from 'vue';
import type { Component } from 'vue';
import { ElMessage } from 'element-plus';
import { Loading, WarningFilled } from '@element-plus/icons-vue';

// const props = defineProps({
//   fileUrl: {
//     type: String,
//     required: true
//   }
// });

const loading = ref(true);
const error = ref('');

// 异步加载预览组件以提高性能
const OfficePreview = defineAsyncComponent(() => import('./OfficePreview.vue'));
const MarkdownPreview = defineAsyncComponent(() => import('./MarkdownPreview.vue'));
const CsvPreview = defineAsyncComponent(() => import('./CsvPreview.vue'));
const JsonPreview = defineAsyncComponent(() => import('./JsonPreview.vue'));
const SubtitlePreview = defineAsyncComponent(() => import('./SubtitlePreview.vue'));
const TextPreview = defineAsyncComponent(() => import('./TextPreview.vue'));

// 使用shallowRef以避免深度响应性，指定组件类型
const previewComponent = shallowRef<Component | null>(null);

// 从URL提取文件扩展名
const fileExtension = computed(() => {
  const url = currentUrl.value || '';
  return url.split('.').pop()?.toLowerCase() || '';
});

// 根据文件扩展名确定使用哪个预览组件
const determinePreviewComponent = () => {
  const extension = fileExtension.value;
  
  // Office 文件
  if (['docx', 'doc'].includes(extension)) {
    return OfficePreview;
  } else if (['xlsx', 'xls'].includes(extension)) {
    return OfficePreview;
  } else if (['pdf'].includes(extension)) {
    return OfficePreview;
  } 
  // Markdown 文件
  else if (['md', 'markdown'].includes(extension)) {
    return MarkdownPreview;
  } 
  // CSV 文件
  else if (['csv'].includes(extension)) {
    return CsvPreview;
  } 
  // JSON 文件
  else if (['json'].includes(extension)) {
    return JsonPreview;
  } 
  // 字幕文件
  else if (['srt', 'vtt', 'ass', 'ssa'].includes(extension)) {
    return SubtitlePreview;
  } 
  // 文本文件
  else if (['txt', 'log', 'ini', 'cfg', 'conf', 'xml', 'html', 'htm', 'js', 'ts', 'css', 'scss', 'less'].includes(extension)) {
    return TextPreview;
  } 
  // 不支持的文件类型
  else {
    return null;
  }
};

const currentUrl = ref('');
const title = ref('');
const visible = ref(false);
const reset = async (fileUrl: string, filename: string, type: string) => {
  title.value = `${filename} - ${type == 'target' ? '结果预览' : '原文件预览'}`
  visible.value = true;
  currentUrl.value = fileUrl;
  try {
    loading.value = true;
    
    if (!fileUrl) {
      throw new Error('未提供文件URL');
    }
    
    previewComponent.value = determinePreviewComponent();
    
    if (!previewComponent.value) {
      error.value = `不支持的文件类型: ${fileExtension.value}`;
    }
    
    loading.value = false;
  } catch (err: any) {
    loading.value = false;
    error.value = err.message || '预览失败';
    ElMessage.error(error.value);
  }
}

defineExpose({
  reset,
})
</script>

<style scoped>
.file-preview-container {
  background-color: #fff;
  width: 100%;
  height: 100%;
  min-height: 500px;
  max-width: 1000px;
  margin: 0 auto;
}

.loading-container, .error-container {
  width: 100%;
  height: 100%;
  min-height: 200px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: #909399;
}

.loading {
  animation: rotating 2s linear infinite;
}

@keyframes rotating {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.error-container {
  color: #f56c6c;
}
</style> 
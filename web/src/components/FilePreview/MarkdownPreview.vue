<template>
  <div class="markdown-preview-container">
    <div v-if="loading" class="loading-container">
      <el-icon class="loading"><Loading /></el-icon>
      <span>正在加载Markdown...</span>
    </div>
    <div v-if="error" class="error-container">
      <el-icon><WarningFilled /></el-icon>
      <span>{{ error }}</span>
    </div>
    <div ref="previewRef" class="md-preview"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { ElMessage } from 'element-plus';
import { Loading, WarningFilled } from '@element-plus/icons-vue';
import axios from 'axios';

// 这些导入在实际使用时需要安装vditor依赖
// import Vditor from 'vditor';
import 'vditor/dist/index.css';
import VditorPreview from 'vditor/dist/method.min'

const props = defineProps({
  fileUrl: {
    type: String,
    required: true
  }
});

const loading = ref(true);
const error = ref('');
const previewRef = ref<HTMLDivElement>();
const vditor = ref<any>(null);

const fetchMarkdownContent = async () => {
  try {
    const response = await axios.get(props.fileUrl);
    return response.data;
  } catch (err: any) {
    throw new Error(err.message || '获取Markdown内容失败');
  }
};

onMounted(async () => {
  try {
    
    loading.value = true;
    
    const content = await fetchMarkdownContent();
    
    // 初始化Vditor预览器
    VditorPreview.preview(previewRef.value as HTMLDivElement, content, {
      mode: 'light',
      hljs: {
        enable: true,
        style: 'github'
      },
      math: {
        inlineDigit: true
      },
    });
    
    loading.value = false;
  } catch (err: any) {
    loading.value = false;
    error.value = err.message || '预览Markdown失败';
    ElMessage.error(error.value);
  }
});

onBeforeUnmount(() => {
  // 清理资源
  if (vditor.value) {
    vditor.value.destroy();
  }
});
</script>

<style scoped>
.markdown-preview-container {
  width: 100%;
  height: 100%;
  min-height: 500px;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  overflow: auto;
}

.md-preview {
  padding: 15px;
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
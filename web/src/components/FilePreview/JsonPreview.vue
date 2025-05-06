<template>
  <div class="json-preview-container">
    <div v-if="loading" class="loading-container">
      <el-icon class="loading"><Loading /></el-icon>
      <span>正在加载JSON数据...</span>
    </div>
    <div v-if="error" class="error-container">
      <el-icon><WarningFilled /></el-icon>
      <span>{{ error }}</span>
    </div>
    <div v-show="!loading && !error" class="json-data">
      <!-- JSON预览组件将在这里渲染 -->
      <vue-json-pretty :data="jsonData" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, createApp, h } from 'vue';
import { ElMessage, ElButton, ElButtonGroup } from 'element-plus';
import { Loading, WarningFilled, Expand, Fold } from '@element-plus/icons-vue';
import axios from 'axios';
import VueJsonPretty from 'vue-json-pretty';
import 'vue-json-pretty/lib/styles.css';

const props = defineProps({
  fileUrl: {
    type: String,
    required: true
  }
});

const loading = ref(true);
const error = ref('');
const jsonData = ref<any>({});
const jsonViewer = ref<any>(null);

const fetchJsonContent = async () => {
  try {
    const response = await axios.get(props.fileUrl);
    return response.data;
  } catch (err: any) {
    throw new Error(err.message || '获取JSON内容失败');
  }
};

const expandAll = () => {
  if (jsonViewer.value) {
    jsonViewer.value.expandAll();
  }
};

const collapseAll = () => {
  if (jsonViewer.value) {
    jsonViewer.value.collapseAll();
  }
};

onMounted(async () => {
  try {
    loading.value = true;
    
    jsonData.value = await fetchJsonContent();
    
    loading.value = false;
  } catch (err: any) {
    loading.value = false;
    error.value = err.message || 'JSON预览失败';
    ElMessage.error(error.value);
  }
});
</script>

<style scoped>
.json-preview-container {
  width: 100%;
  height: 100%;
  min-height: 500px;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  overflow: auto;
}

.json-data {
  padding: 15px;
}

.json-viewer {
  padding: 10px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  background-color: #f8f8f8;
  min-height: 400px;
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
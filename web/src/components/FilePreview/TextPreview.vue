<template>
  <div class="text-preview-container">
    <div v-if="loading" class="loading-container">
      <el-icon class="loading"><Loading /></el-icon>
      <span>正在加载文本...</span>
    </div>
    <div v-if="error" class="error-container">
      <el-icon><WarningFilled /></el-icon>
      <span>{{ error }}</span>
    </div>
    <div v-if="!loading && !error" class="text-content">
      <!-- <div class="text-toolbar">
        <el-radio-group v-model="wrapMode" size="small">
          <el-radio-button value="wrap">自动换行</el-radio-button>
          <el-radio-button value="nowrap">不换行</el-radio-button>
        </el-radio-group>
      </div> -->
      <div class="bgmask">
        <pre :class="['text-display', wrapMode]">{{ textContent }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage, ElRadioGroup, ElRadioButton, ElScrollbar } from 'element-plus';
import { Loading, WarningFilled } from '@element-plus/icons-vue';
import axios from 'axios';

const props = defineProps({
  fileUrl: {
    type: String,
    required: true
  }
});

const loading = ref(true);
const error = ref('');
const textContent = ref('');
const wrapMode = ref('wrap');

const fetchTextContent = async () => {
  try {
    loading.value = true;
    
    const response = await axios.get(props.fileUrl, {
      responseType: 'text',
      transformResponse: [(data) => data] // 防止自动JSON解析
    });
    
    if (response.status === 200) {
      textContent.value = response.data;
    } else {
      throw new Error(`获取失败，状态码: ${response.status}`);
    }
    
    loading.value = false;
  } catch (err: any) {
    loading.value = false;
    error.value = err.message || '获取文本内容失败';
    ElMessage.error(error.value);
  }
};

onMounted(() => {
  fetchTextContent();
});
</script>

<style scoped>
.text-preview-container {
  width: 100%;
  height: 100%;
  min-height: 500px;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: 10px;
}

.text-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.text-toolbar {
  padding: 10px;
  border-bottom: 1px solid #ebeef5;
  display: flex;
  justify-content: flex-end;
}

.bgmask {
  background-color: #808080;
  padding: 30px;
  flex: 1;
}

.text-display {
  width: 800px;
  padding: 52pt 60pt;
  margin: 0 auto;
  font-family: 'Courier New', Courier, monospace;
  font-size: 14px;
  line-height: 1.5;
  min-height: 400px;
  color: #000;
  background-color: #fff;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
}

.text-display.wrap {
  white-space: pre-wrap;
  word-wrap: break-word;
}

.text-display.nowrap {
  white-space: pre;
  overflow-x: auto;
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
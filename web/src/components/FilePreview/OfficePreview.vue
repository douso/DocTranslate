<template>
  <div class="office-preview-container">
    <vue-office-docx
      v-if="fileType === 'docx'"
      :src="fileUrl"
      @rendered="handleRendered"
      @error="handleError"
    />
    <vue-office-excel
      v-if="fileType === 'xlsx'"
      :src="fileUrl"
      style="height: calc(100vh - 100px);"
      @rendered="handleRendered"
      @error="handleError"
    />
    <vue-office-pdf
      v-if="fileType === 'pdf'"
      :src="fileUrl"
      @rendered="handleRendered"
      @error="handleError"
    />
    <div v-if="error" class="error-container">
      <el-icon><WarningFilled /></el-icon>
      <span>{{ error }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, defineAsyncComponent } from 'vue';
import { ElMessage } from 'element-plus';
import { Loading, WarningFilled } from '@element-plus/icons-vue';
//引入VueOfficeDocx组件
import VueOfficeDocx from '@vue-office/docx'
//引入相关样式
import '@vue-office/docx/lib/index.css'
//引入VueOfficeExcel组件
import VueOfficeExcel from '@vue-office/excel'
//引入相关样式
import '@vue-office/excel/lib/index.css'
//引入VueOfficePdf组件
import VueOfficePdf from '@vue-office/pdf'

const props = defineProps({
  fileUrl: {
    type: String,
    required: true
  },
  fileType: {
    type: String,
    required: true
  }
});

const loading = ref(true);
const error = ref('');

const handleRendered = () => {
  loading.value = false;
};

const handleError = (err: any) => {
  loading.value = false;
  error.value = `文档加载失败: ${err.message || '未知错误'}`;
  ElMessage.error(error.value);
};

onMounted(() => {
  // 检查文件类型是否支持
  if (!['docx', 'xlsx', 'pdf'].includes(props.fileType)) {
    error.value = `不支持的文件类型: ${props.fileType}`;
    loading.value = false;
  }
});
</script>

<style scoped>
.office-preview-container {
  width: 100%;
  height: 100%;
  min-height: 500px;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  padding: 10px;
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
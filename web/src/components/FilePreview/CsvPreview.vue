<template>
  <div class="csv-preview-container">
    <div v-if="loading" class="loading-container">
      <el-icon class="loading"><Loading /></el-icon>
      <span>正在加载CSV数据...</span>
    </div>
    <div v-if="error" class="error-container">
      <el-icon><WarningFilled /></el-icon>
      <span>{{ error }}</span>
    </div>
    <div v-if="!loading && !error" class="csv-data">
      <div class="csv-toolbar" v-if="tableData.length > 0">
        <div class="csv-info">
          <el-tooltip content="第一行视为表头" placement="top">
            <el-tag size="small" type="info">CSV</el-tag>
          </el-tooltip>
          <span class="info-text">
            共 <strong>{{ tableData.length - 1 }}</strong> 行数据 | 
            <strong>{{ tableData[0]?.length || 0 }}</strong> 列
          </span>
        </div>
        <div class="csv-actions">
          <el-switch
            v-model="enableFixedHeader"
            active-text="固定表头"
            inactive-text=""
            style="margin-right: 16px;"
          />
          <el-radio-group v-model="cellWrapMode" size="small">
            <el-radio-button value="nowrap">单行显示</el-radio-button>
            <el-radio-button value="wrap">自动换行</el-radio-button>
          </el-radio-group>
          <!-- <el-button type="primary" size="small" @click="exportCSV">
            <el-icon><Download /></el-icon> 导出
          </el-button> -->
        </div>
      </div>

      <div v-if="tableData.length > 0" 
          class="custom-table-container" 
          :class="{ 'fixed-header': enableFixedHeader }">
        <div class="custom-table-wrapper">
          <table class="custom-table">
            <thead>
              <tr>
                <th class="row-index-header">#</th>
                <th v-for="(cell, colIndex) in tableData[0]" :key="colIndex">
                  {{ cell || '' }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, rowIndex) in tableData.slice(1)" :key="rowIndex">
                <td class="row-index">{{ rowIndex + 1 }}</td>
                <td v-for="(cell, colIndex) in row" :key="colIndex" :class="cellWrapMode">
                  {{ cell }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div v-else class="no-data">
        <el-empty description="无数据" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage, ElEmpty, ElSwitch, ElRadioGroup, ElRadioButton, ElButton, ElTooltip, ElTag } from 'element-plus';
import { Loading, WarningFilled, Download } from '@element-plus/icons-vue';
import axios from 'axios';
import Papa from 'papaparse';

const props = defineProps({
  fileUrl: {
    type: String,
    required: true
  }
});

const loading = ref(true);
const error = ref('');
const tableData = ref<string[][]>([]);
const enableFixedHeader = ref(true);
const cellWrapMode = ref('nowrap');
const rawCsvData = ref<string>('');

// 导出CSV文件
const exportCSV = () => {
  if (!tableData.value.length) {
    ElMessage.warning('没有数据可导出');
    return;
  }

  try {
    // 如果已经有原始CSV数据，直接使用
    const csvContent = rawCsvData.value || 
      Papa.unparse(tableData.value, {
        delimiter: ',',
        quotes: true,
      });

    // 创建Blob对象
    const blob = new Blob(['\ufeff'+csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    // 创建下载链接
    const link = document.createElement('a');
    link.setAttribute('href', url);
    
    // 提取原始文件名或使用默认名
    const originalFilename = props.fileUrl.split('/').pop() || 'export.csv';
    link.setAttribute('download', originalFilename);
    
    // 模拟点击下载
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    ElMessage.success('CSV导出成功');
  } catch (err: any) {
    ElMessage.error(`导出失败: ${err.message || '未知错误'}`);
  }
};

onMounted(async () => {
  try {
    loading.value = true;

    Papa.parse(props.fileUrl, {
      download: true,
      skipEmptyLines: true,
      complete: (result: any) => {
        loading.value = false;
        if (result.errors && result.errors.length > 0) {
          const errorMessage = result.errors.map((err: any) => err.message).join(', ');
          error.value = `CSV解析错误: ${errorMessage}`;
          ElMessage.error(error.value);
          return;
        }
        
        tableData.value = result.data;
        
        // 保存原始CSV
        try {
          // 尝试获取原始CSV以便导出时保留格式
          fetch(props.fileUrl)
            .then(response => response.text())
            .then(text => {
              rawCsvData.value = text;
            })
            .catch(() => {
              // 如果获取原始CSV失败，导出时将通过unparse重新生成
              rawCsvData.value = '';
            });
        } catch (e) {
          rawCsvData.value = '';
        }
      },
      error: (err: any) => {
        loading.value = false;
        error.value = err.message || 'CSV预览失败';
        ElMessage.error(error.value);
      }
    });

  } catch (err: any) {
    loading.value = false;
    error.value = err.message || 'CSV预览失败';
    ElMessage.error(error.value);
  }
});
</script>

<style scoped>
.csv-preview-container {
  width: 100%;
  height: 100%;
  min-height: 500px;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
}

.csv-data {
  padding: 10px;
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.csv-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  margin-bottom: 12px;
  border-bottom: 1px solid #ebeef5;
}

.csv-info {
  color: #606266;
  font-size: 14px;
  display: flex;
  align-items: center;
}

.info-text {
  margin-left: 8px;
}

.csv-actions {
  display: flex;
  align-items: center;
}

.custom-table-container {
  flex: 1;
  overflow: auto;
  border-radius: 4px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.custom-table-container.fixed-header {
  overflow: auto;
}

.custom-table-wrapper {
  min-width: 100%;
}

.custom-table {
  width: 100%;
  border-collapse: collapse;
  border-spacing: 0;
  table-layout: auto;
}

.custom-table th,
.custom-table td {
  padding: 12px 8px;
  text-align: left;
  font-size: 14px;
  border-bottom: 1px solid #ebeef5;
  border-right: 1px solid #ebeef5;
}

.row-index-header, .row-index {
  width: 50px;
  text-align: center;
  background-color: #f9f9f9;
  color: #909399;
  font-weight: normal;
}

.row-index {
  position: sticky;
  left: 0;
  z-index: 1;
  background-color: #f9f9f9;
}

.fixed-header .row-index-header {
  position: sticky;
  top: 0;
  left: 0;
  z-index: 3;
  background-color: #f5f7fa;
}

.custom-table th:last-child,
.custom-table td:last-child {
  border-right: none;
}

.custom-table th {
  background-color: #f5f7fa;
  color: #606266;
  font-weight: 500;
}

.fixed-header .custom-table th {
  position: sticky;
  top: 0;
  z-index: 2;
  border-bottom: 2px solid #dcdfe6;
}

.custom-table td.nowrap {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 250px;
}

.custom-table td.wrap {
  white-space: normal;
  word-wrap: break-word;
  max-width: 250px;
}

.custom-table tr:nth-child(even) {
  background-color: #fafafa;
}

.custom-table tr:hover {
  background-color: #f5f7fa;
}

.loading-container, .error-container, .no-data {
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
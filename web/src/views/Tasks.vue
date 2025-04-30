<script setup lang="ts">
import { ref, onMounted, computed, nextTick } from 'vue';
import { ElMessageBox, ElMessage } from 'element-plus';
import { Delete, Download } from '@element-plus/icons-vue';
import { useTranslationStore } from '../stores/translation';
import type { TranslationTask, TaskStatus } from '../types';
import HtmlTooltip from '@/components/HtmlTooltip/index.vue';

const store = useTranslationStore();
const refreshInterval = ref<number | null>(null);
const expandedRows = ref<string[]>([]);

// 表格引用
const processingTable = ref<any>(null);
const completedTable = ref<any>(null);
const failedTable = ref<any>(null);

// 自动刷新开关
const autoRefresh = ref(true);

// 多选相关
const multipleSelection = ref<TranslationTask[]>([]);
const hasSelection = computed(() => multipleSelection.value.length > 0);

// 初始化
onMounted(() => {
  loadTasks();
  startAutoRefresh();
});

// 停止定时器
const stopAutoRefresh = () => {
  if (refreshInterval.value) {
    window.clearInterval(refreshInterval.value);
    refreshInterval.value = null;
  }
};

// 开始自动刷新
const startAutoRefresh = () => {
  stopAutoRefresh();
  if (autoRefresh.value) {
    refreshInterval.value = window.setInterval(() => {
      preserveSelectionLoadTasks();
    }, 5000);
  }
};

// 切换自动刷新
const toggleAutoRefresh = () => {
  autoRefresh.value = !autoRefresh.value;
  if (autoRefresh.value) {
    startAutoRefresh();
    ElMessage.success('已开启自动刷新');
  } else {
    stopAutoRefresh();
    ElMessage.success('已关闭自动刷新');
  }
};

// 加载任务列表
const loadTasks = async () => {
  await store.fetchAllTasks();
};

// 保留选中数据的任务列表加载
const preserveSelectionLoadTasks = async () => {
  // 保存当前选中的任务ID
  const selectedTaskIds = multipleSelection.value.map(task => task.id);
  
  // 获取最新任务列表
  await store.fetchAllTasks();
  
  // 如果没有选中的项，直接返回
  if (selectedTaskIds.length === 0) return;
  
  // 等待DOM更新
  await nextTick();
  
  // 恢复选中状态 - 使用更可靠的ref引用
  [processingTable.value, completedTable.value, failedTable.value].forEach(table => {
    if (!table) return;
    
    // 获取表格数据并恢复选中
    const tableData = table.data;
    if (tableData && tableData.length > 0) {
      tableData.forEach((row: TranslationTask) => {
        if (selectedTaskIds.includes(row.id)) {
          table.toggleRowSelection(row, true);
        }
      });
    }
  });
};

// 删除任务
const handleDelete = async (taskId: string) => {
  try {
    await ElMessageBox.confirm(
      '确定要删除此任务吗？删除后将无法恢复。',
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    );
    
    await store.deleteTask(taskId);
    ElMessage.success('删除成功');
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败');
    }
  }
};

// 批量删除任务
const handleBatchDelete = async () => {
  if (multipleSelection.value.length === 0) {
    ElMessage.warning('请至少选择一个任务');
    return;
  }

  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${multipleSelection.value.length} 个任务吗？删除后将无法恢复。`,
      '批量删除确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    );

    const taskIds = multipleSelection.value.map(task => task.id);
    await store.batchDeleteTasks(taskIds);
    ElMessage.success('批量删除成功');
    multipleSelection.value = [];
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('批量删除失败');
    }
  }
};

// 下载翻译结果
const handleDownload = (task: TranslationTask) => {
  if (task.status === 'completed') {
    store.downloadTranslation(task.id);
  } else {
    ElMessage.warning('翻译结果尚未准备好');
  }
};

// 批量下载选中的翻译结果
const handleBatchDownload = () => {
  if (multipleSelection.value.length === 0) {
    ElMessage.warning('请至少选择一个已完成的任务');
    return;
  }

  const completedTasks = multipleSelection.value.filter(task => task.status === 'completed');
  
  if (completedTasks.length === 0) {
    ElMessage.warning('选中的任务中没有已完成的任务');
    return;
  }

  const taskIds = completedTasks.map(task => task.id);
  store.downloadBatchResults(taskIds);
};

// 表格选择变化
const handleSelectionChange = (selection: TranslationTask[]) => {
  multipleSelection.value = selection;
};

// 任务状态颜色映射
const statusColorMap = {
  'pending': 'info',
  'processing': 'warning',
  'completed': 'success',
  'failed': 'danger'
} as const;

// 任务状态文本映射
const statusTextMap = {
  'pending': '等待中',
  'processing': '处理中',
  'completed': '已完成',
  'failed': '失败'
} as const;

// 格式化文件大小
const formatFileSize = (size: number) => {
  if (size < 1024) {
    return size + ' B';
  } else if (size < 1024 * 1024) {
    return (size / 1024).toFixed(2) + ' KB';
  } else {
    return (size / (1024 * 1024)).toFixed(2) + ' MB';
  }
};

// 格式化日期
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleString();
};

// 在处理中的任务
const processingTasks = computed(() => {
  return store.tasks.filter(task => task.status === 'processing' || task.status === 'pending');
});

// 已完成的任务
const completedTasks = computed(() => {
  return store.tasks.filter(task => task.status === 'completed');
});

// 失败的任务
const failedTasks = computed(() => {
  return store.tasks.filter(task => task.status === 'failed');
});

// 刷新任务列表
const refreshTasks = async () => {
  try {
    await preserveSelectionLoadTasks();
    ElMessage.success('任务列表已更新');
  } catch (error) {
    ElMessage.error('获取任务列表失败');
  }
}

// 重新翻译任务
const handleRetry = async (taskId: string) => {
  try {
    await ElMessageBox.confirm(
      '确定要重新翻译此任务吗？如果已经有翻译结果，将会被删除。',
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    );
    
    await store.retryTranslation(taskId);
    ElMessage.success('任务已加入重新翻译队列');
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('重新翻译失败');
    }
  }
};
</script>

<template>
  <div class="tasks-container">
    <div class="section-title">
      <h2>任务管理</h2>
      
      <div class="header-actions">
        <el-button type="primary" @click="refreshTasks" icon="Refresh">
          刷新
        </el-button>
        <!-- <el-switch
          v-model="autoRefresh"
          @change="toggleAutoRefresh"
          active-text="自动刷新"
          inactive-text="手动刷新"
          class="refresh-switch"
        /> -->
      </div>
    </div>
    
    <el-card class="card-container" shadow="hover">
      <el-tabs type="border-card" class="tasks-tabs">
        <el-tab-pane :label="`进行中 (${processingTasks.length})`">
          <div class="table-toolbar" v-if="processingTasks.length > 0">
            <div class="batch-actions">
              <el-button 
                type="danger" 
                size="small" 
                icon="Delete" 
                :disabled="!hasSelection"
                @click="handleBatchDelete"
              >
                批量删除
              </el-button>
            </div>
          </div>
          
          <el-empty v-if="processingTasks.length === 0" description="暂无进行中的任务" />
          
          <el-table 
            v-else 
            ref="processingTable"
            :data="processingTasks"
            style="width: 100%"
            border
            stripe
            max-height="500"
            @selection-change="handleSelectionChange"
          >
            <el-table-column type="selection" width="55" />
            
            <el-table-column label="任务ID" width="240" show-overflow-tooltip>
              <template #default="{ row }">
                <el-tooltip :content="row.id" placement="top">
                  <span>{{ row.id.substring(0, 16) }}...</span>
                </el-tooltip>
              </template>
            </el-table-column>
            
            <el-table-column label="文件名" min-width="200">
              <template #default="{ row }">
                {{ row.fileInfo.originalname }}
              </template>
            </el-table-column>
            
            <el-table-column label="大小" width="100">
              <template #default="{ row }">
                {{ formatFileSize(row.fileInfo.size) }}
              </template>
            </el-table-column>
            
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="statusColorMap[row.status as keyof typeof statusColorMap]">
                  {{ statusTextMap[row.status as keyof typeof statusTextMap] }}
                </el-tag>
              </template>
            </el-table-column>
            
            <el-table-column label="进度" width="200">
              <template #default="{ row }">
                <el-progress :percentage="row.progress" :status="row.status === 'failed' ? 'exception' : undefined" />
              </template>
            </el-table-column>
            
            <el-table-column label="创建时间" width="180">
              <template #default="{ row }">
                {{ formatDate(row.createdAt) }}
              </template>
            </el-table-column>
            
            <el-table-column label="操作" width="100" fixed="right">
              <template #default="{ row }">
                <el-button 
                  type="danger" 
                  size="small" 
                  @click="handleDelete(row.id)"
                  icon="Delete"
                >
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
        
        <el-tab-pane :label="`已完成 (${completedTasks.length})`">
          <div class="table-toolbar" v-if="completedTasks.length > 0">
            <div class="batch-actions">
              <el-button 
                type="primary" 
                size="small" 
                icon="Download" 
                :disabled="!hasSelection"
                @click="handleBatchDownload"
              >
                批量下载
              </el-button>
              <el-button 
                type="danger" 
                size="small" 
                icon="Delete" 
                :disabled="!hasSelection"
                @click="handleBatchDelete"
              >
                批量删除
              </el-button>
            </div>
          </div>
          
          <el-empty v-if="completedTasks.length === 0" description="暂无已完成的任务" />
          
          <el-table 
            v-else 
            ref="completedTable"
            :data="completedTasks"
            style="width: 100%"
            border
            stripe
            max-height="500"
            @selection-change="handleSelectionChange"
          >
            <el-table-column type="selection" width="55" />
            
            <el-table-column label="任务ID" width="240" show-overflow-tooltip>
              <template #default="{ row }">
                <el-tooltip :content="row.id" placement="top">
                  <span>{{ row.id.substring(0, 16) }}...</span>
                </el-tooltip>
              </template>
            </el-table-column>
            
            <el-table-column label="文件名" min-width="200">
              <template #default="{ row }">
                {{ row.fileInfo.originalname }}
              </template>
            </el-table-column>
            
            <el-table-column label="大小" width="100">
              <template #default="{ row }">
                {{ formatFileSize(row.fileInfo.size) }}
              </template>
            </el-table-column>
            
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="statusColorMap[row.status as keyof typeof statusColorMap]">
                  {{ statusTextMap[row.status as keyof typeof statusTextMap] }}
                </el-tag>
              </template>
            </el-table-column>
            
            <el-table-column label="完成时间" width="180">
              <template #default="{ row }">
                {{ formatDate(row.updatedAt) }}
              </template>
            </el-table-column>
            
            <el-table-column label="操作" width="270" fixed="right">
              <template #default="{ row }">
                <el-button 
                  type="primary" 
                  size="small" 
                  @click="handleDownload(row)"
                  icon="Download"
                >
                  下载
                </el-button>
                <el-button 
                  type="warning" 
                  size="small" 
                  @click="handleRetry(row.id)"
                  icon="Refresh"
                >
                  重新翻译
                </el-button>
                <el-button 
                  type="danger" 
                  size="small" 
                  @click="handleDelete(row.id)"
                  icon="Delete"
                >
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
        
        <el-tab-pane :label="`失败 (${failedTasks.length})`">
          <div class="table-toolbar" v-if="failedTasks.length > 0">
            <div class="batch-actions">
              <el-button 
                type="danger" 
                size="small" 
                icon="Delete" 
                :disabled="!hasSelection"
                @click="handleBatchDelete"
              >
                批量删除
              </el-button>
            </div>
          </div>
          
          <el-empty v-if="failedTasks.length === 0" description="暂无失败的任务" />
          
          <el-table 
            v-else 
            ref="failedTable"
            :data="failedTasks"
            style="width: 100%"
            border
            stripe
            max-height="500"
            @selection-change="handleSelectionChange"
          >
            <el-table-column type="selection" width="55" />
            
            <el-table-column label="任务ID" width="240" show-overflow-tooltip>
              <template #default="{ row }">
                <el-tooltip :content="row.id" placement="top">
                  <span>{{ row.id.substring(0, 16) }}...</span>
                </el-tooltip>
              </template>
            </el-table-column>
            
            <el-table-column label="文件名" min-width="200">
              <template #default="{ row }">
                {{ row.fileInfo.originalname }}
              </template>
            </el-table-column>
            
            <el-table-column label="大小" width="100">
              <template #default="{ row }">
                {{ formatFileSize(row.fileInfo.size) }}
              </template>
            </el-table-column>
            
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="statusColorMap[row.status as keyof typeof statusColorMap]">
                  {{ statusTextMap[row.status as keyof typeof statusTextMap] }}
                </el-tag>
              </template>
            </el-table-column>
            
            <el-table-column label="错误信息" min-width="200">
              <template #default="{ row }">
                <HtmlTooltip :content="row.error || '未知错误'"/>
                <!-- <el-tooltip :content="row.error || '未知错误'" placement="top">
                  {{ row.error || '未知错误' }}
                </el-tooltip> -->
              </template>
            </el-table-column>
            
            <el-table-column label="操作" width="190" fixed="right">
              <template #default="{ row }">
                <el-button 
                  type="warning" 
                  size="small" 
                  @click="handleRetry(row.id)"
                  icon="Refresh"
                >
                  重新翻译
                </el-button>
                <el-button 
                  type="danger" 
                  size="small" 
                  @click="handleDelete(row.id)"
                  icon="Delete"
                >
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<style scoped>
.tasks-container {
  padding: 20px 0;
}

.section-title {
  margin-bottom: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section-title h2 {
  margin: 0;
  font-size: 1.5rem;
  color: #303133;
  font-weight: 600;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.refresh-switch {
  width: 140px;
}

.card-container {
  margin-bottom: 20px;
}

.el-tag {
  font-weight: 500;
  min-width: 70px;
  text-align: center;
}

.table-toolbar {
  margin-bottom: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.batch-actions {
  display: flex;
  gap: 8px;
}

:deep(.el-tabs__content) {
  padding: 16px;
}

:deep(.el-tabs) {
  box-shadow: none;
}

:deep(.el-table .el-table__cell) {
  padding: 8px 0;
}
</style> 
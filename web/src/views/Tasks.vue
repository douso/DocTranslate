<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { ElMessageBox, ElMessage } from 'element-plus';
import { Delete, Download } from '@element-plus/icons-vue';
import { useTranslationStore } from '../stores/translation';
import type { TranslationTask, TaskStatus } from '../types';

const store = useTranslationStore();
const refreshInterval = ref<number | null>(null);
const expandedRows = ref<string[]>([]);

// 自动刷新开关
const autoRefresh = ref(true);

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
      loadTasks();
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

// 下载翻译结果
const handleDownload = (task: TranslationTask) => {
  if (task.status === 'completed') {
    store.downloadTranslation(task.id);
  } else {
    ElMessage.warning('翻译结果尚未准备好');
  }
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
    await store.fetchAllTasks();
    ElMessage.success('任务列表已更新');
  } catch (error) {
    ElMessage.error('获取任务列表失败');
  }
}
</script>

<template>
  <div class="tasks-container">
    <div class="section-title">
      <h1>任务管理</h1>
      
      <div class="header-actions">
        <el-button type="primary" @click="refreshTasks" icon="Refresh">
          刷新
        </el-button>
        <el-switch
          v-model="autoRefresh"
          @change="toggleAutoRefresh"
          active-text="自动刷新"
          inactive-text="手动刷新"
          class="refresh-switch"
        />
      </div>
    </div>
    
    <el-card class="card-container">
      <el-tabs type="border-card" class="tasks-tabs">
        <el-tab-pane :label="`进行中 (${processingTasks.length})`">
          <el-empty v-if="processingTasks.length === 0" description="暂无进行中的任务" />
          
          <el-table 
            v-else 
            :data="processingTasks"
            style="width: 100%"
            border
            stripe
            max-height="500"
          >
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
          <el-empty v-if="completedTasks.length === 0" description="暂无已完成的任务" />
          
          <el-table 
            v-else 
            :data="completedTasks"
            style="width: 100%"
            border
            stripe
            max-height="500"
          >
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
            
            <el-table-column label="操作" width="180" fixed="right">
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
          <el-empty v-if="failedTasks.length === 0" description="暂无失败的任务" />
          
          <el-table 
            v-else 
            :data="failedTasks"
            style="width: 100%"
            border
            stripe
            max-height="500"
          >
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
            
            <el-table-column label="错误信息" min-width="200" show-overflow-tooltip>
              <template #default="{ row }">
                <el-tooltip :content="row.error || '未知错误'" placement="top">
                  {{ row.error || '未知错误' }}
                </el-tooltip>
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

.section-title h1 {
  margin: 0;
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
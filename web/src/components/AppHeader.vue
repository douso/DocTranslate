<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useTranslationStore } from '../stores/translation';
import { ElMessage } from 'element-plus';
import { Document, Upload, SuccessFilled, CircleCloseFilled, Clock } from '@element-plus/icons-vue';

const router = useRouter();
const route = useRoute();
const store = useTranslationStore();
const activeIndex = ref('home');

// 监听路由变化
watch(() => route.path, (newPath) => {
  if (newPath === '/') activeIndex.value = 'home';
  else if (newPath === '/batch') activeIndex.value = 'batch';
});

onMounted(() => {
  // 初始化当前激活的导航项
  const path = route.path;
  if (path === '/') activeIndex.value = 'home';
  else if (path === '/batch') activeIndex.value = 'batch';
  
  // 加载任务列表
  store.fetchAllTasks();
});

const handleSelect = (key: string) => {
  switch (key) {
    case 'home':
      router.push('/');
      break;
    case 'batch':
      router.push('/batch');
      break;
    case 'tasks':
      router.push('/tasks');
      break;
  }
};
</script>

<template>
  <header class="app-header">
    <div class="container">
      <div class="header-content">
        <div class="logo">
          <h1>文档AI翻译工具</h1>
        </div>
        
        <div class="nav-container">
          <el-menu
            :default-active="activeIndex"
            class="nav-menu"
            mode="horizontal"
            @select="handleSelect"
            background-color="#ffffff"
            text-color="#303133"
            active-text-color="#409EFF"
            :ellipsis="false"
          >
            <el-menu-item index="home">
              <el-icon><Document /></el-icon>
              首页
            </el-menu-item>
            <el-menu-item index="batch">
              <el-icon><Upload /></el-icon>
              批量翻译
            </el-menu-item>
            <el-menu-item index="tasks">
              <el-icon><Document /></el-icon>
              任务管理
            </el-menu-item>
          </el-menu>
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  background-color: #fff;
  border-bottom: 1px solid #ebeef5;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
  padding: 0;
  position: sticky;
  top: 0;
  z-index: 1000;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 64px;
}

.logo {
  display: flex;
  align-items: center;
}

.logo h1 {
  font-size: 1.5rem;
  font-weight: 500;
  color: #303133;
  margin: 0;
}

.nav-container {
  display: flex;
  align-items: center;
}

.nav-menu {
  border-bottom: none;
  margin-right: 0;
}
</style> 
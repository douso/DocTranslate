<script setup lang="ts">
import { RouterView } from 'vue-router'
import AppHeader from './components/AppHeader.vue'
</script>

<template>
  <div class="app-container">
    <AppHeader />
    <main class="main-content">
      <div class="container">
        <RouterView />
      </div>
    </main>
    <footer class="app-footer">
      <div class="container">
        <p>© 2023 文档AI翻译工具 | 基于OpenAI API</p>
      </div>
    </footer>
  </div>
</template>

<style>
.app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: #f5f7fa;
}

.main-content {
  flex: 1;
  padding: 20px 0;
}

.app-footer {
  text-align: center;
  padding: 16px 0;
  background-color: #fff;
  color: #606266;
  font-size: 14px;
  border-top: 1px solid #ebeef5;
}
</style>

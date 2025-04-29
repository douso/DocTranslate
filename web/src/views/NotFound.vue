<script setup lang="ts">
import { useRouter } from 'vue-router';

const router = useRouter();

const goHome = () => {
  router.push('/');
};
</script>

<template>
  <div class="not-found">
    <h1>404</h1>
    <h2>页面未找到</h2>
    <p>抱歉，您访问的页面不存在或已被移除。</p>
    <el-button type="primary" @click="goHome">返回首页</el-button>
  </div>
</template>

<style scoped>
.not-found {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 70vh;
  text-align: center;
}

h1 {
  font-size: 6rem;
  color: #909399;
  margin: 0;
}

h2 {
  font-size: 2rem;
  color: #606266;
  margin: 10px 0;
}

p {
  color: #909399;
  margin-bottom: 20px;
}
</style>
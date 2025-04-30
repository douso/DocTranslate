import { createRouter, createWebHashHistory } from 'vue-router';

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/Home.vue'),
    meta: {
      title: '首页 - 文档翻译工具'
    }
  },
  {
    path: '/batch',
    name: 'Batch',
    component: () => import('../views/Batch.vue'),
    meta: {
      title: '批量翻译 - 文档翻译工具'
    }
  },
  {
    path: '/tasks',
    name: 'Tasks',
    component: () => import('../views/Tasks.vue'),
    meta: {
      title: '任务管理 - 文档翻译工具'
    }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('../views/NotFound.vue'),
    meta: {
      title: '页面未找到 - 文档翻译工具'
    }
  }
];

const router = createRouter({
  history: createWebHashHistory(),
  routes
});

// 设置页面标题
router.beforeEach((to, from, next) => {
  document.title = to.meta.title as string || '文档翻译工具';
  next();
});

export default router; 
// 模块声明
declare module 'vue-office/docx';
declare module 'vue-office/excel';
declare module 'vue-office/pdf';
declare module 'vditor';
declare module 'papaparse';
declare module 'json-viewer-vue3';
declare module 'subtitle.js';

// 允许导入Vue组件
declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<{}, {}, any>;
  export default component;
} 
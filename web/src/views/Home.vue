<script setup lang="ts">
import { useRouter } from 'vue-router';
import { Document, Files, View, Download, Loading, RefreshRight } from '@element-plus/icons-vue';

const router = useRouter();

const navigateToBatch = () => {
  router.push('/batch');
};

const navigateToTasks = () => {
  router.push('/tasks');
};
</script>

<template>
  <div class="home-container">
    <section class="hero">
      <h1>文档AI翻译工具</h1>
      <p class="subtitle">利用AI技术实现高质量的文档翻译</p>
      
      <div class="action-buttons">
        <el-button type="primary" size="large" @click="navigateToBatch">
          <el-icon class="el-icon-left"><Files /></el-icon>开始批量翻译
        </el-button>
        <el-button size="large" @click="navigateToTasks">
          <el-icon class="el-icon-left"><View /></el-icon>查看任务管理
        </el-button>
      </div>
    </section>
    
    <section class="supported-formats">
      <h2>支持的文件格式</h2>
      <div class="format-list">
        <div class="format-item">
          <div class="format-icon txt">TXT</div>
          <div class="format-name">文本文件</div>
        </div>
        <div class="format-item">
          <div class="format-icon md">MD</div>
          <div class="format-name">Markdown</div>
        </div>
        <div class="format-item">
          <div class="format-icon docx">DOCX</div>
          <div class="format-name">Word文档</div>
        </div>
        <div class="format-item">
          <div class="format-icon csv">CSV</div>
          <div class="format-name">CSV表格</div>
        </div>
        <div class="format-item">
          <div class="format-icon xlsx">XLSX</div>
          <div class="format-name">Excel表格</div>
        </div>
        <div class="format-item">
          <div class="format-icon pdf">PDF</div>
          <div class="format-name">PDF文档</div>
        </div>
        <div class="format-item">
          <div class="format-icon srt">SRT</div>
          <div class="format-name">字幕文件</div>
        </div>
        <div class="format-item">
          <div class="format-icon json">JSON</div>
          <div class="format-name">JSON文件</div>
        </div>
      </div>
    </section>
    
    <section class="features">
      <h2>功能特点</h2>
      
      <div class="feature-grid">
        <div class="feature-card">
          <el-icon><Document /></el-icon>
          <h3>多种文件格式</h3>
          <p>支持TXT、Markdown、Word、CSV、Excel、PDF、SRT和JSON等多种格式</p>
        </div>
        
        <div class="feature-card">
          <el-icon><Files /></el-icon>
          <h3>批量处理</h3>
          <p>支持多个文件同时上传处理，提高工作效率</p>
        </div>
        
        <div class="feature-card">
          <el-icon><View /></el-icon>
          <h3>任务管理</h3>
          <p>可查看所有翻译任务的进度和状态，方便管理</p>
        </div>
        
        <div class="feature-card">
          <el-icon><Download /></el-icon>
          <h3>导出结果</h3>
          <p>翻译完成后支持下载翻译结果，保留原始格式</p>
        </div>
        
        <div class="feature-card">
          <el-icon><Loading /></el-icon>
          <h3>并行处理</h3>
          <p>多任务并行处理，提高翻译效率</p>
        </div>
        
        <div class="feature-card">
          <el-icon><RefreshRight /></el-icon>
          <h3>失败重试</h3>
          <p>自动重试失败任务，保证翻译完成</p>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.home-container {
  padding: 20px 0;
}

.hero {
  text-align: center;
  padding: 60px 20px;
  background-color: #fff;
  border-radius: 8px;
  margin-bottom: 40px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
}

.hero h1 {
  font-size: 2.5rem;
  margin-bottom: 16px;
  color: #303133;
}

.subtitle {
  font-size: 1.25rem;
  color: #606266;
  margin-bottom: 30px;
}

.action-buttons {
  display: flex;
  justify-content: center;
  gap: 16px;
}

.el-icon-left {
  margin-right: 5px;
}

.supported-formats {
  background-color: #fff;
  padding: 40px 20px;
  border-radius: 8px;
  margin-bottom: 40px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
}

.supported-formats h2 {
  text-align: center;
  margin-bottom: 30px;
  font-size: 1.75rem;
  color: #303133;
}

.format-list {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 30px;
}

.format-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 110px;
}

.format-icon {
  width: 70px;
  height: 70px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  color: white;
  margin-bottom: 10px;
  font-size: 18px;
}

.format-icon.txt { background-color: #409EFF; }
.format-icon.md { background-color: #67C23A; }
.format-icon.docx { background-color: #2b5797; }
.format-icon.csv { background-color: #E6A23C; }
.format-icon.xlsx { background-color: #1d6f42; }
.format-icon.pdf { background-color: #F56C6C; }
.format-icon.srt { background-color: #909399; }
.format-icon.json { background-color: #9C27B0; }

.format-name {
  font-size: 14px;
  color: #606266;
}

.features {
  background-color: #fff;
  padding: 40px 20px;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
}

.features h2 {
  text-align: center;
  margin-bottom: 40px;
  font-size: 1.75rem;
  color: #303133;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 30px;
}

.feature-card {
  padding: 30px;
  border-radius: 8px;
  background-color: #f9fafc;
  border: 1px solid #ebeef5;
  transition: transform 0.3s, box-shadow 0.3s;
  text-align: center;
}

.feature-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 4px 16px 0 rgba(0, 0, 0, 0.1);
}

.feature-card .el-icon {
  font-size: 2.5rem;
  color: #409EFF;
  margin-bottom: 16px;
}

.feature-card h3 {
  font-size: 1.25rem;
  margin-bottom: 12px;
  color: #303133;
}

.feature-card p {
  color: #606266;
  line-height: 1.5;
}
</style> 
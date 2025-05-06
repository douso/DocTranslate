<template>
  <div class="subtitle-preview-container">
    <div v-if="loading" class="loading-container">
      <el-icon class="loading"><Loading /></el-icon>
      <span>正在加载字幕...</span>
    </div>
    <div v-if="error" class="error-container">
      <el-icon><WarningFilled /></el-icon>
      <span>{{ error }}</span>
    </div>
    <div v-if="!loading && !error" class="subtitle-content">
      <div class="subtitle-toolbar" v-if="subtitleData.length > 0 && hasMultipleLanguages">
        <el-select v-model="selectedLang" placeholder="选择语言">
          <el-option
            v-for="(lang, index) in languages"
            :key="index"
            :label="lang || '默认'"
            :value="lang"
          />
        </el-select>
      </div>
      <div class="subtitle-list">
        <div
          v-for="(cue, index) in filteredCues"
          :key="index"
          class="subtitle-item"
        >
          <div class="subtitle-index">#{{ cue.index }}</div>
          <div class="subtitle-time">{{ formatTime(cue.start) }} → {{ formatTime(cue.end) }}</div>
          <div class="subtitle-text">{{ cue.text }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { ElMessage, ElSelect, ElOption, ElScrollbar } from 'element-plus';
import { Loading, WarningFilled } from '@element-plus/icons-vue';
import axios from 'axios';

interface SubtitleCue {
  index: number;
  start: number;
  end: number;
  text: string;
  language?: string;
}

const props = defineProps({
  fileUrl: {
    type: String,
    required: true
  }
});

const loading = ref(true);
const error = ref('');
const subtitleData = ref<SubtitleCue[]>([]);
const selectedLang = ref<string>('');
const languages = ref<string[]>([]);

const hasMultipleLanguages = computed(() => {
  return languages.value.length > 1;
});

const filteredCues = computed(() => {
  if (!selectedLang.value || !hasMultipleLanguages.value) {
    return subtitleData.value;
  }
  return subtitleData.value.filter(cue => cue.language === selectedLang.value);
});

const formatTime = (timeInSeconds: number): string => {
  const hours = Math.floor(timeInSeconds / 3600);
  const minutes = Math.floor((timeInSeconds % 3600) / 60);
  const seconds = Math.floor(timeInSeconds % 60);
  const milliseconds = Math.floor((timeInSeconds % 1) * 1000);
  
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')},${String(milliseconds).padStart(3, '0')}`;
};

const parseTimeString = (timeStr: string): number => {
  // 处理 SRT 格式的时间字符串: 00:00:00,000 或 VTT 格式: 00:00:00.000
  const timeParts = timeStr.replace(',', '.').split(':');
  
  const hours = parseInt(timeParts[0]) || 0;
  const minutes = parseInt(timeParts[1]) || 0;
  
  // 处理秒和毫秒
  const secParts = timeParts[2].split('.');
  const seconds = parseInt(secParts[0]) || 0;
  const milliseconds = parseInt(secParts[1]) || 0;
  
  return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
};

const parseSRT = (content: string): SubtitleCue[] => {
  const result: SubtitleCue[] = [];
  // 将内容按字幕块分割
  const blocks = content.trim().split(/\r?\n\r?\n/);
  
  for (const block of blocks) {
    const lines = block.split(/\r?\n/);
    if (lines.length < 3) continue; // 忽略不完整的字幕块
    
    // 第一行是序号
    const indexNumber = parseInt(lines[0].trim()) || result.length + 1;
    
    // 第二行是时间，其余行是文本
    const timeMatch = lines[1].match(/(\d{2}:\d{2}:\d{2}[,\.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,\.]\d{3})/);
    if (!timeMatch) continue;
    
    const startTime = parseTimeString(timeMatch[1]);
    const endTime = parseTimeString(timeMatch[2]);
    const text = lines.slice(2).join('\n');
    
    result.push({
      index: indexNumber,
      start: startTime,
      end: endTime,
      text
    });
  }
  
  return result;
};

const parseVTT = (content: string): SubtitleCue[] => {
  const result: SubtitleCue[] = [];
  // 删除WEBVTT头部
  const cleanContent = content.replace(/^WEBVTT.*?(\r?\n\r?\n)/is, '');
  // 按块分割
  const blocks = cleanContent.trim().split(/\r?\n\r?\n/);
  
  let currentIndex = 1;
  
  for (const block of blocks) {
    const lines = block.split(/\r?\n/);
    if (lines.length < 2) continue;
    
    let startIndex = 0;
    let indexNumber = currentIndex;
    
    // 检查第一行是否为索引编号
    if (lines[0].match(/^\d+$/)) {
      indexNumber = parseInt(lines[0].trim());
      startIndex = 1;
    } else if (lines[0].startsWith('NOTE')) {
      // 跳过注释块
      continue;
    }
    
    // 查找时间行
    const timeMatch = lines[startIndex].match(/(\d{2}:\d{2}:\d{2}[,\.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,\.]\d{3})/);
    if (!timeMatch) continue;
    
    const startTime = parseTimeString(timeMatch[1]);
    const endTime = parseTimeString(timeMatch[2]);
    
    // 检查是否有语言标记
    let language = undefined;
    const langMatch = lines[startIndex].match(/lang:(\w+)/);
    if (langMatch) {
      language = langMatch[1];
    }
    
    // 合并剩余行为文本
    const text = lines.slice(startIndex + 1).join('\n');
    
    result.push({
      index: indexNumber,
      start: startTime,
      end: endTime,
      text,
      language
    });
    
    currentIndex++;
  }
  
  return result;
};

const fetchSubtitleContent = async () => {
  try {
    const response = await axios.get(props.fileUrl, { responseType: 'text' });
    return response.data;
  } catch (err: any) {
    throw new Error(err.message || '获取字幕内容失败');
  }
};

const parseSubtitle = async (content: string, fileExtension: string) => {
  try {
    let parsedData: SubtitleCue[] = [];
    
    // 根据文件扩展名使用不同的解析方法
    console.log('解析字幕格式:', fileExtension);
    if (fileExtension === 'srt') {
      parsedData = parseSRT(content);
    } else if (fileExtension === 'vtt') {
      parsedData = parseVTT(content);
    } else {
      throw new Error(`不支持的字幕格式: ${fileExtension}`);
    }
    
    console.log('解析结果:', parsedData.length, '条字幕');
    
    // 提取语言信息（如果有）
    const langs = new Set<string>();
    parsedData.forEach(cue => {
      if (cue.language) {
        langs.add(cue.language);
      }
    });
    
    languages.value = Array.from(langs);
    if (languages.value.length > 0) {
      selectedLang.value = languages.value[0];
    }
    
    return parsedData;
  } catch (error: any) {
    throw new Error(`字幕解析失败: ${error.message}`);
  }
};

onMounted(async () => {
  try {
    loading.value = true;
    
    // 从URL中提取文件扩展名
    const fileExtension = props.fileUrl.split('.').pop()?.toLowerCase() || '';
    
    // 检查是否支持的字幕格式
    if (!['srt', 'vtt'].includes(fileExtension)) {
      throw new Error(`不支持的字幕格式: ${fileExtension}`);
    }
    
    const subtitleContent = await fetchSubtitleContent();
    subtitleData.value = await parseSubtitle(subtitleContent, fileExtension);
    
    loading.value = false;
  } catch (err: any) {
    loading.value = false;
    error.value = err.message || '字幕预览失败';
    ElMessage.error(error.value);
  }
});
</script>

<style scoped>
.subtitle-preview-container {
  width: 100%;
  height: 100%;
  min-height: 500px;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  overflow: hidden;
}

.subtitle-content {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.subtitle-toolbar {
  padding: 10px;
  border-bottom: 1px solid #ebeef5;
  display: flex;
  justify-content: flex-end;
}

.subtitle-list {
  padding: 10px;
  max-height: calc(100vh - 100px);
  overflow-y: auto;
}

.subtitle-item {
  margin-bottom: 15px;
  padding: 10px;
  border-radius: 4px;
  background-color: #f8f8f8;
}

.subtitle-index {
  font-size: 12px;
  font-weight: bold;
  color: #409eff;
  margin-bottom: 5px;
}

.subtitle-time {
  font-size: 12px;
  color: #909399;
  margin-bottom: 5px;
}

.subtitle-text {
  font-size: 14px;
  line-height: 1.5;
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
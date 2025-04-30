import { getFingerprint } from "@/utils/fingerprint"
import axios from "axios"

const API_BASE_URL = import.meta.env.VITE_API_URL+'/api';

let fingerprint = '';
(async () => {
  // 获取浏览器指纹ID
  fingerprint = await getFingerprint()
})()

// 创建axios实例
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 添加请求拦截器，注入浏览器指纹ID
api.interceptors.request.use(async (config) => {
    // 将指纹ID添加到请求头中
    config.headers['X-Browser-Fingerprint'] = fingerprint
    
    return config
  }, (error) => {
    return Promise.reject(error)
  })

// 错误处理
api.interceptors.response.use(
  response => response,
  error => {
    const errorMessage = error.response?.data?.message || error.message || '请求出错';
    console.error('API请求错误:', errorMessage);
    return Promise.reject(error);
  }
);

export default api;
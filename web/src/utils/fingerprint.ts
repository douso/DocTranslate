/**
 * 生成随机UUID
 * 简易实现，不依赖第三方库
 */
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

/**
 * 生成浏览器指纹ID
 * 使用localStorage存储生成的ID
 */
export const generateFingerprint = async (): Promise<string> => {
  // 检查本地存储中是否已存在指纹ID
  const existingFingerprint = localStorage.getItem('browser_fingerprint');
  
  if (existingFingerprint) {
    return existingFingerprint;
  }
  
  // 创建随机信息的字符串来作为指纹
  const navigatorInfo = [
    navigator.userAgent,
    navigator.language,
    new Date().getTimezoneOffset(),
    screen.width,
    screen.height,
    screen.colorDepth
  ].join('-');
  
  // 生成随机指纹ID，结合导航器信息
  const newFingerprint = generateUUID() + '-' + Math.random().toString(36).substring(2, 10);
  
  // 存储到localStorage中
  localStorage.setItem('browser_fingerprint', newFingerprint);
  
  return newFingerprint;
};

/**
 * 获取浏览器指纹ID
 * 如果不存在则生成一个新的
 */
export const getFingerprint = async (): Promise<string> => {
  return await generateFingerprint();
}; 
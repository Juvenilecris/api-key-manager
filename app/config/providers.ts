// app/config/providers.ts

export type ProviderConfig = {
  name: string;
  defaultUrl: string;
  type: 'openai' | 'gemini'; // 用于区分后端验证逻辑
  colorClass: string; // 预设一些颜色样式
};

export const PROVIDERS: Record<string, ProviderConfig> = {
  openai: { 
    name: 'OpenAI', 
    defaultUrl: 'https://api.openai.com/v1', 
    type: 'openai',
    colorClass: 'bg-green-50 text-green-600 border-green-100'
  },
  gemini: { 
    name: 'Google Gemini', 
    defaultUrl: 'https://generativelanguage.googleapis.com/v1beta', 
    type: 'gemini',
    colorClass: 'bg-blue-50 text-blue-600 border-blue-100'
  },
  deepseek: { 
    name: 'DeepSeek (深度求索)', 
    defaultUrl: 'https://api.deepseek.com', 
    type: 'openai',
    colorClass: 'bg-indigo-50 text-indigo-600 border-indigo-100'
  },
  aliyun: { 
    name: '阿里百炼 (DashScope)', 
    defaultUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', 
    type: 'openai',
    colorClass: 'bg-orange-50 text-orange-600 border-orange-100'
  },
  plato: { 
    name: '柏拉图 (Plato)', 
    defaultUrl: 'https://api.bltcy.ai/v1', 
    type: 'openai',
    colorClass: 'bg-purple-50 text-purple-600 border-purple-100'
  },
  other: { 
    name: '自定义 / 其他', 
    defaultUrl: '', 
    type: 'openai',
    colorClass: 'bg-gray-50 text-gray-600 border-gray-100'
  }
};
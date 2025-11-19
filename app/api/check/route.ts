import { NextResponse } from 'next/server';

// 定义不同厂商的测试端点
const PROVIDERS: any = {
  openai: {
    url: 'https://api.openai.com/v1/models',
    method: 'GET',
    headers: (key: string) => ({ 'Authorization': `Bearer ${key}` })
  },
  gemini: {
    // Gemini 需要将 key 放在 URL 参数中
    url: (key: string) => `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`,
    method: 'GET',
    headers: () => ({})
  },
  deepseek: {
    url: 'https://api.deepseek.com/models',
    method: 'GET',
    headers: (key: string) => ({ 'Authorization': `Bearer ${key}` })
  },
  aliyun: {
    // 阿里百炼 (DashScope) 兼容 OpenAI 格式，或者使用特定端点
    url: 'https://dashscope.aliyuncs.com/compatible-mode/v1/models',
    method: 'GET',
    headers: (key: string) => ({ 'Authorization': `Bearer ${key}` })
  }
};

export async function POST(request: Request) {
  try {
    const { provider, apiKey } = await request.json();
    
    if (!PROVIDERS[provider]) {
      return NextResponse.json({ success: false, message: '未知供应商' }, { status: 400 });
    }

    const config = PROVIDERS[provider];
    const url = typeof config.url === 'function' ? config.url(apiKey) : config.url;
    
    const response = await fetch(url, {
      method: config.method,
      headers: config.headers(apiKey),
    });

    if (response.ok) {
      return NextResponse.json({ success: true, status: response.status });
    } else {
      const errorText = await response.text();
      return NextResponse.json({ success: false, status: response.status, error: errorText });
    }

  } catch (error) {
    return NextResponse.json({ success: false, error: '服务器内部错误' }, { status: 500 });
  }
}
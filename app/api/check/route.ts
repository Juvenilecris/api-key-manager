import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { provider, apiKey, baseUrl } = await request.json();

    let fetchUrl = '';
    let fetchOptions: any = {};

    // 1. 处理 Google Gemini (特殊格式)
    if (provider === 'gemini') {
      // Gemini 通常不需要 BaseUrl，除非是反向代理。这里默认处理官方和代理情况
      const startUrl = baseUrl || 'https://generativelanguage.googleapis.com/v1beta';
      // 移除末尾斜杠
      const cleanBase = startUrl.replace(/\/$/, ''); 
      fetchUrl = `${cleanBase}/models?key=${apiKey}`;
      fetchOptions = { method: 'GET' };
    } 
    // 2. 处理 OpenAI 兼容接口 (OpenAI, DeepSeek, 阿里百炼, OneAPI 等)
    else {
      // 默认 Base URL 处理
      let cleanBase = baseUrl;
      if (!cleanBase) {
        if (provider === 'openai') cleanBase = 'https://api.openai.com/v1';
        else if (provider === 'deepseek') cleanBase = 'https://api.deepseek.com';
        else if (provider === 'aliyun') cleanBase = 'https://dashscope.aliyuncs.com/compatible-mode/v1';
        else cleanBase = 'https://api.openai.com/v1'; // 默认兜底
      }

      // 移除末尾斜杠，确保拼接正确
      cleanBase = cleanBase.replace(/\/$/, '');
      
      // 大多数兼容接口都支持 /models 端点来列出模型
      fetchUrl = `${cleanBase}/models`;
      
      fetchOptions = {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      };
    }

    // 发起请求
    // 设置超时，防止无效节点卡死 (5秒超时)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(fetchUrl, {
      ...fetchOptions,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      return NextResponse.json({ success: true, status: response.status });
    } else {
      // 尝试读取错误信息
      const errorText = await response.text().catch(() => 'Unknown Error');
      return NextResponse.json({ success: false, status: response.status, error: errorText });
    }

  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.name === 'AbortError' ? '请求超时 (Timeout)' : '连接失败 (Network Error)' 
    }, { status: 500 });
  }
}
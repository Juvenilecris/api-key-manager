// app/api/storage/route.ts
import { kv } from '@vercel/kv';
import { NextResponse } from 'next/server';

// 简单的安全验证，防止别人恶意调用接口
// 实际生产建议使用更严谨的 Auth，这里沿用你的简单密码逻辑
const AUTH_SECRET = '1006'; 

export async function GET(request: Request) {
  // 获取 Header 中的验证信息
  const auth = request.headers.get('x-auth-token');
  if (auth !== AUTH_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 从 Redis 获取数据，如果为空则返回空数组
    const keys = await kv.get('mac_api_keys');
    return NextResponse.json(keys || []);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = request.headers.get('x-auth-token');
  if (auth !== AUTH_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    // 将数据存入 Redis
    await kv.set('mac_api_keys', body);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save data' }, { status: 500 });
  }
}
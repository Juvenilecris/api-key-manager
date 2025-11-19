import { kv } from '@vercel/kv';
import { NextResponse } from 'next/server';

// 防止 Vercel 缓存此接口，确保每次都去数据库读最新数据
export const dynamic = 'force-dynamic';

const AUTH_SECRET = '1006'; 

export async function GET(request: Request) {
  const auth = request.headers.get('x-auth-token');
  if (auth !== AUTH_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 从 Redis 获取数据
    const keys = await kv.get('mac_api_keys');
    
    // --- 关键修复：严格检查数据类型 ---
    // 如果 keys 是 null, undefined, 或者不是数组，强制返回空数组 []
    if (!Array.isArray(keys)) {
      console.log("Database returned non-array data, returning empty array.");
      return NextResponse.json([]);
    }

    return NextResponse.json(keys);
  } catch (error) {
    console.error("KV Get Error:", error);
    // 即使出错，也返回空数组防止前端崩溃
    return NextResponse.json([], { status: 200 }); 
  }
}

export async function POST(request: Request) {
  const auth = request.headers.get('x-auth-token');
  if (auth !== AUTH_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    await kv.set('mac_api_keys', body);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("KV Save Error:", error);
    return NextResponse.json({ error: 'Failed to save data' }, { status: 500 });
  }
}
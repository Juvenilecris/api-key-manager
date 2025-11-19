import { kv } from '@vercel/kv';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const AUTH_SECRET = '1006'; 

// 定义允许存储的 Key 名称，防止滥用
const ALLOWED_KEYS = ['mac_api_keys', 'mac_providers'];

export async function GET(request: Request) {
  const auth = request.headers.get('x-auth-token');
  if (auth !== AUTH_SECRET) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const storageKey = searchParams.get('key') || 'mac_api_keys'; // 默认为 keys

  if (!ALLOWED_KEYS.includes(storageKey)) {
    return NextResponse.json([], { status: 400 });
  }

  try {
    const data = await kv.get(storageKey);
    // 确保返回数组
    if (!Array.isArray(data)) return NextResponse.json([]);
    return NextResponse.json(data);
  } catch (error) {
    console.error(`KV Get Error (${storageKey}):`, error);
    return NextResponse.json([], { status: 200 }); 
  }
}

export async function POST(request: Request) {
  const auth = request.headers.get('x-auth-token');
  if (auth !== AUTH_SECRET) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { key, data } = await request.json();

    if (!ALLOWED_KEYS.includes(key)) {
      return NextResponse.json({ error: 'Invalid storage key' }, { status: 400 });
    }

    await kv.set(key, data);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("KV Save Error:", error);
    return NextResponse.json({ error: 'Failed to save data' }, { status: 500 });
  }
}
'use client';

import React, { useState, useEffect } from 'react';
import { Trash2, Plus, CheckCircle, XCircle, Eye, EyeOff, Activity, Lock } from 'lucide-react';

// 类型定义
type ApiKeyData = {
  id: string;
  name: string;
  provider: 'openai' | 'gemini' | 'deepseek' | 'aliyun';
  key: string;
  status: 'unknown' | 'valid' | 'invalid';
  lastChecked: string;
};

export default function ApiKeyManager() {
  // --- 状态管理 ---
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [keys, setKeys] = useState<ApiKeyData[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  
  // 新增 Key 的表单状态
  const [newKeyForm, setNewKeyForm] = useState({ name: '', provider: 'openai', key: '' });
  const [checkingId, setCheckingId] = useState<string | null>(null);

  // --- 初始化 ---
  useEffect(() => {
    // 检查本地登录状态（简单演示用 sessionStorage）
    const session = sessionStorage.getItem('auth_token');
    if (session === 'nnwang-token-1006') setIsLoggedIn(true);

    // 加载保存的 Keys
    const savedKeys = localStorage.getItem('my_api_keys');
    if (savedKeys) setKeys(JSON.parse(savedKeys));
  }, []);

  // --- 登录逻辑 ---
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // 这里使用硬编码校验，实际生产建议使用 Server Action + Environment Variables
    if (username === 'nnwang' && password === '1006') {
      sessionStorage.setItem('auth_token', 'nnwang-token-1006');
      setIsLoggedIn(true);
    } else {
      alert('账号或密码错误');
    }
  };

  // --- Key 管理逻辑 ---
  const addKey = () => {
    if (!newKeyForm.name || !newKeyForm.key) return;
    const newKey: ApiKeyData = {
      id: Date.now().toString(),
      name: newKeyForm.name,
      provider: newKeyForm.provider as any,
      key: newKeyForm.key,
      status: 'unknown',
      lastChecked: '-'
    };
    const updatedKeys = [...keys, newKey];
    setKeys(updatedKeys);
    localStorage.setItem('my_api_keys', JSON.stringify(updatedKeys));
    setShowAddModal(false);
    setNewKeyForm({ name: '', provider: 'openai', key: '' });
  };

  const deleteKey = (id: string) => {
    const updatedKeys = keys.filter(k => k.id !== id);
    setKeys(updatedKeys);
    localStorage.setItem('my_api_keys', JSON.stringify(updatedKeys));
  };

  // --- 测试 Key 逻辑 ---
  const checkKey = async (id: string) => {
    setCheckingId(id);
    const targetKey = keys.find(k => k.id === id);
    if (!targetKey) return;

    try {
      const res = await fetch('/api/check', {
        method: 'POST',
        body: JSON.stringify({ provider: targetKey.provider, apiKey: targetKey.key }),
      });
      const data = await res.json();

      const updatedKeys = keys.map(k => {
        if (k.id === id) {
          return {
            ...k,
            status: data.success ? 'valid' : 'invalid',
            lastChecked: new Date().toLocaleString()
          } as ApiKeyData;
        }
        return k;
      });
      setKeys(updatedKeys);
      localStorage.setItem('my_api_keys', JSON.stringify(updatedKeys));
    } catch (e) {
      alert('测试请求失败');
    } finally {
      setCheckingId(null);
    }
  };

  // --- 渲染登录页 ---
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-96 border border-gray-100">
          <div className="flex justify-center mb-6 text-indigo-600">
            <Lock size={48} />
          </div>
          <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">管理员登录</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">用户名</label>
              <input 
                type="text" 
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition"
                placeholder="请输入用户名"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
              <input 
                type="password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition"
                placeholder="请输入密码"
              />
            </div>
            <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition font-medium">
              进入系统
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- 渲染主界面 ---
  return (
    <div className="min-h-screen bg-gray-50 p-6 sm:p-12 font-sans">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Activity className="text-indigo-600" /> API Key Manager
            </h1>
            <p className="text-gray-500 mt-1">安全管理并监测你的大模型密钥状态</p>
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            className="bg-black text-white px-5 py-2.5 rounded-full flex items-center gap-2 hover:bg-gray-800 transition shadow-lg hover:shadow-xl"
          >
            <Plus size={18} /> 新增 Key
          </button>
        </header>

        {/* Key 列表 */}
        <div className="grid gap-4">
          {keys.length === 0 && (
            <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-300 text-gray-400">
              暂无数据，请点击右上角添加
            </div>
          )}
          
          {keys.map((item) => (
            <div key={item.id} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4 w-full sm:w-auto">
                <div className={`p-3 rounded-lg ${
                  item.provider === 'openai' ? 'bg-green-100 text-green-700' : 
                  item.provider === 'gemini' ? 'bg-blue-100 text-blue-700' : 
                  item.provider === 'aliyun' ? 'bg-orange-100 text-orange-700' : 
                  'bg-purple-100 text-purple-700'
                }`}>
                  <span className="font-bold text-xs uppercase">{item.provider}</span>
                </div>
                <div>
                  <h3 className="font-bold text-gray-800">{item.name}</h3>
                  <div className="text-gray-400 text-sm flex items-center gap-2 font-mono mt-1">
                    {item.key.substring(0, 8)}...{item.key.substring(item.key.length - 4)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end">
                <div className="text-right">
                  <div className={`text-sm font-medium flex items-center gap-1 ${
                    item.status === 'valid' ? 'text-green-600' : 
                    item.status === 'invalid' ? 'text-red-500' : 'text-gray-400'
                  }`}>
                    {item.status === 'valid' && <CheckCircle size={14} />}
                    {item.status === 'invalid' && <XCircle size={14} />}
                    {item.status === 'unknown' ? '未检测' : (item.status === 'valid' ? '正常' : '无效')}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">上次检查: {item.lastChecked}</div>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => checkKey(item.id)}
                    disabled={checkingId === item.id}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-lg transition disabled:opacity-50"
                  >
                    {checkingId === item.id ? '检测中...' : '检测'}
                  </button>
                  <button 
                    onClick={() => deleteKey(item.id)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 新增 Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm z-50">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
              <h3 className="text-xl font-bold mb-4">添加新的 API Key</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">备注名称</label>
                  <input 
                    className="w-full border px-3 py-2 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="例如：我的 GPT-4 Key"
                    value={newKeyForm.name}
                    onChange={e => setNewKeyForm({...newKeyForm, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">供应商</label>
                  <select 
                    className="w-full border px-3 py-2 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                    value={newKeyForm.provider}
                    onChange={e => setNewKeyForm({...newKeyForm, provider: e.target.value})}
                  >
                    <option value="openai">OpenAI</option>
                    <option value="gemini">Google Gemini</option>
                    <option value="deepseek">DeepSeek (深度求索)</option>
                    <option value="aliyun">阿里百炼 (DashScope)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
                  <input 
                    className="w-full border px-3 py-2 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm"
                    placeholder="sk-..."
                    value={newKeyForm.key}
                    onChange={e => setNewKeyForm({...newKeyForm, key: e.target.value})}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button 
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                >
                  取消
                </button>
                <button 
                  onClick={addKey}
                  className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition"
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
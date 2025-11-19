'use client';

import React, { useState, useEffect } from 'react';
import { Trash2, Plus, Activity, Key, Server, FileText, X, Loader2, Settings2, Search } from 'lucide-react';
// 引入配置文件
import { PROVIDERS } from './config/providers';

// --- 类型定义 ---
type ApiKeyData = {
  id: string;
  name: string;
  provider: string;
  baseUrl: string;
  key: string;
  remarks: string;
  status: 'unknown' | 'valid' | 'invalid';
  latency?: number;
  lastChecked: string;
};

export default function MacApiKeyManager() {
  // --- State ---
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  
  const [keys, setKeys] = useState<ApiKeyData[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [checkingId, setCheckingId] = useState<string | null>(null);

  // 表单默认值
  const [form, setForm] = useState({
    name: '',
    provider: 'openai',
    baseUrl: PROVIDERS['openai'].defaultUrl, // 使用配置文件的默认值
    key: '',
    remarks: ''
  });

  // --- Effects ---
  useEffect(() => {
    const session = sessionStorage.getItem('mac_auth_token');
    if (session === 'nnwang-1006-session') setIsLoggedIn(true);

    const savedKeys = localStorage.getItem('mac_api_keys');
    if (savedKeys) setKeys(JSON.parse(savedKeys));
  }, []);

  // --- Handlers ---
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginForm.username === 'nnwang' && loginForm.password === '1006') {
      sessionStorage.setItem('mac_auth_token', 'nnwang-1006-session');
      setIsLoggedIn(true);
    } else {
      alert('Access Denied');
    }
  };

  // 当下拉菜单改变时，从配置文件读取默认 URL
  const handleProviderChange = (providerKey: string) => {
    const config = PROVIDERS[providerKey];
    setForm({
      ...form,
      provider: providerKey,
      baseUrl: config ? config.defaultUrl : ''
    });
  };

  const saveKey = () => {
    if (!form.name || !form.key) return alert("名称和 API Key 必填");

    const newKey: ApiKeyData = {
      id: Date.now().toString(),
      name: form.name,
      provider: form.provider,
      baseUrl: form.baseUrl,
      key: form.key,
      remarks: form.remarks,
      status: 'unknown',
      lastChecked: '-'
    };

    const updated = [newKey, ...keys];
    setKeys(updated);
    localStorage.setItem('mac_api_keys', JSON.stringify(updated));
    setShowAddModal(false);
    // 重置表单
    setForm({ name: '', provider: 'openai', baseUrl: PROVIDERS['openai'].defaultUrl, key: '', remarks: '' });
  };

  const deleteKey = (id: string) => {
    if(!confirm('确定要删除这个 Key 吗？')) return;
    const updated = keys.filter(k => k.id !== id);
    setKeys(updated);
    localStorage.setItem('mac_api_keys', JSON.stringify(updated));
  };

  const checkKey = async (id: string) => {
    setCheckingId(id);
    const target = keys.find(k => k.id === id);
    if (!target) return;

    const startTime = Date.now();
    try {
      const res = await fetch('/api/check', {
        method: 'POST',
        body: JSON.stringify({ 
          provider: target.provider, 
          apiKey: target.key,
          baseUrl: target.baseUrl
        }),
      });
      const data = await res.json();
      const endTime = Date.now();

      const updated = keys.map(k => {
        if (k.id === id) {
          return {
            ...k,
            status: data.success ? 'valid' : 'invalid',
            latency: endTime - startTime,
            lastChecked: new Date().toLocaleString('zh-CN', { hour12: false })
          } as ApiKeyData;
        }
        return k;
      });
      setKeys(updated);
      localStorage.setItem('mac_api_keys', JSON.stringify(updated));
    } catch (e) {
      alert('检测请求失败');
    } finally {
      setCheckingId(null);
    }
  };

  // 辅助函数：获取显示的标签样式
  const getProviderStyle = (providerKey: string) => {
    const config = PROVIDERS[providerKey];
    return config ? config.colorClass : 'bg-gray-50 text-gray-600 border-gray-100';
  };

  const getProviderName = (providerKey: string) => {
    const config = PROVIDERS[providerKey];
    return config ? config.name : 'Unknown';
  };

  // --- Render ---
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#dcdcdc] bg-[url('https://images.unsplash.com/photo-1621193677216-5950d8196c50?q=80&w=2560&auto=format&fit=crop')] bg-cover bg-center font-sans text-white">
        <div className="backdrop-blur-xl bg-black/20 p-8 rounded-[32px] shadow-2xl border border-white/10 w-[360px] flex flex-col items-center animate-in fade-in zoom-in duration-500">
          <div className="w-24 h-24 bg-gray-200 rounded-full mb-6 shadow-inner flex items-center justify-center text-4xl">👨🏻‍💻</div>
          <h2 className="text-xl font-semibold mb-6 text-white tracking-wide">nnwang</h2>
          <form onSubmit={handleLogin} className="w-full space-y-4">
            <input type="text" placeholder="Username" className="w-full bg-white/20 border border-white/10 rounded-xl px-4 py-2.5 placeholder-white/50 text-white outline-none focus:bg-white/30 transition text-center" value={loginForm.username} onChange={e => setLoginForm({...loginForm, username: e.target.value})} />
            <input type="password" placeholder="Password" className="w-full bg-white/20 border border-white/10 rounded-xl px-4 py-2.5 placeholder-white/50 text-white outline-none focus:bg-white/30 transition text-center" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} />
            <button type="submit" className="hidden">Login</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f] font-sans">
      <nav className="sticky top-0 z-30 bg-white/70 backdrop-blur-md border-b border-gray-200/50 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="flex gap-2 mr-4">
            <div className="w-3 h-3 rounded-full bg-[#ff5f57] border border-[#e0443e]"></div>
            <div className="w-3 h-3 rounded-full bg-[#febc2e] border border-[#d89e24]"></div>
            <div className="w-3 h-3 rounded-full bg-[#28c840] border border-[#1aab29]"></div>
          </div>
          <h1 className="text-lg font-semibold tracking-tight flex items-center gap-2 text-gray-800">
            <Server size={18} className="text-gray-500" /> KeyGuard <span className="text-gray-400 font-normal text-sm bg-gray-100 px-2 py-0.5 rounded-md border border-gray-200">Configurable</span>
          </h1>
        </div>
        <button onClick={() => setShowAddModal(true)} className="bg-[#007aff] hover:bg-[#0062cc] text-white px-4 py-1.5 rounded-lg text-sm font-medium shadow-sm transition-all active:scale-95 flex items-center gap-1.5">
          <Plus size={16} /> Add Key
        </button>
      </nav>

      <main className="max-w-5xl mx-auto p-6 sm:p-10">
        <div className="mb-8 flex items-center justify-between text-sm text-gray-500 px-1">
          <p>共管理 {keys.length} 个 API 密钥</p>
          <p>{new Date().toLocaleDateString()}</p>
        </div>

        <div className="grid gap-5">
          {keys.map((item) => (
            <div key={item.id} className="group bg-white p-6 rounded-[20px] border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-all duration-300 relative overflow-hidden">
              <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${item.status === 'valid' ? 'bg-[#34c759]' : item.status === 'invalid' ? 'bg-[#ff3b30]' : 'bg-gray-200'}`}></div>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pl-2">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-gray-900 tracking-tight">{item.name}</h3>
                    {/* 使用配置文件中的样式 */}
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getProviderStyle(item.provider)}`}>
                      {getProviderName(item.provider)}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm text-gray-500">
                    <div className="flex items-center gap-2 font-mono bg-gray-50 px-2 py-1 rounded border border-gray-100 w-fit">
                      <Key size={12} className="text-gray-400" />
                      <span className="tracking-widest">{item.key.slice(0, 4)}••••••••{item.key.slice(-4)}</span>
                    </div>
                    <div className="flex items-center gap-2 truncate max-w-[250px]" title={item.baseUrl}>
                      <Settings2 size={12} className="text-gray-400" />
                      <span className="truncate">{item.baseUrl || 'Default URL'}</span>
                    </div>
                    {item.remarks && (
                      <div className="flex items-center gap-2 col-span-full text-gray-400 italic">
                        <FileText size={12} />
                        <span>{item.remarks}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 md:border-l md:pl-6 border-gray-100">
                  <div className="text-right hidden sm:block min-w-[80px]">
                    <div className={`text-sm font-medium flex items-center justify-end gap-1.5 ${item.status === 'valid' ? 'text-[#34c759]' : item.status === 'invalid' ? 'text-[#ff3b30]' : 'text-gray-400'}`}>
                       {item.status === 'valid' ? 'Available' : item.status === 'invalid' ? 'Failed' : 'Unknown'}
                    </div>
                    <div className="text-[11px] text-gray-400 font-mono mt-1">{item.latency ? `${item.latency}ms` : ''}</div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => checkKey(item.id)} disabled={checkingId === item.id} className="h-9 px-4 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 text-sm font-medium rounded-lg shadow-sm hover:shadow transition-all disabled:opacity-50 flex items-center gap-2">
                      {checkingId === item.id ? <Loader2 size={14} className="animate-spin" /> : <Activity size={14} />} Check
                    </button>
                    <button onClick={() => deleteKey(item.id)} className="h-9 w-9 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {keys.length === 0 && (
             <div className="flex flex-col items-center justify-center py-20 text-gray-400 bg-white rounded-[20px] border border-dashed border-gray-200">
                <Search size={48} className="mb-4 opacity-20" />
                <p>No keys found. Add one to get started.</p>
             </div>
          )}
        </div>
      </main>

      {/* Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setShowAddModal(false)}></div>
          <div className="bg-white/90 backdrop-blur-xl w-full max-w-lg rounded-2xl shadow-2xl border border-white/20 relative z-10 animate-in zoom-in-95 duration-200 p-0 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200/50 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-sm font-semibold text-gray-900">Add New API Key</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-500 ml-1">Name <span className="text-red-500">*</span></label>
                  <input className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" placeholder="e.g. My Plato Key" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-500 ml-1">Provider</label>
                  {/* 这里的 options 现在从配置文件动态生成 */}
                  <select className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 transition-all appearance-none" value={form.provider} onChange={e => handleProviderChange(e.target.value)}>
                    {Object.entries(PROVIDERS).map(([key, val]) => (
                      <option key={key} value={key}>{val.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500 ml-1 flex justify-between">Base URL <span className="text-[10px] text-gray-400 font-normal">Auto-filled from provider</span></label>
                <input className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono text-gray-600 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" value={form.baseUrl} onChange={e => setForm({...form, baseUrl: e.target.value})} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500 ml-1">API Key <span className="text-red-500">*</span></label>
                <textarea rows={2} className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all resize-none" placeholder="sk-..." value={form.key} onChange={e => setForm({...form, key: e.target.value})} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500 ml-1">Remarks</label>
                <input className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" placeholder="备注..." value={form.remarks} onChange={e => setForm({...form, remarks: e.target.value})} />
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
              <button onClick={() => setShowAddModal(false)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200/50 rounded-lg transition-colors">Cancel</button>
              <button onClick={saveKey} className="px-6 py-2 text-sm font-medium text-white bg-[#007aff] hover:bg-[#0062cc] rounded-lg shadow-sm transition-colors">Save Key</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
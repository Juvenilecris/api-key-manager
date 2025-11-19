'use client';

import React, { useState, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { 
  Trash2, Plus, Activity, Key, Server, FileText, X, 
  Loader2, Settings2, Search, Copy, Check, Edit2, Calendar, Clock, 
  Cloud, ChevronDown, ChevronRight, LayoutGrid, Box, ExternalLink, Filter, ArrowUpDown
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- 工具函数 ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- 类型定义 ---
type ApiKeyData = {
  id: string;
  name: string;
  providerId: string; // 关联 Provider 的 ID
  baseUrl: string;
  key: string;
  remarks: string;
  expiresAt: number | null;
  status: 'unknown' | 'valid' | 'invalid';
  latency?: number;
  lastChecked: string;
};

type ProviderData = {
  id: string;
  name: string;
  dashboardUrl: string;
  description: string; // Markdown content
  color: string; // 预设颜色标识
};

// 预设一些颜色供选择
const COLOR_PRESETS = [
  { name: 'Green', bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' },
  { name: 'Blue', bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
  { name: 'Purple', bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' },
  { name: 'Orange', bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' },
  { name: 'Gray', bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200' },
];

// --- 子组件：复制按钮 ---
const CopyButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} className="p-1 text-gray-400 hover:text-blue-600 transition-colors">
      {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
    </button>
  );
};

export default function MacApiKeyManager() {
  // --- 全局状态 ---
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState<'keys' | 'providers'>('keys');
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });

  // --- 数据状态 ---
  const [keys, setKeys] = useState<ApiKeyData[]>([]);
  const [providers, setProviders] = useState<ProviderData[]>([]);
  
  // --- UI 状态 ---
  const [isLoading, setIsLoading] = useState(false);
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set()); // 记录展开的 Key ID
  
  // 筛选与排序
  const [filterProvider, setFilterProvider] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // 模态框状态
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [showProviderModal, setShowProviderModal] = useState(false);
  const [editingKey, setEditingKey] = useState<ApiKeyData | null>(null);
  const [editingProvider, setEditingProvider] = useState<ProviderData | null>(null);
  const [checkingId, setCheckingId] = useState<string | null>(null);

  // --- 表单状态 ---
  const [keyForm, setKeyForm] = useState({
    name: '', providerId: '', baseUrl: '', key: '', remarks: '',
    expireType: 'never' as 'never' | 'date' | 'duration', expireDate: '', duration: { years: 0, months: 0, days: 0 }
  });

  const [providerForm, setProviderForm] = useState({
    name: '', dashboardUrl: '', description: '', color: 'Gray'
  });

  // --- API 交互 ---
  const fetchData = async (type: 'mac_api_keys' | 'mac_providers') => {
    try {
      const res = await fetch(`/api/storage?key=${type}`, {
        headers: { 'x-auth-token': '1006', 'Cache-Control': 'no-cache' }
      });
      if (res.ok) {
        const data = await res.json();
        return Array.isArray(data) ? data : [];
      }
      return [];
    } catch (e) { return []; }
  };

  const saveData = async (type: 'mac_api_keys' | 'mac_providers', data: any[]) => {
    await fetch('/api/storage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-auth-token': '1006' },
      body: JSON.stringify({ key: type, data })
    });
  };

  const refreshAll = async () => {
    setIsLoading(true);
    const [k, p] = await Promise.all([fetchData('mac_api_keys'), fetchData('mac_providers')]);
    setKeys(k);
    setProviders(p);
    setIsLoading(false);
  };

  useEffect(() => {
    const session = sessionStorage.getItem('mac_auth_token');
    if (session === 'nnwang-1006-session') {
      setIsLoggedIn(true);
      refreshAll();
    }
  }, []);

  // --- 业务逻辑：登录 ---
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginForm.username === 'nnwang' && loginForm.password === '1006') {
      sessionStorage.setItem('mac_auth_token', 'nnwang-1006-session');
      setIsLoggedIn(true);
      setTimeout(refreshAll, 100);
    } else { alert('Access Denied'); }
  };

  // --- 业务逻辑：Keys 排序与筛选 ---
  const filteredKeys = useMemo(() => {
    let res = [...keys];
    // 1. 筛选
    if (filterProvider !== 'all') res = res.filter(k => k.providerId === filterProvider);
    if (filterStatus !== 'all') res = res.filter(k => k.status === filterStatus);

    // 2. 排序 (优先按状态: Valid -> Unknown -> Invalid，其次按供应商名)
    const statusOrder = { valid: 0, unknown: 1, invalid: 2 };
    res.sort((a, b) => {
      const statusDiff = statusOrder[a.status] - statusOrder[b.status];
      if (statusDiff !== 0) return statusDiff;
      // 如果状态相同，按 Provider 名字排
      const pA = providers.find(p => p.id === a.providerId)?.name || '';
      const pB = providers.find(p => p.id === b.providerId)?.name || '';
      return pA.localeCompare(pB);
    });
    return res;
  }, [keys, filterProvider, filterStatus, providers]);

  // --- 业务逻辑：Key 操作 ---
  const handleSaveKey = async () => {
    if (!keyForm.name || !keyForm.key) return alert("Name & Key Required");
    
    let finalExpiresAt: number | null = null;
    if (keyForm.expireType === 'date' && keyForm.expireDate) {
      finalExpiresAt = new Date(keyForm.expireDate).getTime();
    } else if (keyForm.expireType === 'duration') {
      const now = new Date();
      now.setFullYear(now.getFullYear() + (keyForm.duration.years || 0));
      now.setMonth(now.getMonth() + (keyForm.duration.months || 0));
      now.setDate(now.getDate() + (keyForm.duration.days || 0));
      finalExpiresAt = now.getTime();
    }

    const newData = {
      name: keyForm.name, providerId: keyForm.providerId, baseUrl: keyForm.baseUrl, key: keyForm.key, remarks: keyForm.remarks, expiresAt: finalExpiresAt
    };

    let updated = [];
    if (editingKey) {
      updated = keys.map(k => k.id === editingKey.id ? { ...k, ...newData, status: k.key !== newData.key ? 'unknown' : k.status } : k);
    } else {
      updated = [{ id: Date.now().toString(), ...newData, status: 'unknown' as const, lastChecked: '-' }, ...keys];
    }
    setKeys(updated);
    await saveData('mac_api_keys', updated);
    setShowKeyModal(false);
  };

  const checkKey = async (id: string) => {
    setCheckingId(id);
    const target = keys.find(k => k.id === id);
    if (!target) return setCheckingId(null);

    // 查找对应的 Provider 获取默认 BaseURL（如果用户没填）
    const provider = providers.find(p => p.id === target.providerId);
    // 简单的 URL 推断逻辑，如果是 OpenAI 类型且没填 BaseURL，尝试用 Provider 的 Dashboard URL 或者默认值
    // 这里为了简单，直接传 baseUrl，后端会处理空值
    try {
      const startTime = Date.now();
      const res = await fetch('/api/check', {
        method: 'POST',
        body: JSON.stringify({ provider: 'openai', apiKey: target.key, baseUrl: target.baseUrl }), // 统一走 OpenAI 兼容协议测试
      });
      const data = await res.json();
      const updated = keys.map(k => k.id === id ? {
        ...k, status: data.success ? 'valid' : 'invalid', latency: Date.now() - startTime, lastChecked: new Date().toLocaleString('zh-CN')
      } as ApiKeyData : k);
      setKeys(updated);
      await saveData('mac_api_keys', updated);
    } catch (e) { alert('Check Failed'); } finally { setCheckingId(null); }
  };

  const toggleExpand = (id: string) => {
    const newSet = new Set(expandedKeys);
    if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
    setExpandedKeys(newSet);
  };

  // --- 业务逻辑：Provider 操作 ---
  const handleSaveProvider = async () => {
    if (!providerForm.name) return alert("Provider Name Required");
    const newData = { name: providerForm.name, dashboardUrl: providerForm.dashboardUrl, description: providerForm.description, color: providerForm.color };
    let updated = [];
    if (editingProvider) {
      updated = providers.map(p => p.id === editingProvider.id ? { ...p, ...newData } : p);
    } else {
      updated = [...providers, { id: Date.now().toString(), ...newData }];
    }
    setProviders(updated);
    await saveData('mac_providers', updated);
    setShowProviderModal(false);
  };

  const handleDelete = async (type: 'key' | 'provider', id: string) => {
    if (!confirm('Are you sure?')) return;
    if (type === 'key') {
      const u = keys.filter(k => k.id !== id);
      setKeys(u); await saveData('mac_api_keys', u);
    } else {
      const u = providers.filter(p => p.id !== id);
      setProviders(u); await saveData('mac_providers', u);
    }
  };

  // --- 渲染辅助 ---
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'valid': return 'bg-green-500';
      case 'invalid': return 'bg-red-500';
      default: return 'bg-gray-300';
    }
  };
  
  const getProviderStyle = (colorName: string) => {
    return COLOR_PRESETS.find(c => c.name === colorName) || COLOR_PRESETS[4];
  };

  // --- 登录页 ---
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 bg-[url('https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?q=80&w=2000&auto=format&fit=crop')] bg-cover">
        <div className="bg-white/80 backdrop-blur-xl p-8 rounded-3xl shadow-2xl w-96 border border-white/50">
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-gray-900 rounded-2xl mx-auto mb-4 flex items-center justify-center text-white shadow-lg"><Server size={40}/></div>
            <h2 className="text-xl font-bold text-gray-800">KeyGuard Admin</h2>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="text" placeholder="User" className="w-full px-4 py-3 rounded-xl bg-white/50 border-0 focus:ring-2 focus:ring-blue-500 transition" value={loginForm.username} onChange={e=>setLoginForm({...loginForm, username:e.target.value})}/>
            <input type="password" placeholder="Pass" className="w-full px-4 py-3 rounded-xl bg-white/50 border-0 focus:ring-2 focus:ring-blue-500 transition" value={loginForm.password} onChange={e=>setLoginForm({...loginForm, password:e.target.value})}/>
            <button className="w-full bg-gray-900 text-white py-3 rounded-xl font-medium hover:bg-black transition">Unlock</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#f5f5f7] text-[#1d1d1f] font-sans overflow-hidden">
      
      {/* 侧边栏 Sidebar */}
      <aside className="w-64 bg-[#fbfbfd]/80 backdrop-blur-xl border-r border-gray-200 flex flex-col pt-6 pb-4 px-4 shrink-0">
        <div className="flex items-center gap-2 px-2 mb-8">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-md"><Activity size={18}/></div>
          <span className="font-bold text-lg tracking-tight">KeyGuard</span>
        </div>
        
        <nav className="space-y-1 flex-1">
          <button onClick={() => setActiveTab('keys')} className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all", activeTab === 'keys' ? "bg-white shadow text-blue-600" : "text-gray-500 hover:bg-black/5")}>
            <Key size={18} /> API Keys
          </button>
          <button onClick={() => setActiveTab('providers')} className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all", activeTab === 'providers' ? "bg-white shadow text-blue-600" : "text-gray-500 hover:bg-black/5")}>
            <LayoutGrid size={18} /> Providers
          </button>
        </nav>

        <div className="text-xs text-gray-400 px-2 mt-auto">
          Sync Status: {isLoading ? 'Syncing...' : 'Up to date'}
        </div>
      </aside>

      {/* 主内容区 Main Content */}
      <main className="flex-1 overflow-y-auto p-6 sm:p-10 relative">
        
        {/* === API Keys View === */}
        {activeTab === 'keys' && (
          <div className="max-w-5xl mx-auto space-y-6">
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">API Keys</h1>
                <p className="text-sm text-gray-500 mt-1">Manage and monitor your access tokens.</p>
              </div>
              <div className="flex items-center gap-3">
                {/* Filters */}
                <div className="flex bg-white rounded-lg p-1 shadow-sm border border-gray-200">
                  <select className="text-xs bg-transparent border-none outline-none px-2 py-1 text-gray-600" value={filterProvider} onChange={e => setFilterProvider(e.target.value)}>
                    <option value="all">All Providers</option>
                    {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <div className="w-px bg-gray-200 mx-1"></div>
                  <select className="text-xs bg-transparent border-none outline-none px-2 py-1 text-gray-600" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                    <option value="all">All Status</option>
                    <option value="valid">Valid</option>
                    <option value="unknown">Unknown</option>
                    <option value="invalid">Invalid</option>
                  </select>
                </div>

                <button onClick={() => {
                  setEditingKey(null);
                  setKeyForm({ name: '', providerId: providers[0]?.id || '', baseUrl: '', key: '', remarks: '', expireType: 'never', expireDate: '', duration: { years: 0, months: 0, days: 0 } });
                  setShowKeyModal(true);
                }} className="bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition shadow flex items-center gap-2">
                  <Plus size={16} /> New Key
                </button>
              </div>
            </header>

            <div className="space-y-3">
              {filteredKeys.length === 0 && <div className="text-center py-20 text-gray-400">No keys found.</div>}
              
              {filteredKeys.map(key => {
                const isExpanded = expandedKeys.has(key.id);
                const provider = providers.find(p => p.id === key.providerId);
                const pStyle = provider ? getProviderStyle(provider.color) : COLOR_PRESETS[4];

                return (
                  <div key={key.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden transition-all hover:shadow-md">
                    {/* Card Header (Always Visible) */}
                    <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50/50" onClick={() => toggleExpand(key.id)}>
                      <div className="flex items-center gap-4">
                        <button className="text-gray-400 hover:text-gray-600">
                          {isExpanded ? <ChevronDown size={20}/> : <ChevronRight size={20}/>}
                        </button>
                        <div className={`w-2.5 h-2.5 rounded-full ${getStatusColor(key.status)} ring-4 ring-opacity-20 ${key.status === 'valid' ? 'ring-green-100' : key.status === 'invalid' ? 'ring-red-100' : 'ring-gray-100'}`}></div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{key.name}</h3>
                          <div className="text-xs text-gray-400 flex items-center gap-2 mt-0.5">
                            <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-bold uppercase border", pStyle.bg, pStyle.text, pStyle.border)}>
                              {provider?.name || 'Unknown'}
                            </span>
                            {key.lastChecked !== '-' && <span>Last check: {key.lastChecked}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                        <button onClick={() => checkKey(key.id)} disabled={checkingId === key.id} className="p-2 text-gray-400 hover:text-blue-600 bg-gray-50 rounded-lg border border-transparent hover:border-blue-100 transition">
                          {checkingId === key.id ? <Loader2 size={18} className="animate-spin"/> : <Activity size={18}/>}
                        </button>
                      </div>
                    </div>

                    {/* Card Body (Collapsible) */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-0 ml-11 border-t border-gray-100 mt-2 animate-in slide-in-from-top-2 duration-200">
                        <div className="grid grid-cols-1 gap-3 pt-3">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="w-20 text-gray-400 font-medium text-xs uppercase">Key</span>
                            <code className="bg-gray-50 px-2 py-1 rounded text-gray-600 font-mono text-xs flex-1 border border-gray-100 truncate">
                              {key.key}
                            </code>
                            <CopyButton text={key.key} />
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <span className="w-20 text-gray-400 font-medium text-xs uppercase">Base URL</span>
                            <code className="bg-gray-50 px-2 py-1 rounded text-gray-600 font-mono text-xs flex-1 border border-gray-100 truncate">
                              {key.baseUrl || 'Default'}
                            </code>
                            <CopyButton text={key.baseUrl} />
                          </div>
                          {key.remarks && (
                            <div className="flex items-start gap-2 text-sm">
                              <span className="w-20 text-gray-400 font-medium text-xs uppercase mt-1">Note</span>
                              <p className="text-gray-600 text-sm bg-yellow-50/50 px-2 py-1 rounded flex-1">{key.remarks}</p>
                            </div>
                          )}
                          <div className="flex justify-end gap-2 mt-2">
                            <button onClick={() => {
                              setEditingKey(key);
                              setKeyForm({ 
                                name: key.name, providerId: key.providerId, baseUrl: key.baseUrl, key: key.key, remarks: key.remarks, 
                                expireType: key.expiresAt ? 'date' : 'never', 
                                expireDate: key.expiresAt ? new Date(key.expiresAt).toISOString().split('T')[0] : '', 
                                duration: { years: 0, months: 0, days: 0 } 
                              });
                              setShowKeyModal(true);
                            }} className="text-xs flex items-center gap-1 text-gray-500 hover:text-gray-800 px-3 py-1.5 rounded border hover:bg-gray-50"><Edit2 size={14}/> Edit</button>
                            <button onClick={() => handleDelete('key', key.id)} className="text-xs flex items-center gap-1 text-red-400 hover:text-red-600 px-3 py-1.5 rounded border hover:bg-red-50 border-transparent hover:border-red-100"><Trash2 size={14}/> Delete</button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* === Providers View === */}
        {activeTab === 'providers' && (
          <div className="max-w-5xl mx-auto space-y-6">
             <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Providers</h1>
                <p className="text-sm text-gray-500 mt-1">Configure your AI service providers.</p>
              </div>
              <button onClick={() => {
                  setEditingProvider(null);
                  setProviderForm({ name: '', dashboardUrl: '', description: '', color: 'Gray' });
                  setShowProviderModal(true);
                }} className="bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition shadow flex items-center gap-2">
                  <Plus size={16} /> New Provider
              </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {providers.map(p => {
                 const style = getProviderStyle(p.color);
                 return (
                   <div key={p.id} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition flex flex-col h-full">
                     <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold shadow-sm", style.bg, style.text)}>
                            {p.name.charAt(0)}
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-900">{p.name}</h3>
                            {p.dashboardUrl && (
                              <a href={p.dashboardUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline flex items-center gap-1">
                                Dashboard <ExternalLink size={10}/>
                              </a>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => { setEditingProvider(p); setProviderForm({ name: p.name, dashboardUrl: p.dashboardUrl, description: p.description, color: p.color }); setShowProviderModal(true); }} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><Edit2 size={16}/></button>
                          <button onClick={() => handleDelete('provider', p.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button>
                        </div>
                     </div>
                     
                     {/* Markdown Description */}
                     {p.description && (
                       <div className="flex-1 bg-gray-50 rounded-lg p-3 border border-gray-100 text-sm text-gray-600 prose prose-sm prose-p:my-1 max-w-none overflow-hidden">
                          <ReactMarkdown>{p.description}</ReactMarkdown>
                       </div>
                     )}
                     
                     <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
                        <span>ID: {p.id.slice(-6)}</span>
                        <span>{keys.filter(k => k.providerId === p.id).length} keys linked</span>
                     </div>
                   </div>
                 );
               })}
            </div>
          </div>
        )}
      </main>

      {/* === Key Modal === */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-800">{editingKey ? 'Edit Key' : 'Add Key'}</h3>
              <button onClick={() => setShowKeyModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto">
               {/* Provider Select */}
               <div>
                 <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Provider</label>
                 <select className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none" value={keyForm.providerId} onChange={e => setKeyForm({...keyForm, providerId: e.target.value})}>
                   <option value="" disabled>Select Provider</option>
                   {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                 </select>
               </div>
               
               <div>
                 <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Name</label>
                 <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. My API Key" value={keyForm.name} onChange={e => setKeyForm({...keyForm, name: e.target.value})} />
               </div>

               <div>
                 <label className="block text-xs font-bold text-gray-500 uppercase mb-1">API Key</label>
                 <textarea rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none resize-none" placeholder="sk-..." value={keyForm.key} onChange={e => setKeyForm({...keyForm, key: e.target.value})} />
               </div>

               <div>
                 <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Base URL (Optional)</label>
                 <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Auto" value={keyForm.baseUrl} onChange={e => setKeyForm({...keyForm, baseUrl: e.target.value})} />
               </div>

               {/* Validity */}
               <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Expiration</label>
                  <div className="flex gap-2 mb-3">
                    {['never', 'date', 'duration'].map(t => (
                      <button key={t} onClick={()=>setKeyForm({...keyForm, expireType: t as any})} className={cn("flex-1 py-1.5 text-xs font-medium rounded-md border transition", keyForm.expireType === t ? "bg-white border-gray-300 shadow-sm text-blue-600" : "border-transparent text-gray-500 hover:bg-gray-200")}>
                        {t === 'never' ? 'Never' : t === 'date' ? 'Date' : 'Duration'}
                      </button>
                    ))}
                  </div>
                  {keyForm.expireType === 'date' && <input type="date" className="w-full border rounded px-2 py-1 text-sm" value={keyForm.expireDate} onChange={e => setKeyForm({...keyForm, expireDate: e.target.value})}/>}
                  {keyForm.expireType === 'duration' && (
                     <div className="flex gap-2">
                       {['years', 'months', 'days'].map(unit => (
                         <div key={unit} className="flex-1"><input type="number" min="0" placeholder={unit} className="w-full border rounded px-2 py-1 text-center text-sm" value={(keyForm.duration as any)[unit]} onChange={e => setKeyForm({...keyForm, duration: {...keyForm.duration, [unit]: +e.target.value}})}/></div>
                       ))}
                     </div>
                  )}
               </div>
            </div>
            <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-2">
              <button onClick={() => setShowKeyModal(false)} className="px-4 py-2 text-gray-600 text-sm hover:bg-gray-200 rounded-lg">Cancel</button>
              <button onClick={handleSaveKey} className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 shadow-md">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* === Provider Modal === */}
      {showProviderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-800">{editingProvider ? 'Edit Provider' : 'Add Provider'}</h3>
              <button onClick={() => setShowProviderModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto">
               <div>
                 <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Provider Name</label>
                 <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={providerForm.name} onChange={e => setProviderForm({...providerForm, name: e.target.value})} />
               </div>
               <div>
                 <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Dashboard URL</label>
                 <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="https://..." value={providerForm.dashboardUrl} onChange={e => setProviderForm({...providerForm, dashboardUrl: e.target.value})} />
               </div>
               <div>
                 <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Color Theme</label>
                 <div className="flex gap-2">
                    {COLOR_PRESETS.map(c => (
                      <button key={c.name} onClick={() => setProviderForm({...providerForm, color: c.name})} className={cn("w-8 h-8 rounded-full border-2 flex items-center justify-center transition", providerForm.color === c.name ? "border-gray-600 scale-110" : "border-transparent", c.bg)}>
                         <div className={cn("w-3 h-3 rounded-full", c.text.replace('text', 'bg'))}></div>
                      </button>
                    ))}
                 </div>
               </div>
               <div>
                 <label className="block text-xs font-bold text-gray-500 uppercase mb-1 flex justify-between">Description <span className="text-gray-400 font-normal lowercase">supports markdown</span></label>
                 <textarea rows={4} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none resize-none" placeholder="# Info&#10;- Rate limits..." value={providerForm.description} onChange={e => setProviderForm({...providerForm, description: e.target.value})} />
               </div>
            </div>
            <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-2">
              <button onClick={() => setShowProviderModal(false)} className="px-4 py-2 text-gray-600 text-sm hover:bg-gray-200 rounded-lg">Cancel</button>
              <button onClick={handleSaveProvider} className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 shadow-md">Save Provider</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
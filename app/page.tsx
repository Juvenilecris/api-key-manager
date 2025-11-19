'use client';

import React, { useState, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { 
  Trash2, Plus, Activity, Key, Server, FileText, X, 
  Loader2, Settings2, Search, Copy, Check, Edit2, 
  ChevronDown, ChevronRight, LayoutGrid, ExternalLink, Filter, Clock, AlertCircle,
  CheckSquare, Square, Ban, RefreshCw
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
  providerId: string;
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
  baseUrl: string;
  dashboardUrl: string;
  description: string;
  color: string;
};

const COLOR_PRESETS = [
  { name: 'Green', bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200', ring: 'ring-emerald-100' },
  { name: 'Blue', bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', ring: 'ring-blue-100' },
  { name: 'Purple', bg: 'bg-violet-100', text: 'text-violet-700', border: 'border-violet-200', ring: 'ring-violet-100' },
  { name: 'Orange', bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200', ring: 'ring-orange-100' },
  { name: 'Gray', bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200', ring: 'ring-gray-100' },
  { name: 'Red', bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-200', ring: 'ring-rose-100' },
];

// --- 组件：复制按钮 ---
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
    <button onClick={handleCopy} className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors rounded-md hover:bg-gray-100">
      {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
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
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const [expandedProviders, setExpandedProviders] = useState<Set<string>>(new Set()); 

  // --- 批量选择状态 ---
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  const [filterProvider, setFilterProvider] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

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
    name: '', baseUrl: '', dashboardUrl: '', description: '', color: 'Gray'
  });

  // --- API Methods ---
  const fetchData = async (type: 'mac_api_keys' | 'mac_providers') => {
    try {
      const res = await fetch(`/api/storage?key=${type}`, { headers: { 'x-auth-token': '1006' } });
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

  // --- Login ---
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginForm.username === 'nnwang' && loginForm.password === '1006') {
      sessionStorage.setItem('mac_auth_token', 'nnwang-1006-session');
      setIsLoggedIn(true);
      setTimeout(refreshAll, 100);
    } else { alert('Access Denied'); }
  };

  // --- Filter & Sort ---
  const filteredKeys = useMemo(() => {
    let res = [...keys];
    if (filterProvider !== 'all') res = res.filter(k => k.providerId === filterProvider);
    if (filterStatus !== 'all') res = res.filter(k => k.status === filterStatus);
    const statusOrder = { valid: 0, unknown: 1, invalid: 2 };
    res.sort((a, b) => {
      const diff = statusOrder[a.status] - statusOrder[b.status];
      if (diff !== 0) return diff;
      return (providers.find(p => p.id === a.providerId)?.name || '').localeCompare(providers.find(p => p.id === b.providerId)?.name || '');
    });
    return res;
  }, [keys, filterProvider, filterStatus, providers]);

  // --- Batch Actions ---
  const handleSelectAll = () => {
    if (selectedKeys.size === filteredKeys.length && filteredKeys.length > 0) {
      setSelectedKeys(new Set());
    } else {
      setSelectedKeys(new Set(filteredKeys.map(k => k.id)));
    }
  };

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedKeys);
    if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
    setSelectedKeys(newSet);
  };

  const handleBatchDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedKeys.size} keys?`)) return;
    const updated = keys.filter(k => !selectedKeys.has(k.id));
    setKeys(updated);
    setSelectedKeys(new Set());
    await saveData('mac_api_keys', updated);
  };

  const handleBatchSetStatus = async (status: 'invalid' | 'unknown') => {
    const updated = keys.map(k => selectedKeys.has(k.id) ? { ...k, status } : k);
    setKeys(updated);
    setSelectedKeys(new Set());
    await saveData('mac_api_keys', updated);
  };

  // --- Key Actions ---
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
    try {
      const startTime = Date.now();
      const res = await fetch('/api/check', {
        method: 'POST',
        body: JSON.stringify({ provider: 'openai', apiKey: target.key, baseUrl: target.baseUrl }),
      });
      const data = await res.json();
      const updated = keys.map(k => k.id === id ? {
        ...k, 
        status: data.success ? 'valid' : 'invalid', 
        latency: Date.now() - startTime,
        lastChecked: new Date().toLocaleString('zh-CN')
      } as ApiKeyData : k);
      setKeys(updated);
      await saveData('mac_api_keys', updated);
    } catch (e) { alert('Check Failed'); } finally { setCheckingId(null); }
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

  const handleKeyProviderChange = (providerId: string) => {
    const provider = providers.find(p => p.id === providerId);
    setKeyForm(prev => ({
      ...prev,
      providerId: providerId,
      baseUrl: provider ? provider.baseUrl : prev.baseUrl 
    }));
  };

  const toggleKeyExpand = (id: string) => {
    const newSet = new Set(expandedKeys);
    if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
    setExpandedKeys(newSet);
  };

  const toggleProviderExpand = (id: string) => {
    const newSet = new Set(expandedProviders);
    if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
    setExpandedProviders(newSet);
  };

  // --- Provider Actions (之前遗漏的部分) ---
  const handleSaveProvider = async () => {
    if (!providerForm.name || !providerForm.baseUrl) return alert("Name & Base URL Required");
    
    const newData = { 
      name: providerForm.name, 
      baseUrl: providerForm.baseUrl, 
      dashboardUrl: providerForm.dashboardUrl, 
      description: providerForm.description, 
      color: providerForm.color 
    };

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

  // --- Styles ---
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'valid': return 'bg-emerald-500';
      case 'invalid': return 'bg-rose-500';
      default: return 'bg-gray-300';
    }
  };
  const getProviderStyle = (colorName: string) => COLOR_PRESETS.find(c => c.name === colorName) || COLOR_PRESETS[4];

  // --- Render ---
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 bg-[url('https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?q=80&w=2000&auto=format&fit=crop')] bg-cover">
        <div className="bg-white/80 backdrop-blur-xl p-8 rounded-3xl shadow-2xl w-96 border border-white/50 animate-in zoom-in duration-300">
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
      
      {/* Sidebar */}
      <aside className="w-64 bg-[#fbfbfd]/80 backdrop-blur-xl border-r border-gray-200 flex flex-col pt-6 pb-4 px-4 shrink-0 z-10">
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
        <div className="text-xs text-gray-400 px-2 mt-auto">Sync Status: {isLoading ? 'Syncing...' : 'Up to date'}</div>
      </aside>

      {/* Content Area */}
      <main className="flex-1 overflow-y-auto p-6 sm:p-10 relative bg-[#f5f5f7]">
        
        {/* === Tab: API Keys === */}
        {activeTab === 'keys' && (
          <div className="max-w-5xl mx-auto space-y-6 pb-20"> 
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">API Keys</h1>
                <p className="text-sm text-gray-500 mt-1">Manage and monitor your access tokens.</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex bg-white rounded-lg p-1 shadow-sm border border-gray-200 items-center">
                   {/* Select All Toggle */}
                   <button onClick={handleSelectAll} className="px-2 text-gray-400 hover:text-blue-600 transition-colors" title="Select All">
                     {selectedKeys.size > 0 && selectedKeys.size === filteredKeys.length ? <CheckSquare size={16} /> : <Square size={16} />}
                   </button>
                   <div className="w-px h-4 bg-gray-200 mx-1"></div>
                   
                   <Filter size={14} className="text-gray-400 ml-2" />
                  <select className="text-xs bg-transparent border-none outline-none px-2 py-1.5 text-gray-600 font-medium" value={filterProvider} onChange={e => setFilterProvider(e.target.value)}>
                    <option value="all">All Providers</option>
                    {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <div className="w-px h-4 bg-gray-200 mx-1"></div>
                  <select className="text-xs bg-transparent border-none outline-none px-2 py-1.5 text-gray-600 font-medium" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                    <option value="all">All Status</option>
                    <option value="valid">Valid</option>
                    <option value="unknown">Unknown</option>
                    <option value="invalid">Invalid</option>
                  </select>
                </div>
                <button onClick={() => {
                  setEditingKey(null);
                  setKeyForm({ name: '', providerId: providers[0]?.id || '', baseUrl: providers[0]?.baseUrl || '', key: '', remarks: '', expireType: 'never', expireDate: '', duration: { years: 0, months: 0, days: 0 } });
                  setShowKeyModal(true);
                }} className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-black transition shadow flex items-center gap-2">
                  <Plus size={16} /> New Key
                </button>
              </div>
            </header>

            <div className="space-y-3">
              {filteredKeys.length === 0 && <div className="text-center py-20 text-gray-400 bg-white rounded-xl border border-dashed">No keys found matching filters.</div>}
              
              {filteredKeys.map(key => {
                const isExpanded = expandedKeys.has(key.id);
                const isSelected = selectedKeys.has(key.id);
                const isInvalid = key.status === 'invalid';
                const provider = providers.find(p => p.id === key.providerId);
                const pStyle = provider ? getProviderStyle(provider.color) : COLOR_PRESETS[4];

                return (
                  <div key={key.id} className={cn(
                      "bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden transition-all hover:shadow-md group relative",
                      isInvalid && "opacity-60 bg-gray-50 grayscale-[0.3]" 
                    )}>
                    {/* Collapsed Header */}
                    <div className="flex items-center justify-between p-4 cursor-pointer select-none hover:bg-gray-50/80 transition-colors" onClick={() => toggleKeyExpand(key.id)}>
                      <div className="flex items-center gap-4 overflow-hidden">
                        {/* Checkbox */}
                        <div className="flex items-center" onClick={e => e.stopPropagation()}>
                          <button onClick={() => toggleSelection(key.id)} className={cn("text-gray-300 hover:text-blue-500 transition-colors", isSelected && "text-blue-600")}>
                             {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                          </button>
                        </div>

                        <button className="text-gray-400 hover:text-gray-600 transition-transform duration-200">
                          {isExpanded ? <ChevronDown size={20}/> : <ChevronRight size={20}/>}
                        </button>
                        
                        <div className={`flex-shrink-0 w-3 h-3 rounded-full ${getStatusColor(key.status)} ring-4 ring-opacity-20 ${key.status === 'valid' ? 'ring-emerald-100' : key.status === 'invalid' ? 'ring-rose-100' : 'ring-gray-100'}`}></div>
                        
                        <div className="min-w-0 flex flex-col gap-1">
                          <h3 className={cn("font-semibold text-gray-900 truncate leading-none transition-all", isInvalid && "line-through text-gray-500")}>{key.name}</h3>
                          
                          <div className="flex items-center gap-2">
                             <span className={cn("px-1.5 py-px rounded-[4px] text-[10px] font-bold uppercase border tracking-wide", pStyle.bg, pStyle.text, pStyle.border)}>
                                {provider?.name || 'Unknown'}
                             </span>

                             {key.status !== 'unknown' && (
                                <div className={cn("flex items-center gap-1.5 px-2 py-px rounded-[4px] text-[10px] font-bold border uppercase tracking-wide", 
                                  key.status === 'valid' ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"
                                )}>
                                   {key.status === 'valid' ? <Check size={10} strokeWidth={3} /> : <Ban size={10} strokeWidth={3} />}
                                   <span>{key.status === 'valid' ? 'Available' : 'Unavailable'}</span>
                                   {key.status === 'valid' && key.latency && (
                                     <>
                                       <span className="w-px h-2.5 bg-emerald-200 mx-0.5"></span>
                                       <span>{key.latency}ms</span>
                                     </>
                                   )}
                                </div>
                             )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 pl-4" onClick={e => e.stopPropagation()}>
                         {key.lastChecked !== '-' && <span className="text-xs text-gray-400 hidden sm:block font-medium">{key.lastChecked}</span>}
                        <button onClick={() => checkKey(key.id)} disabled={checkingId === key.id} className="p-2 text-gray-400 hover:text-blue-600 bg-gray-50 rounded-lg border border-transparent hover:border-blue-100 transition active:scale-95">
                          {checkingId === key.id ? <Loader2 size={18} className="animate-spin text-blue-600"/> : <Activity size={18}/>}
                        </button>
                      </div>
                    </div>

                    {/* Expanded Body */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-0 ml-14 border-t border-gray-100 mt-2 animate-in slide-in-from-top-1 duration-200">
                        <div className="grid grid-cols-1 gap-3 pt-3">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="w-20 text-gray-400 font-medium text-xs uppercase tracking-wider">Key</span>
                            <div className="flex-1 flex items-center gap-2 min-w-0">
                              <code className="bg-gray-50 px-2 py-1.5 rounded text-gray-600 font-mono text-xs border border-gray-200 truncate flex-1">{key.key}</code>
                              <CopyButton text={key.key} />
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <span className="w-20 text-gray-400 font-medium text-xs uppercase tracking-wider">Host</span>
                            <div className="flex-1 flex items-center gap-2 min-w-0">
                              <code className="bg-gray-50 px-2 py-1.5 rounded text-gray-600 font-mono text-xs border border-gray-200 truncate flex-1">{key.baseUrl || 'Default'}</code>
                              <CopyButton text={key.baseUrl} />
                            </div>
                          </div>
                          {key.remarks && (
                            <div className="flex items-start gap-2 text-sm">
                              <span className="w-20 text-gray-400 font-medium text-xs uppercase tracking-wider mt-1.5">Note</span>
                              <div className="flex-1 bg-yellow-50/80 border border-yellow-100 px-3 py-2 rounded-lg text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                                {key.remarks}
                              </div>
                            </div>
                          )}
                          <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-gray-50">
                            <button onClick={() => {
                              setEditingKey(key);
                              setKeyForm({ 
                                name: key.name, providerId: key.providerId, baseUrl: key.baseUrl, key: key.key, remarks: key.remarks, 
                                expireType: key.expiresAt ? 'date' : 'never', 
                                expireDate: key.expiresAt ? new Date(key.expiresAt).toISOString().split('T')[0] : '', 
                                duration: { years: 0, months: 0, days: 0 } 
                              });
                              setShowKeyModal(true);
                            }} className="text-xs flex items-center gap-1.5 text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-md hover:bg-gray-100 transition"><Edit2 size={14}/> Edit</button>
                            <button onClick={() => handleDelete('key', key.id)} className="text-xs flex items-center gap-1.5 text-red-500 hover:text-red-700 px-3 py-1.5 rounded-md hover:bg-red-50 transition"><Trash2 size={14}/> Delete</button>
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

        {/* === Floating Batch Action Bar === */}
        {selectedKeys.size > 0 && activeTab === 'keys' && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900/90 backdrop-blur-md text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-6 animate-in slide-in-from-bottom-4 z-50 border border-white/10">
            <div className="text-sm font-medium flex items-center gap-2 pr-4 border-r border-white/20">
              <span className="bg-white text-black text-xs font-bold px-1.5 py-0.5 rounded">{selectedKeys.size}</span>
              Selected
            </div>
            <div className="flex items-center gap-2">
               <button onClick={() => handleBatchSetStatus('unknown')} className="p-2 hover:bg-white/10 rounded-full transition-colors tooltip-trigger group relative" title="Reset Status">
                  <RefreshCw size={18} />
                  <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap">Reset Status</span>
               </button>
               <button onClick={() => handleBatchSetStatus('invalid')} className="p-2 hover:bg-white/10 rounded-full transition-colors group relative" title="Mark Unavailable">
                  <Ban size={18} className="text-orange-400" />
                  <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap">Mark Invalid</span>
               </button>
               <button onClick={handleBatchDelete} className="p-2 hover:bg-red-500/20 rounded-full transition-colors group relative" title="Delete">
                  <Trash2 size={18} className="text-red-400" />
                  <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap">Delete Selected</span>
               </button>
            </div>
            <button onClick={() => setSelectedKeys(new Set())} className="ml-2 text-xs text-gray-400 hover:text-white">Cancel</button>
          </div>
        )}

        {/* === Tab: Providers === */}
        {activeTab === 'providers' && (
          <div className="max-w-5xl mx-auto space-y-6">
             <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Providers</h1>
                <p className="text-sm text-gray-500 mt-1">Configure API service providers.</p>
              </div>
              <button onClick={() => {
                  setEditingProvider(null);
                  setProviderForm({ name: '', baseUrl: 'https://api.openai.com/v1', dashboardUrl: '', description: '', color: 'Gray' });
                  setShowProviderModal(true);
                }} className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-black transition shadow flex items-center gap-2">
                  <Plus size={16} /> New Provider
              </button>
            </header>
            <div className="grid grid-cols-1 gap-4">
               {providers.map(p => {
                 const style = getProviderStyle(p.color);
                 const isExpanded = expandedProviders.has(p.id);
                 return (
                   <div key={p.id} className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all overflow-hidden">
                     <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50/50" onClick={() => toggleProviderExpand(p.id)}>
                        <div className="flex items-center gap-4">
                           <button className="text-gray-400 hover:text-gray-600">
                             {isExpanded ? <ChevronDown size={20}/> : <ChevronRight size={20}/>}
                           </button>
                           <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold shadow-sm border", style.bg, style.text, style.border)}>
                             {p.name.charAt(0)}
                           </div>
                           <div>
                             <h3 className="font-bold text-gray-900 text-lg leading-tight">{p.name}</h3>
                             <div className="text-xs text-gray-400 mt-0.5 font-medium">{keys.filter(k => k.providerId === p.id).length} Keys Linked</div>
                           </div>
                        </div>
                        {!isExpanded && <div className="text-gray-300 hover:text-gray-400"><Settings2 size={20}/></div>}
                     </div>
                     {isExpanded && (
                       <div className="border-t border-gray-100 bg-gray-50/30 p-5 animate-in slide-in-from-top-1 duration-200">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                             <div className="space-y-3">
                               <div className="flex flex-col gap-1">
                                 <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Default Base URL</label>
                                 <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono text-gray-600 shadow-sm">
                                    <Server size={14} className="text-gray-400"/>
                                    <span className="truncate flex-1">{p.baseUrl}</span>
                                    <CopyButton text={p.baseUrl} />
                                 </div>
                               </div>
                               {p.dashboardUrl && (
                                 <div className="flex flex-col gap-1">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Dashboard</label>
                                    <a href={p.dashboardUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-blue-600 hover:underline bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 w-fit transition-colors">
                                      <ExternalLink size={14}/> Open Dashboard
                                    </a>
                                 </div>
                               )}
                             </div>
                             {p.description && (
                               <div className="flex flex-col gap-1">
                                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Notes</label>
                                  <div className="bg-white border border-gray-200 rounded-lg p-4 text-sm text-gray-700 prose prose-sm prose-p:my-1 prose-headings:text-gray-800 prose-a:text-blue-500 max-w-none h-full max-h-40 overflow-y-auto shadow-sm">
                                      <ReactMarkdown>{p.description}</ReactMarkdown>
                                  </div>
                               </div>
                             )}
                          </div>
                          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                            <button onClick={(e) => { e.stopPropagation(); setEditingProvider(p); setProviderForm({ name: p.name, baseUrl: p.baseUrl, dashboardUrl: p.dashboardUrl, description: p.description, color: p.color }); setShowProviderModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 shadow-sm transition-all">
                              <Edit2 size={16}/> Edit Configuration
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); handleDelete('provider', p.id); }} className="flex items-center gap-2 px-4 py-2 bg-white border border-red-200 text-red-600 text-sm font-medium rounded-lg hover:bg-red-50 shadow-sm transition-all">
                              <Trash2 size={16}/> Delete Provider
                            </button>
                          </div>
                       </div>
                     )}
                   </div>
                 );
               })}
            </div>
          </div>
        )}
      </main>

      {/* Key Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-900 text-lg">{editingKey ? 'Edit Key' : 'Add Key'}</h3>
              <button onClick={() => setShowKeyModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={22}/></button>
            </div>
            <div className="p-6 space-y-5 overflow-y-auto">
               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1.5">
                   <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Provider</label>
                   <select className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none" value={keyForm.providerId} onChange={e => handleKeyProviderChange(e.target.value)}>
                     <option value="" disabled>Select Provider</option>
                     {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                   </select>
                 </div>
                 <div className="space-y-1.5">
                   <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Name</label>
                   <input className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. Project Alpha" value={keyForm.name} onChange={e => setKeyForm({...keyForm, name: e.target.value})} />
                 </div>
               </div>

               <div className="space-y-1.5">
                 <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">API Key</label>
                 <div className="relative">
                    <Key size={16} className="absolute left-3 top-3 text-gray-400" />
                    <textarea rows={2} className="w-full border border-gray-300 rounded-lg pl-10 pr-3 py-2.5 text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none resize-none" placeholder="sk-..." value={keyForm.key} onChange={e => setKeyForm({...keyForm, key: e.target.value})} />
                 </div>
               </div>

               <div className="space-y-1.5">
                 <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider flex justify-between">Base URL <span className="text-[10px] font-normal normal-case text-gray-400">Auto-filled from provider</span></label>
                 <div className="relative">
                    <Server size={16} className="absolute left-3 top-3 text-gray-400" />
                    <input className="w-full border border-gray-300 rounded-lg pl-10 pr-3 py-2.5 text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none" placeholder="https://..." value={keyForm.baseUrl} onChange={e => setKeyForm({...keyForm, baseUrl: e.target.value})} />
                 </div>
               </div>

               <div className="space-y-1.5">
                 <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Note</label>
                 <textarea rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none" placeholder="Additional context..." value={keyForm.remarks} onChange={e => setKeyForm({...keyForm, remarks: e.target.value})} />
               </div>

               <div className="bg-gray-50/80 p-4 rounded-xl border border-gray-200 space-y-3">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2"><Clock size={14}/> Expiration Settings</label>
                  <div className="flex gap-2 bg-white p-1 rounded-lg border border-gray-200">
                    {['never', 'date', 'duration'].map(t => (
                      <button key={t} onClick={()=>setKeyForm({...keyForm, expireType: t as any})} className={cn("flex-1 py-1.5 text-xs font-medium rounded-md transition-all", keyForm.expireType === t ? "bg-gray-900 text-white shadow-sm" : "text-gray-500 hover:bg-gray-100")}>
                        {t === 'never' ? 'Never' : t === 'date' ? 'Date' : 'Duration'}
                      </button>
                    ))}
                  </div>
                  {keyForm.expireType === 'date' && <input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white" value={keyForm.expireDate} onChange={e => setKeyForm({...keyForm, expireDate: e.target.value})}/>}
                  {keyForm.expireType === 'duration' && (
                     <div className="flex gap-3">
                       {['years', 'months', 'days'].map(unit => (
                         <div key={unit} className="flex-1 relative">
                           <input type="number" min="0" className="w-full border border-gray-300 rounded-lg pl-3 pr-8 py-2 text-center text-sm bg-white" value={(keyForm.duration as any)[unit]} onChange={e => setKeyForm({...keyForm, duration: {...keyForm.duration, [unit]: +e.target.value}})}/>
                           <span className="absolute right-2 top-2 text-[10px] text-gray-400 uppercase">{unit[0]}</span>
                         </div>
                       ))}
                     </div>
                  )}
               </div>
            </div>
            <div className="p-5 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
              <button onClick={() => setShowKeyModal(false)} className="px-5 py-2.5 text-gray-600 text-sm font-medium hover:bg-gray-200 rounded-lg transition-colors">Cancel</button>
              <button onClick={handleSaveKey} className="px-6 py-2.5 bg-gray-900 text-white text-sm font-bold rounded-lg hover:bg-black shadow-lg transition-all hover:shadow-xl">Save Key</button>
            </div>
          </div>
        </div>
      )}

      {/* Provider Modal */}
      {showProviderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-900 text-lg">{editingProvider ? 'Edit Provider' : 'Add Provider'}</h3>
              <button onClick={() => setShowProviderModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={22}/></button>
            </div>
            <div className="p-6 space-y-5 overflow-y-auto">
               <div className="space-y-1.5">
                 <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Provider Name</label>
                 <input className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={providerForm.name} onChange={e => setProviderForm({...providerForm, name: e.target.value})} />
               </div>
               <div className="space-y-1.5">
                 <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Default Base URL <span className="text-red-500">*</span></label>
                 <input className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50" placeholder="e.g. https://api.openai.com/v1" value={providerForm.baseUrl} onChange={e => setProviderForm({...providerForm, baseUrl: e.target.value})} />
                 <p className="text-[10px] text-gray-400">Auto-filled when creating new keys.</p>
               </div>
               <div className="space-y-1.5">
                 <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Dashboard URL</label>
                 <input className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="https://..." value={providerForm.dashboardUrl} onChange={e => setProviderForm({...providerForm, dashboardUrl: e.target.value})} />
               </div>
               <div className="space-y-2">
                 <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Color Theme</label>
                 <div className="flex flex-wrap gap-3">
                    {COLOR_PRESETS.map(c => (
                      <button key={c.name} onClick={() => setProviderForm({...providerForm, color: c.name})} className={cn("w-9 h-9 rounded-full border-2 flex items-center justify-center transition-all", providerForm.color === c.name ? `border-gray-800 scale-110 ${c.ring} ring-4` : "border-transparent hover:scale-105", c.bg)}>
                         <div className={cn("w-3.5 h-3.5 rounded-full", c.text.replace('text', 'bg'))}></div>
                      </button>
                    ))}
                 </div>
               </div>
               <div className="space-y-1.5">
                 <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider flex justify-between">Description <span className="text-gray-400 font-normal lowercase">markdown supported</span></label>
                 <textarea rows={4} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none resize-none" placeholder="# Usage Info..." value={providerForm.description} onChange={e => setProviderForm({...providerForm, description: e.target.value})} />
               </div>
            </div>
            <div className="p-5 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
              <button onClick={() => setShowProviderModal(false)} className="px-5 py-2.5 text-gray-600 text-sm font-medium hover:bg-gray-200 rounded-lg transition-colors">Cancel</button>
              <button onClick={handleSaveProvider} className="px-6 py-2.5 bg-gray-900 text-white text-sm font-bold rounded-lg hover:bg-black shadow-lg transition-all hover:shadow-xl">Save Provider</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
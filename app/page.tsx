'use client';

import React, { useState, useEffect } from 'react';
import { 
  Trash2, Plus, Activity, Key, Server, FileText, X, 
  Loader2, Settings2, Search, Copy, Check, Edit2, Calendar, Clock, Cloud
} from 'lucide-react';
import { PROVIDERS } from './config/providers';

// --- 类型定义 ---
type ApiKeyData = {
  id: string;
  name: string;
  provider: string;
  baseUrl: string;
  key: string;
  remarks: string;
  expiresAt: number | null;
  status: 'unknown' | 'valid' | 'invalid';
  latency?: number;
  lastChecked: string;
};

// --- 子组件 ---
const CopyButton = ({ text, label }: { text: string, label?: string }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} className="group/copy flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all">
      {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
    </button>
  );
};

export default function MacApiKeyManager() {
  // --- State ---
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  
  const [keys, setKeys] = useState<ApiKeyData[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '', provider: 'openai', baseUrl: PROVIDERS['openai'].defaultUrl, key: '', remarks: '',
    expireType: 'never' as 'never' | 'date' | 'duration', expireDate: '', duration: { years: 0, months: 0, days: 0 }
  });

  // --- 关键修复：加固后的获取数据函数 ---
  const fetchKeysFromCloud = async () => {
    setIsLoadingData(true);
    try {
      const res = await fetch('/api/storage', {
        method: 'GET',
        headers: { 
          'x-auth-token': '1006',
          'Cache-Control': 'no-cache' 
        } 
      });

      if (res.ok) {
        const data = await res.json();
        // 只有当 data 确实是数组时才更新状态，否则重置为空数组
        if (Array.isArray(data)) {
          setKeys(data);
        } else {
          console.warn("Invalid data format received, resetting keys.");
          setKeys([]);
        }
      }
    } catch (error) {
      console.error("Failed to load keys", error);
      setKeys([]); // 出错也重置为空，防止页面崩溃
    } finally {
      setIsLoadingData(false);
    }
  };

  const saveKeysToCloud = async (newKeys: ApiKeyData[]) => {
    setIsSaving(true);
    setKeys(newKeys); // 乐观更新
    try {
      await fetch('/api/storage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-auth-token': '1006' },
        body: JSON.stringify(newKeys)
      });
    } catch (error) {
      alert('同步到云端失败');
    } finally {
      setIsSaving(false);
    }
  };

  // --- Effects ---
  useEffect(() => {
    const session = sessionStorage.getItem('mac_auth_token');
    if (session === 'nnwang-1006-session') {
      setIsLoggedIn(true);
      fetchKeysFromCloud();
    }
  }, [isLoggedIn]);

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

  const handleProviderChange = (providerKey: string) => {
    const config = PROVIDERS[providerKey];
    setForm({ ...form, provider: providerKey, baseUrl: config ? config.defaultUrl : '' });
  };

  const openAddModal = () => {
    setEditingId(null);
    setForm({ 
      name: '', provider: 'openai', baseUrl: PROVIDERS['openai'].defaultUrl, key: '', remarks: '',
      expireType: 'never', expireDate: '', duration: { years: 0, months: 1, days: 0 }
    });
    setShowModal(true);
  };

  const openEditModal = (keyData: ApiKeyData) => {
    setEditingId(keyData.id);
    let type: 'never' | 'date' = 'never';
    let dateStr = '';
    if (keyData.expiresAt) {
      type = 'date';
      dateStr = new Date(keyData.expiresAt).toISOString().split('T')[0];
    }
    setForm({
      name: keyData.name, provider: keyData.provider, baseUrl: keyData.baseUrl, key: keyData.key, remarks: keyData.remarks,
      expireType: type, expireDate: dateStr, duration: { years: 0, months: 0, days: 0 }
    });
    setShowModal(true);
  };

  const saveKey = async () => {
    if (!form.name || !form.key) return alert("名称和 API Key 必填");

    let finalExpiresAt: number | null = null;
    if (form.expireType === 'date' && form.expireDate) {
      finalExpiresAt = new Date(form.expireDate).getTime();
    } else if (form.expireType === 'duration') {
      const now = new Date();
      now.setFullYear(now.getFullYear() + Number(form.duration.years || 0));
      now.setMonth(now.getMonth() + Number(form.duration.months || 0));
      now.setDate(now.getDate() + Number(form.duration.days || 0));
      finalExpiresAt = now.getTime();
    }

    const commonData = {
      name: form.name, provider: form.provider, baseUrl: form.baseUrl, key: form.key, remarks: form.remarks, expiresAt: finalExpiresAt
    };

    let updatedKeys: ApiKeyData[];
    if (editingId) {
      updatedKeys = keys.map(k => k.id === editingId ? { ...k, ...commonData, status: (k.key !== form.key ? 'unknown' : k.status) } : k);
    } else {
      const newKey: ApiKeyData = {
        id: Date.now().toString(), ...commonData, status: 'unknown', lastChecked: '-'
      };
      updatedKeys = [newKey, ...keys];
    }

    await saveKeysToCloud(updatedKeys);
    setShowModal(false);
  };

  const deleteKey = async (id: string) => {
    if(!confirm('确定要删除这个 Key 吗？')) return;
    const updated = keys.filter(k => k.id !== id);
    await saveKeysToCloud(updated);
  };

  const checkKey = async (id: string) => {
    setCheckingId(id);
    const target = keys.find(k => k.id === id);
    if (!target) return;
    const startTime = Date.now();
    try {
      const res = await fetch('/api/check', {
        method: 'POST',
        body: JSON.stringify({ provider: target.provider, apiKey: target.key, baseUrl: target.baseUrl }),
      });
      const data = await res.json();
      const endTime = Date.now();
      const updated = keys.map(k => k.id === id ? {
        ...k,
        status: data.success ? 'valid' : 'invalid',
        latency: endTime - startTime,
        lastChecked: new Date().toLocaleString('zh-CN', { hour12: false })
      } as ApiKeyData : k);
      await saveKeysToCloud(updated);
    } catch (e) { alert('检测请求失败'); } finally { setCheckingId(null); }
  };

  const getProviderStyle = (providerKey: string) => {
    const config = PROVIDERS[providerKey];
    return config ? config.colorClass : 'bg-gray-50 text-gray-600 border-gray-100';
  };

  const getExpirationStatus = (timestamp: number | null) => {
    if (!timestamp) return { text: 'Never Expires', color: 'text-gray-400', bg: 'bg-gray-50', icon: Check };
    const now = Date.now();
    const diff = timestamp - now;
    const daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (diff < 0) return { text: '已过期', color: 'text-red-600', bg: 'bg-red-50', icon: X };
    if (daysLeft <= 7) return { text: `${daysLeft} 天后过期`, color: 'text-orange-600', bg: 'bg-orange-50', icon: Clock };
    if (daysLeft <= 30) return { text: `${daysLeft} 天后过期`, color: 'text-yellow-600', bg: 'bg-yellow-50', icon: Calendar };
    return { text: new Date(timestamp).toLocaleDateString(), color: 'text-gray-500', bg: 'bg-gray-50', icon: Calendar };
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
            <Server size={18} className="text-gray-500" /> KeyGuard <span className="text-gray-400 font-normal text-sm bg-gray-100 px-2 py-0.5 rounded-md border border-gray-200">Cloud</span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {isSaving && <span className="text-xs text-gray-400 flex items-center gap-1 animate-pulse"><Cloud size={12}/> Saving...</span>}
          <button onClick={openAddModal} className="bg-[#007aff] hover:bg-[#0062cc] text-white px-4 py-1.5 rounded-lg text-sm font-medium shadow-sm transition-all active:scale-95 flex items-center gap-1.5">
            <Plus size={16} /> Add Key
          </button>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto p-6 sm:p-10">
        <div className="mb-8 flex items-center justify-between text-sm text-gray-500 px-1">
          <p>管理 {keys.length} 个 API 密钥 {isLoadingData && '(加载中...)'}</p>
          {/* 移除时间显示，或者等待客户端加载后再显示 */}
            <p>API Key Manager</p>
        </div>

        {isLoadingData && keys.length === 0 ? (
           <div className="flex flex-col items-center justify-center py-20 text-gray-400">
             <Loader2 size={32} className="animate-spin mb-2 text-blue-500" />
             <p>Syncing from cloud...</p>
           </div>
        ) : (
        <div className="grid gap-5">
          {keys.map((item) => {
            const expireInfo = getExpirationStatus(item.expiresAt);
            const ExpireIcon = expireInfo.icon;
            return (
              <div key={item.id} className="group bg-white p-6 rounded-[20px] border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-all duration-300 relative overflow-visible">
                <div className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-l-[20px] ${item.status === 'valid' ? 'bg-[#34c759]' : item.status === 'invalid' ? 'bg-[#ff3b30]' : 'bg-gray-200'}`}></div>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pl-2">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="text-lg font-semibold text-gray-900 tracking-tight">{item.name}</h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getProviderStyle(item.provider)}`}>{PROVIDERS[item.provider]?.name || 'Unknown'}</span>
                      <div className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border border-transparent ${expireInfo.bg} ${expireInfo.color}`}>
                        <ExpireIcon size={10} />
                        <span className="font-medium">{expireInfo.text}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm text-gray-500">
                      <div className="flex items-center gap-2 font-mono bg-gray-50 px-3 py-1.5 rounded border border-gray-100 w-full sm:w-fit group/item">
                        <Key size={12} className="text-gray-400 shrink-0" />
                        <span className="tracking-widest truncate">{item.key.slice(0, 6)}••••••••{item.key.slice(-4)}</span>
                        <div className="ml-2 pl-2 border-l border-gray-200"><CopyButton text={item.key} label="Key" /></div>
                      </div>
                      <div className="flex items-center gap-2 w-full sm:w-fit max-w-full px-3 py-1.5 rounded hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                        <Settings2 size={12} className="text-gray-400 shrink-0" />
                        <span className="truncate max-w-[180px]" title={item.baseUrl}>{item.baseUrl || 'Default URL'}</span>
                        <CopyButton text={item.baseUrl} label="URL" />
                      </div>
                      {item.remarks && (
                        <div className="flex items-center gap-2 col-span-full text-gray-400 italic mt-1">
                          <FileText size={12} />
                          <span>{item.remarks}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 md:border-l md:pl-6 border-gray-100 justify-between sm:justify-end w-full sm:w-auto">
                    <div className="text-right hidden sm:block min-w-[80px]">
                      <div className={`text-sm font-medium flex items-center justify-end gap-1.5 ${item.status === 'valid' ? 'text-[#34c759]' : item.status === 'invalid' ? 'text-[#ff3b30]' : 'text-gray-400'}`}>
                         {item.status === 'valid' ? 'Available' : item.status === 'invalid' ? 'Failed' : 'Unknown'}
                      </div>
                      <div className="text-[11px] text-gray-400 font-mono mt-1">{item.latency ? `${item.latency}ms` : ''}</div>
                    </div>
                    <div className="flex gap-1.5">
                      <button onClick={() => checkKey(item.id)} disabled={checkingId === item.id} className="h-9 w-9 flex items-center justify-center bg-white border border-gray-200 hover:border-blue-500 hover:text-blue-600 text-gray-600 rounded-lg shadow-sm hover:shadow transition-all disabled:opacity-50" title="Check"><Activity size={16} className={checkingId === item.id ? 'animate-spin' : ''} /></button>
                      <button onClick={() => openEditModal(item)} className="h-9 w-9 flex items-center justify-center bg-white border border-gray-200 hover:border-gray-300 text-gray-600 hover:text-gray-900 rounded-lg shadow-sm hover:shadow transition-all" title="Edit"><Edit2 size={16} /></button>
                      <button onClick={() => deleteKey(item.id)} className="h-9 w-9 flex items-center justify-center bg-white border border-gray-200 hover:border-red-200 text-gray-400 hover:text-red-500 rounded-lg shadow-sm hover:shadow transition-all" title="Delete"><Trash2 size={16} /></button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {keys.length === 0 && <div className="flex flex-col items-center justify-center py-20 text-gray-400 bg-white rounded-[20px] border border-dashed border-gray-200"><Search size={48} className="mb-4 opacity-20" /><p>No keys found. Add one to get started.</p></div>}
        </div>
        )}
      </main>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setShowModal(false)}></div>
          <div className="bg-white/90 backdrop-blur-xl w-full max-w-lg rounded-2xl shadow-2xl border border-white/20 relative z-10 animate-in zoom-in-95 duration-200 p-0 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200/50 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-sm font-semibold text-gray-900">{editingId ? 'Edit API Key' : 'Add New API Key'}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-500 ml-1">Name <span className="text-red-500">*</span></label>
                  <input className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" placeholder="e.g. My Plato Key" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-500 ml-1">Provider</label>
                  <select className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 transition-all appearance-none" value={form.provider} onChange={e => handleProviderChange(e.target.value)}>
                    {Object.entries(PROVIDERS).map(([key, val]) => (<option key={key} value={key}>{val.name}</option>))}
                  </select>
                </div>
              </div>
              
              <div className="space-y-2 bg-gray-50/80 p-3 rounded-xl border border-gray-100">
                <label className="text-xs font-medium text-gray-500 ml-1 flex items-center gap-1"><Clock size={12}/> Validity Period</label>
                <div className="flex bg-gray-200/50 p-1 rounded-lg mb-3">
                  {['never', 'date', 'duration'].map((type) => (
                    <button key={type} onClick={() => setForm({...form, expireType: type as any})} className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-all ${form.expireType === type ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                      {type === 'never' ? 'Never' : type === 'date' ? 'Specific Date' : 'Duration'}
                    </button>
                  ))}
                </div>
                {form.expireType === 'date' && (
                  <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                    <input type="date" className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none" value={form.expireDate} onChange={e => setForm({...form, expireDate: e.target.value})} />
                  </div>
                )}
                {form.expireType === 'duration' && (
                  <div className="flex gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="flex-1 space-y-1">
                      <label className="text-[10px] text-gray-400 uppercase">Years</label>
                      <input type="number" min="0" className="w-full bg-white border border-gray-200 rounded-lg px-2 py-2 text-sm focus:border-blue-500 outline-none text-center" value={form.duration.years} onChange={e => setForm({...form, duration: {...form.duration, years: parseInt(e.target.value)||0}})} />
                    </div>
                    <div className="flex-1 space-y-1">
                      <label className="text-[10px] text-gray-400 uppercase">Months</label>
                      <input type="number" min="0" className="w-full bg-white border border-gray-200 rounded-lg px-2 py-2 text-sm focus:border-blue-500 outline-none text-center" value={form.duration.months} onChange={e => setForm({...form, duration: {...form.duration, months: parseInt(e.target.value)||0}})} />
                    </div>
                    <div className="flex-1 space-y-1">
                      <label className="text-[10px] text-gray-400 uppercase">Days</label>
                      <input type="number" min="0" className="w-full bg-white border border-gray-200 rounded-lg px-2 py-2 text-sm focus:border-blue-500 outline-none text-center" value={form.duration.days} onChange={e => setForm({...form, duration: {...form.duration, days: parseInt(e.target.value)||0}})} />
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500 ml-1">Base URL</label>
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
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200/50 rounded-lg transition-colors">Cancel</button>
              <button onClick={saveKey} className="px-6 py-2 text-sm font-medium text-white bg-[#007aff] hover:bg-[#0062cc] rounded-lg shadow-sm transition-colors">{isSaving ? 'Saving...' : (editingId ? 'Update' : 'Save')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
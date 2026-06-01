import React, { useState, useEffect } from 'react';
import { Search, History, FolderHeart } from 'lucide-react';
import api from './api';
import type { Adapter } from './types';
import SearchSection from './sections/SearchSection';
import HistorySection from './sections/HistorySection';
import CollectionsSection from './sections/CollectionsSection';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'home' | 'history' | 'collections'>('home');
  const [adapters, setAdapters] = useState<Adapter[]>([]);
  const [selectedAdapterId, setSelectedAdapterId] = useState<string>(localStorage.getItem('magnetPreferredAdapter') || '');
  const [isLoadingAdapters, setIsLoadingAdapters] = useState(false);

  useEffect(() => {
    const fetchAdapters = async () => {
      setIsLoadingAdapters(true);
      try {
        const response = await api.get('/api/adapters');
        const data = response.data;
        setAdapters(data.adapters || []);
        
        let defaultId = data.defaultAdapter || (data.adapters?.[0]?.id ?? '');
        if (!selectedAdapterId || !data.adapters?.find((a: Adapter) => a.id === selectedAdapterId)) {
          setSelectedAdapterId(defaultId);
        }
      } catch (error) {
        console.error('Failed to fetch adapters', error);
      } finally {
        setIsLoadingAdapters(false);
      }
    };
    fetchAdapters();
  }, []);

  useEffect(() => {
    if (selectedAdapterId) {
      localStorage.setItem('magnetPreferredAdapter', selectedAdapterId);
    }
  }, [selectedAdapterId]);

  const currentAdapter = adapters.find(a => a.id === selectedAdapterId);

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 font-sans">
      <header className="sticky top-0 z-10 glass-dark border-b border-white/10 px-4 py-3">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
              本地磁力搜索预览
            </h1>
            <p className="text-xs text-slate-400">快速获取磁力预览卡片</p>
          </div>
          
          <nav className="flex bg-slate-800/50 p-1 rounded-lg self-start md:self-center">
            <button
              onClick={() => setActiveTab('home')}
              className={cn(
                "flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all",
                activeTab === 'home' ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20" : "text-slate-400 hover:text-slate-200"
              )}
            >
              <Search size={16} />
              首页
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={cn(
                "flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all",
                activeTab === 'history' ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20" : "text-slate-400 hover:text-slate-200"
              )}
            >
              <History size={16} />
              历史
            </button>
            <button
              onClick={() => setActiveTab('collections')}
              className={cn(
                "flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all",
                activeTab === 'collections' ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20" : "text-slate-400 hover:text-slate-200"
              )}
            >
              <FolderHeart size={16} />
              收藏集
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 md:p-6 min-h-[calc(100vh-130px)]">
        {activeTab === 'home' && (
          <SearchSection 
            adapters={adapters} 
            selectedAdapterId={selectedAdapterId} 
            setSelectedAdapterId={setSelectedAdapterId}
            isLoadingAdapters={isLoadingAdapters}
          />
        )}
        {activeTab === 'history' && <HistorySection />}
        {activeTab === 'collections' && <CollectionsSection />}
      </main>

      <footer className="border-t border-white/5 bg-slate-900/50 py-4 px-6 text-center md:text-left">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-2 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            <span>前端已连接至后端</span>
            <span className="mx-1">•</span>
            <span>当前适配器: <strong className="text-slate-300">{currentAdapter?.name || '加载中...'}</strong></span>
          </div>
          <div className="flex items-center gap-3">
             <span>{currentAdapter?.endpoint === 'local-data' ? '本地数据' : currentAdapter?.endpoint || ''}</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;

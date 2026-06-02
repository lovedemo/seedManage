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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 text-slate-800 font-sans transition-colors duration-500">
      <header className="sticky top-0 z-10 glass border-b border-white/20 px-4 py-3">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              本地磁力搜索预览
            </h1>
            <p className="text-xs text-slate-500 font-medium">快速获取磁力预览卡片</p>
          </div>
          
          <nav className="flex bg-slate-200/50 p-1 rounded-xl self-start md:self-center border border-white/50">
            <button
              onClick={() => setActiveTab('home')}
              className={cn(
                "flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all",
                activeTab === 'home' ? "bg-white text-blue-600 shadow-sm border border-white/50" : "text-slate-500 hover:text-slate-800"
              )}
            >
              <Search size={16} />
              首页
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={cn(
                "flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all",
                activeTab === 'history' ? "bg-white text-blue-600 shadow-sm border border-white/50" : "text-slate-500 hover:text-slate-800"
              )}
            >
              <History size={16} />
              历史
            </button>
            <button
              onClick={() => setActiveTab('collections')}
              className={cn(
                "flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all",
                activeTab === 'collections' ? "bg-white text-blue-600 shadow-sm border border-white/50" : "text-slate-500 hover:text-slate-800"
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
        {activeTab === 'collections' && <CollectionsSection selectedAdapterId={selectedAdapterId} adapters={adapters} />}
      </main>

      <footer className="border-t border-white/20 bg-white/30 backdrop-blur-md py-4 px-6 text-center md:text-left">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-2 text-xs text-slate-500 font-medium">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            <span>前端已连接至后端</span>
            <span className="mx-1">•</span>
            <span>当前适配器: <strong className="text-slate-700">{currentAdapter?.name || '加载中...'}</strong></span>
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

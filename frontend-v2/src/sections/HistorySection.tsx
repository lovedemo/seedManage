import React, { useState, useEffect } from 'react';
import { History, RefreshCw, Trash2, ChevronDown, ChevronUp, Loader2, Search, Copy, ExternalLink } from 'lucide-react';
import api from '../api';
import type { HistoryItem } from '../types';

const HistorySection: React.FC = () => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/api/history');
      setHistory(response.data || []);
    } catch (error) {
      console.error('Failed to fetch history', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const deleteHistory = async (id: string) => {
    try {
      await api.delete(`/api/history/${id}`);
      setHistory(history.filter(item => item.id !== id));
    } catch (error) {
      console.error('Failed to delete history', error);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 rounded-xl">
            <History className="text-blue-400" size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-100">搜索历史</h2>
            <p className="text-xs text-slate-500">最多保存 50 条历史记录，每条最近 20 个结果。</p>
          </div>
        </div>
        <button
          onClick={fetchHistory}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
        >
          <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          刷新
        </button>
      </div>

      <div className="space-y-3">
        {isLoading && history.length === 0 ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-blue-500" size={40} />
          </div>
        ) : history.length > 0 ? (
          history.map((item) => (
            <div key={item.id} className="glass rounded-xl overflow-hidden border border-white/5 transition-all hover:border-white/10">
              <header 
                className="p-4 flex items-center justify-between cursor-pointer select-none"
                onClick={() => toggleExpand(item.id)}
              >
                <div className="flex items-center gap-4 flex-grow">
                  <div className="bg-slate-900/50 p-2 rounded-lg text-slate-400">
                    <Search size={18} />
                  </div>
                  <div className="flex-grow min-w-0">
                    <h3 className="font-semibold text-slate-200 truncate">{item.query}</h3>
                    <div className="flex items-center gap-3 mt-0.5 text-[10px] text-slate-500">
                      <span>{new Date(item.timestamp).toLocaleString()}</span>
                      <span>•</span>
                      <span>{item.adapterName || item.adapter}</span>
                      <span>•</span>
                      <span>{item.resultsCount} 个结果</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteHistory(item.id);
                    }}
                    className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                  <div className="p-2 text-slate-500">
                    {expandedId === item.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                </div>
              </header>

              {expandedId === item.id && (
                <div className="px-4 pb-4 border-t border-white/5 bg-slate-900/20">
                  <div className="pt-4 space-y-2">
                    {item.results && item.results.length > 0 ? (
                      item.results.map((res, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-white/[0.02] rounded-lg border border-white/5 group">
                          <div className="flex-grow min-w-0 pr-4">
                            <h4 className="text-xs font-medium text-slate-300 truncate group-hover:text-blue-300 transition-colors">
                              {res.title}
                            </h4>
                            <div className="flex items-center gap-2 mt-1 text-[9px] text-slate-500">
                              <span>{res.sizeLabel || (res.size ? `${res.size} B` : '')}</span>
                              {res.category && <span>• {res.category}</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                             <button 
                                onClick={() => {
                                   if(res.magnet) navigator.clipboard.writeText(res.magnet);
                                }}
                                className="p-1.5 hover:bg-slate-700 rounded-md text-slate-400 hover:text-white"
                                title="复制磁链"
                             >
                                <Copy size={14} />
                             </button>
                             <button 
                                onClick={() => {
                                   if(res.magnet) window.open(res.magnet, '_blank');
                                }}
                                className="p-1.5 hover:bg-slate-700 rounded-md text-slate-400 hover:text-white"
                                title="打开"
                             >
                                <ExternalLink size={14} />
                             </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-center py-4 text-xs text-slate-500 italic">无结果</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="text-center py-20 glass rounded-2xl">
            <p className="text-slate-500">暂无搜索历史</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default HistorySection;

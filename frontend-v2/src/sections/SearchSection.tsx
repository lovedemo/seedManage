import React, { useState } from 'react';
import { Search as SearchIcon, Loader2, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../api';
import type { Adapter, SearchResult, SearchMeta } from '../types';
import ResultCard from '../components/ResultCard';

interface SearchSectionProps {
  adapters: Adapter[];
  selectedAdapterId: string;
  setSelectedAdapterId: (id: string) => void;
  isLoadingAdapters: boolean;
}

const SearchSection: React.FC<SearchSectionProps> = ({ 
  adapters, 
  selectedAdapterId, 
  setSelectedAdapterId,
  isLoadingAdapters
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [meta, setMeta] = useState<SearchMeta>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [jumpPage, setJumpPage] = useState('1');

  const handleSearch = async (e?: React.FormEvent, searchPage = 1) => {
    e?.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    setError(null);
    setPage(searchPage);
    setJumpPage(searchPage.toString());

    try {
      const params = new URLSearchParams();
      params.set('q', query);
      if (selectedAdapterId) params.set('adapter', selectedAdapterId);
      if (searchPage > 1) params.set('page', searchPage.toString());

      const response = await api.get(`/api/search?${params.toString()}`);
      setResults(response.data.results || []);
      setMeta(response.data.meta || {});
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || '搜索失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    handleSearch(undefined, newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleJumpPage = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseInt(jumpPage);
    if (!isNaN(p) && p > 0 && (!meta.totalPages || p <= meta.totalPages)) {
      handlePageChange(p);
    }
  };

  const currentAdapter = adapters.find(a => a.id === selectedAdapterId);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <section className="glass p-6 rounded-2xl space-y-4">
        <form onSubmit={(e) => handleSearch(e, 1)} className="space-y-4">
          <div className="relative group">
            <label htmlFor="search" className="block text-sm font-medium text-slate-400 mb-1.5 ml-1">
              搜索关键字 / 磁力链接
            </label>
            <div className="relative flex gap-2">
              <div className="relative flex-grow">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={18} />
                <input
                  id="search"
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="例如：Ubuntu ISO 或 magnet:?xt=..."
                  className="w-full bg-slate-900/50 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/50 transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading || !query.trim()}
                className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 px-6 py-3 rounded-xl font-semibold text-white transition-all shadow-lg shadow-blue-900/20 active:scale-95 flex items-center gap-2"
              >
                {isLoading ? <Loader2 className="animate-spin" size={18} /> : <SearchIcon size={18} />}
                <span>搜索</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
            <div className="space-y-1.5">
              <label htmlFor="adapter" className="block text-sm font-medium text-slate-400 ml-1">
                数据源适配器
              </label>
              <select
                id="adapter"
                value={selectedAdapterId}
                onChange={(e) => setSelectedAdapterId(e.target.value)}
                disabled={isLoadingAdapters || isLoading}
                className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all appearance-none cursor-pointer"
              >
                {isLoadingAdapters ? (
                  <option>加载中...</option>
                ) : (
                  adapters.map(adapter => (
                    <option key={adapter.id} value={adapter.id}>
                      {adapter.name}{adapter.default ? ' (默认)' : ''}{adapter.fallback ? ' (备用)' : ''}
                    </option>
                  ))
                )}
              </select>
            </div>
            {currentAdapter && (
              <p className="text-xs text-slate-500 italic pb-2 md:pb-3">
                {currentAdapter.description || '无描述'}
              </p>
            )}
          </div>
        </form>
        <p className="text-xs text-slate-500 bg-slate-900/30 p-3 rounded-lg border border-white/5">
          提示：粘贴磁链可直接生成预览，不会请求远程适配器。磁力链接识别为本地模式。
        </p>
      </section>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-center gap-3">
          <AlertCircle size={20} />
          <p>{error}</p>
        </div>
      )}

      <section className="space-y-6">
        {isLoading && results.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-4">
            <Loader2 className="animate-spin text-blue-500" size={40} />
            <p>正在搜索资源，请稍候...</p>
          </div>
        ) : results.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {results.map((result, idx) => (
                <ResultCard key={idx} result={result} meta={meta} />
              ))}
            </div>

            {/* Pagination */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 glass p-4 rounded-2xl border border-white/5">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={!meta.hasPrevPage || isLoading}
                  className="p-2 rounded-lg bg-slate-800/50 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={20} />
                </button>
                <span className="text-sm px-4">
                  第 <span className="font-bold text-blue-400">{meta.currentPage || page}</span> 页
                  {meta.totalPages && <span> / 共 {meta.totalPages} 页</span>}
                </span>
                <button
                  onClick={() => handlePageChange(page + 1)}
                  disabled={!meta.hasNextPage || isLoading}
                  className="p-2 rounded-lg bg-slate-800/50 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight size={20} />
                </button>
              </div>

              <form onSubmit={handleJumpPage} className="flex items-center gap-2">
                <span className="text-sm text-slate-500">跳转到:</span>
                <input
                  type="number"
                  min="1"
                  max={meta.totalPages}
                  value={jumpPage}
                  onChange={(e) => setJumpPage(e.target.value)}
                  className="w-16 bg-slate-900/50 border border-white/10 rounded-lg px-2 py-1 text-center text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                />
                <button 
                  type="submit"
                  className="text-sm bg-slate-800 hover:bg-slate-700 px-3 py-1 rounded-lg transition-colors"
                >
                  跳转
                </button>
              </form>
            </div>
          </>
        ) : !isLoading && query && (
          <div className="text-center py-20 glass rounded-2xl">
            <p className="text-slate-500">未找到结果</p>
          </div>
        )}
      </section>
    </div>
  );
};

export default SearchSection;

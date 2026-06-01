import React, { useState, useEffect, useCallback } from 'react';
import { 
  ArrowLeft, Search, Trash2, Star, ChevronLeft, ChevronRight, 
  Loader2, Plus, Import, CheckSquare, Square, 
  ExternalLink, Copy, ChevronDown, ChevronUp, AlertCircle
} from 'lucide-react';
import api from '../api';
import type { CollectionItem } from '../types';
import AddItemModal from '../components/AddItemModal';

interface CollectionDetailProps {
  collectionId: string;
  collectionName: string;
  onBack: () => void;
  onRefreshCollections: () => void;
}

const CollectionDetail: React.FC<CollectionDetailProps> = ({ 
  collectionId, 
  collectionName, 
  onBack,
  onRefreshCollections
}) => {
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [starFilter, setStarFilter] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const endpoint = searchQuery 
        ? `/api/collections/${collectionId}/items/search`
        : `/api/collections/${collectionId}/items`;
      
      const response = await api.get(endpoint, {
        params: {
          q: searchQuery,
          page,
          starred: starFilter ? 'true' : undefined
        }
      });
      
      setItems(response.data.items || []);
      setTotalPages(response.data.totalPages || 1);
    } catch (error: any) {
      console.error('Failed to fetch items', error);
      setError(error.response?.data?.error || error.message || '获取条目失败');
    } finally {
      setIsLoading(false);
    }
  }, [collectionId, searchQuery, page, starFilter]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const deleteItems = async (ids: string[]) => {
    if (!window.confirm(`确定要删除选中的 ${ids.length} 个条目吗？`)) return;
    setError(null);
    try {
      await api.delete(`/api/collections/${collectionId}/items`, { data: { magnets: ids } });
      setItems(items.filter(item => !ids.includes(item.magnet)));
      setSelectedIds(new Set());
      onRefreshCollections();
    } catch (error: any) {
      console.error('Failed to delete items', error);
      setError(error.response?.data?.error || error.message || '删除条目失败');
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const selectAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map(i => i.magnet)));
    }
  };

  const handleImportCSV = () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.csv';
    fileInput.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (!file) return;

      setIsLoading(true);
      try {
        const buffer = await file.arrayBuffer();
        let text;
        try {
          text = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
        } catch {
          text = new TextDecoder('gbk').decode(buffer);
        }

        const utf8Blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
        const utf8File = new File([utf8Blob], file.name, { type: 'text/csv' });
        
        const formData = new FormData();
        formData.append('file', utf8File);

        await api.post(`/api/collections/${collectionId}/import`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        
        fetchItems();
        onRefreshCollections();
      } catch (error) {
        console.error('CSV Import failed', error);
      } finally {
        setIsLoading(false);
      }
    };
    fileInput.click();
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-400 hover:text-slate-800"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">{collectionName}</h2>
            <p className="text-xs text-slate-500 font-medium">共 {items.length} 个条目</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddItemModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-xl text-sm font-semibold text-white transition-all shadow-md shadow-blue-500/10 active:scale-95"
          >
            <Plus size={18} />
            添加条目
          </button>
          <button
            onClick={handleImportCSV}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 border border-white/80 rounded-xl text-sm font-semibold text-slate-700 transition-all disabled:opacity-50 shadow-sm"
          >
            <Import size={18} className={isLoading ? 'animate-spin' : ''} />
            导入 CSV
          </button>
        </div>
      </header>

      <div className="glass p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-grow w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="搜索当前集合..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/60 border border-white/80 rounded-xl py-2 pl-10 pr-4 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all shadow-sm"
          />
        </div>
        <label className="flex items-center gap-2 cursor-pointer select-none whitespace-nowrap">
          <input
            type="checkbox"
            checked={starFilter}
            onChange={(e) => setStarFilter(e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 bg-white text-blue-600 focus:ring-blue-500/40 shadow-sm"
          />
          <span className="text-sm text-slate-600 font-semibold flex items-center gap-1">
            <Star size={14} className={starFilter ? 'fill-yellow-500 text-yellow-500' : ''} />
            仅显示星标
          </span>
        </label>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-600 p-4 rounded-xl flex items-center gap-3 animate-in fade-in duration-300">
          <AlertCircle size={20} />
          <p className="font-medium text-sm">{error}</p>
        </div>
      )}

      {selectedIds.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl flex items-center justify-between animate-in slide-in-from-top-2 shadow-sm">
          <span className="text-sm font-bold text-blue-600 ml-2">已选择 {selectedIds.size} 项</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => deleteItems(Array.from(selectedIds))}
              className="flex items-center gap-2 px-4 py-1.5 bg-red-600 hover:bg-red-700 rounded-lg text-xs font-bold text-white transition-all shadow-sm"
            >
              <Trash2 size={14} />
              批量删除
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 transition-all shadow-sm"
            >
              取消
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {isLoading && items.length === 0 ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-blue-500" size={40} />
          </div>
        ) : items.length > 0 ? (
          <>
            <div className="flex items-center px-4 py-2 text-xs text-slate-500 font-bold">
               <button onClick={selectAll} className="mr-4 hover:text-blue-600 transition-colors">
                  {selectedIds.size === items.length ? <CheckSquare size={18} className="text-blue-600" /> : <Square size={18} />}
               </button>
               <div className="grid grid-cols-12 gap-4 w-full">
                  <span className="col-span-8">资源名称</span>
                  <span className="col-span-2 text-center">大小</span>
                  <span className="col-span-2 text-right">操作</span>
               </div>
            </div>
            {items.map((item) => (
              <div 
                key={item.magnet} 
                className={`glass rounded-xl border border-white/80 overflow-hidden transition-all hover:bg-white/80 ${selectedIds.has(item.magnet) ? 'border-blue-400 bg-blue-50/50 shadow-md' : 'shadow-sm'}`}
              >
                <div className="p-4 flex items-center gap-4">
                  <button 
                    onClick={() => toggleSelect(item.magnet)}
                    className={`shrink-0 transition-colors ${selectedIds.has(item.magnet) ? 'text-blue-600' : 'text-slate-300 hover:text-slate-500'}`}
                  >
                    {selectedIds.has(item.magnet) ? <CheckSquare size={18} /> : <Square size={18} />}
                  </button>
                  
                  <div className="grid grid-cols-12 gap-4 w-full items-center">
                    <div className="col-span-8 min-w-0" onClick={() => setExpandedId(expandedId === item.magnet ? null : item.magnet)}>
                      <h4 className="text-sm font-bold text-slate-800 truncate cursor-pointer hover:text-blue-600 transition-colors">
                        {item.title || '未命名资源'}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        {item.keywords?.split(' ').filter(kw => kw).map(kw => (
                          <span key={kw} className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200 font-bold">{kw}</span>
                        ))}
                      </div>
                    </div>
                    <div className="col-span-2 text-center text-xs text-slate-500 font-medium">
                      {item.sizeLabel || (item.size ? `${item.size} B` : '-')}
                    </div>
                    <div className="col-span-2 flex items-center justify-end gap-1">
                       <button className="p-1.5 text-slate-400 hover:text-yellow-500 transition-colors">
                          <Star size={16} className={item.starred ? 'fill-yellow-500 text-yellow-500' : ''} />
                       </button>
                       <button 
                          onClick={() => setExpandedId(expandedId === item.magnet ? null : item.magnet)}
                          className="p-1.5 text-slate-400 hover:text-slate-800 transition-colors"
                       >
                          {expandedId === item.magnet ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                       </button>
                    </div>
                  </div>
                </div>

                {expandedId === item.magnet && (
                  <div className="px-14 pb-4 animate-in slide-in-from-top-2">
                    <div className="p-4 bg-white/40 rounded-xl border border-white/80 space-y-4 shadow-inner">
                       <div className="space-y-1">
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">磁力链接</p>
                          <div className="flex items-center gap-2">
                             <code className="text-xs text-blue-700 break-all bg-blue-50/50 p-2 rounded-lg border border-blue-200 flex-grow font-medium">
                                {item.magnet}
                             </code>
                             <div className="flex flex-col gap-2 shrink-0">
                                <button 
                                   onClick={() => navigator.clipboard.writeText(item.magnet)}
                                   className="p-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-500 shadow-sm"
                                   title="复制"
                                >
                                   <Copy size={14} />
                                </button>
                                <button 
                                   onClick={() => window.open(item.magnet, '_blank')}
                                   className="p-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg text-blue-600 shadow-sm"
                                   title="打开"
                                >
                                   <ExternalLink size={14} />
                                </button>
                             </div>
                          </div>
                       </div>
                       {item.remarks && (
                         <div className="space-y-1">
                            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">备注</p>
                            <p className="text-sm text-slate-600 leading-relaxed font-medium">{item.remarks}</p>
                         </div>
                       )}
                       <div className="flex justify-end pt-2">
                          <button 
                             onClick={() => deleteItems([item.magnet])}
                             className="flex items-center gap-2 px-3 py-1.5 text-red-500 hover:bg-red-50 rounded-lg text-xs font-bold transition-all"
                          >
                             <Trash2 size={14} />
                             从集合删除
                          </button>
                       </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
            
            {/* Pagination */}
            <div className="flex justify-center gap-4 pt-4">
               <button
                  disabled={page === 1 || isLoading}
                  onClick={() => setPage(page - 1)}
                  className="p-2 bg-white hover:bg-slate-100 border border-white/80 rounded-lg disabled:opacity-30 shadow-sm transition-colors"
               >
                  <ChevronLeft size={20} />
               </button>
               <span className="flex items-center text-sm font-bold text-slate-600">
                  {page} / {totalPages}
               </span>
               <button
                  disabled={page === totalPages || isLoading}
                  onClick={() => setPage(page + 1)}
                  className="p-2 bg-white hover:bg-slate-100 border border-white/80 rounded-lg disabled:opacity-30 shadow-sm transition-colors"
               >
                  <ChevronRight size={20} />
               </button>
            </div>
          </>
        ) : (
          <div className="text-center py-20 glass rounded-2xl">
            <p className="text-slate-500 font-medium">集合中暂无内容</p>
          </div>
        )}
      </div>

      <AddItemModal 
        isOpen={isAddItemModalOpen}
        onClose={() => setIsAddItemModalOpen(false)}
        collectionId={collectionId}
        onSuccess={() => {
          fetchItems();
          onRefreshCollections();
        }}
      />
    </div>
  );
};

export default CollectionDetail;

import React, { useState, useEffect, useCallback } from 'react';
import { 
  ArrowLeft, Search, Trash2, Star, ChevronLeft, ChevronRight, 
  Loader2, Plus, Import, CheckSquare, Square, 
  ExternalLink, Copy, ChevronDown, ChevronUp
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

  const fetchItems = useCallback(async () => {
    setIsLoading(true);
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
    } catch (error) {
      console.error('Failed to fetch items', error);
    } finally {
      setIsLoading(false);
    }
  }, [collectionId, searchQuery, page, starFilter]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const deleteItems = async (ids: string[]) => {
    if (!window.confirm(`确定要删除选中的 ${ids.length} 个条目吗？`)) return;
    try {
      await api.delete(`/api/collections/${collectionId}/items`, { data: { magnets: ids } });
      setItems(items.filter(item => !ids.includes(item.magnet)));
      setSelectedIds(new Set());
      onRefreshCollections();
    } catch (error) {
      console.error('Failed to delete items', error);
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
            className="p-2 hover:bg-slate-800 rounded-xl transition-all text-slate-400 hover:text-white"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-slate-100">{collectionName}</h2>
            <p className="text-xs text-slate-500">共 {items.length} 个条目</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddItemModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-semibold text-white transition-all shadow-lg"
          >
            <Plus size={18} />
            添加条目
          </button>
          <button
            onClick={handleImportCSV}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
          >
            <Import size={18} className={isLoading ? 'animate-spin' : ''} />
            导入 CSV
          </button>
        </div>
      </header>

      <div className="glass p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-grow w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input
            type="text"
            placeholder="搜索当前集合..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900/50 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
          />
        </div>
        <label className="flex items-center gap-2 cursor-pointer select-none whitespace-nowrap">
          <input
            type="checkbox"
            checked={starFilter}
            onChange={(e) => setStarFilter(e.target.checked)}
            className="w-4 h-4 rounded border-white/10 bg-slate-900 text-blue-600 focus:ring-blue-500/40"
          />
          <span className="text-sm text-slate-300 flex items-center gap-1">
            <Star size={14} className={starFilter ? 'fill-yellow-500 text-yellow-500' : ''} />
            仅显示星标
          </span>
        </label>
      </div>

      {selectedIds.size > 0 && (
        <div className="bg-blue-600/20 border border-blue-500/30 p-3 rounded-xl flex items-center justify-between animate-in slide-in-from-top-2">
          <span className="text-sm font-medium text-blue-300 ml-2">已选择 {selectedIds.size} 项</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => deleteItems(Array.from(selectedIds))}
              className="flex items-center gap-2 px-4 py-1.5 bg-red-600/80 hover:bg-red-600 rounded-lg text-xs font-bold transition-all"
            >
              <Trash2 size={14} />
              批量删除
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-medium transition-all"
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
            <div className="flex items-center px-4 py-2 text-xs text-slate-500 font-medium">
               <button onClick={selectAll} className="mr-4 hover:text-slate-300 transition-colors">
                  {selectedIds.size === items.length ? <CheckSquare size={18} className="text-blue-400" /> : <Square size={18} />}
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
                className={`glass rounded-xl border border-white/5 overflow-hidden transition-all hover:bg-white/[0.02] ${selectedIds.has(item.magnet) ? 'border-blue-500/40 bg-blue-500/5' : ''}`}
              >
                <div className="p-4 flex items-center gap-4">
                  <button 
                    onClick={() => toggleSelect(item.magnet)}
                    className={`shrink-0 transition-colors ${selectedIds.has(item.magnet) ? 'text-blue-400' : 'text-slate-600 hover:text-slate-400'}`}
                  >
                    {selectedIds.has(item.magnet) ? <CheckSquare size={18} /> : <Square size={18} />}
                  </button>
                  
                  <div className="grid grid-cols-12 gap-4 w-full items-center">
                    <div className="col-span-8 min-w-0" onClick={() => setExpandedId(expandedId === item.magnet ? null : item.magnet)}>
                      <h4 className="text-sm font-semibold text-slate-200 truncate cursor-pointer hover:text-blue-300 transition-colors">
                        {item.title || '未命名资源'}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        {item.keywords?.map(kw => (
                          <span key={kw} className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-white/5">{kw}</span>
                        ))}
                      </div>
                    </div>
                    <div className="col-span-2 text-center text-xs text-slate-500">
                      {item.sizeLabel || (item.size ? `${item.size} B` : '-')}
                    </div>
                    <div className="col-span-2 flex items-center justify-end gap-1">
                       <button className="p-1.5 text-slate-500 hover:text-yellow-500 transition-colors">
                          <Star size={16} className={item.starred ? 'fill-yellow-500 text-yellow-500' : ''} />
                       </button>
                       <button 
                          onClick={() => setExpandedId(expandedId === item.magnet ? null : item.magnet)}
                          className="p-1.5 text-slate-500 hover:text-white transition-colors"
                       >
                          {expandedId === item.magnet ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                       </button>
                    </div>
                  </div>
                </div>

                {expandedId === item.magnet && (
                  <div className="px-14 pb-4 animate-in slide-in-from-top-2">
                    <div className="p-4 bg-slate-900/40 rounded-xl border border-white/5 space-y-4">
                       <div className="space-y-1">
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">磁力链接</p>
                          <div className="flex items-center gap-2">
                             <code className="text-xs text-blue-400 break-all bg-blue-500/5 p-2 rounded-lg border border-blue-500/10 flex-grow">
                                {item.magnet}
                             </code>
                             <div className="flex flex-col gap-2 shrink-0">
                                <button 
                                   onClick={() => navigator.clipboard.writeText(item.magnet)}
                                   className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300"
                                   title="复制"
                                >
                                   <Copy size={14} />
                                </button>
                                <button 
                                   onClick={() => window.open(item.magnet, '_blank')}
                                   className="p-2 bg-blue-600/20 hover:bg-blue-600/30 rounded-lg text-blue-400"
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
                            <p className="text-sm text-slate-400 leading-relaxed">{item.remarks}</p>
                         </div>
                       )}
                       <div className="flex justify-end pt-2">
                          <button 
                             onClick={() => deleteItems([item.magnet])}
                             className="flex items-center gap-2 px-3 py-1.5 text-red-400 hover:bg-red-400/10 rounded-lg text-xs transition-all"
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
                  className="p-2 bg-slate-800 rounded-lg disabled:opacity-30"
               >
                  <ChevronLeft size={20} />
               </button>
               <span className="flex items-center text-sm">
                  {page} / {totalPages}
               </span>
               <button
                  disabled={page === totalPages || isLoading}
                  onClick={() => setPage(page + 1)}
                  className="p-2 bg-slate-800 rounded-lg disabled:opacity-30"
               >
                  <ChevronRight size={20} />
               </button>
            </div>
          </>
        ) : (
          <div className="text-center py-20 glass rounded-2xl">
            <p className="text-slate-500">集合中暂无内容</p>
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

import React, { useState, useEffect } from 'react';
import { FolderHeart, Plus, Trash2, Loader2, AlertCircle } from 'lucide-react';
import api from '../api';
import type { Collection } from '../types';
import CollectionDetail from './CollectionDetail';
import AddCollectionModal from '../components/AddCollectionModal';

interface CollectionsSectionProps {
  selectedAdapterId: string;
}

const CollectionsSection: React.FC<CollectionsSectionProps> = ({ selectedAdapterId }) => {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCollections = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get('/api/collections');
      setCollections(response.data.collections || []);
    } catch (error: any) {
      console.error('Failed to fetch collections', error);
      setError(error.response?.data?.error || error.message || '获取收藏集失败');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCollections();
  }, []);

  const deleteCollection = async (id: string) => {
    if (!window.confirm('确定要删除这个收藏集吗？这将删除其中的所有条目。')) return;
    setError(null);
    try {
      await api.delete(`/api/collections/${id}`);
      setCollections(collections.filter(c => c.id !== id));
      if (selectedCollectionId === id) setSelectedCollectionId(null);
    } catch (error: any) {
      console.error('Failed to delete collection', error);
      setError(error.response?.data?.error || error.message || '删除收藏集失败');
    }
  };

  const createCollection = async (name: string) => {
    setError(null);
    try {
      const response = await api.post('/api/collections', { name });
      const newCollection = response.data.collection || response.data;
      if (newCollection.id) {
        setCollections([...collections, newCollection]);
      } else if (Array.isArray(response.data)) {
        setCollections(response.data);
      }
      setIsAddModalOpen(false);
    } catch (error: any) {
      console.error('Failed to create collection', error);
      setError(error.response?.data?.error || error.message || '创建收藏集失败');
    }
  };

  if (selectedCollectionId) {
    const collection = collections.find(c => c.id === selectedCollectionId);
    return (
      <CollectionDetail 
        collectionId={selectedCollectionId} 
        collectionName={collection?.name || '未知集合'} 
        onBack={() => setSelectedCollectionId(null)}
        onRefreshCollections={fetchCollections}
        selectedAdapterId={selectedAdapterId}
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-pink-100 rounded-xl">
            <FolderHeart className="text-pink-500" size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">收藏集</h2>
            <p className="text-xs text-slate-500 font-medium">管理和组织你的磁力链接收藏。</p>
          </div>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-xl text-sm font-semibold text-white transition-all shadow-md shadow-blue-500/10 active:scale-95"
        >
          <Plus size={18} />
          新建收藏集
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-600 p-4 rounded-xl flex items-center gap-3 animate-in fade-in duration-300">
          <AlertCircle size={20} />
          <p className="font-medium text-sm">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading && collections.length === 0 ? (
          <div className="col-span-full flex justify-center py-20">
            <Loader2 className="animate-spin text-blue-500" size={40} />
          </div>
        ) : collections.length > 0 ? (
          collections.map((collection) => (
            <div 
              key={collection.id} 
              className="glass p-5 rounded-2xl border border-white/80 hover:border-blue-200 transition-all group relative cursor-pointer shadow-sm hover:shadow-md"
              onClick={() => setSelectedCollectionId(collection.id)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-slate-100 rounded-xl group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                  <FolderHeart size={28} />
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteCollection(collection.id);
                  }}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 size={18} />
                </button>
              </div>
              <h3 className="font-bold text-slate-800 text-lg mb-1">{collection.name}</h3>
              <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                <span>{collection.itemCount} 条目</span>
                <span>•</span>
                <span>更新于 {new Date(collection.updatedAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-20 glass rounded-2xl">
            <p className="text-slate-500 font-medium">暂无收藏集，点击右上角新建。</p>
          </div>
        )}
      </div>

      <AddCollectionModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onSubmit={createCollection} 
      />
    </div>
  );
};

export default CollectionsSection;

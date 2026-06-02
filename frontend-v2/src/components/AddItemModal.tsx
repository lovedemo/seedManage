import React, { useState } from 'react';
import { X, Loader2, AlertCircle } from 'lucide-react';
import api from '../api';

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  collectionId: string;
  onSuccess: () => void;
}

const AddItemModal: React.FC<AddItemModalProps> = ({ isOpen, onClose, collectionId, onSuccess }) => {
  const [tab, setTab] = useState<'single' | 'batch'>('single');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    magnet: '',
    title: '',
    keywords: '',
    remarks: ''
  });
  const [batchContent, setBatchContent] = useState('');

  if (!isOpen) return null;

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.magnet.trim()) return;

    setIsSubmitting(true);
    setError(null);
    try {
      await api.post(`/api/collections/${collectionId}/items`, {
        magnet: formData.magnet,
        title: formData.title,
        keywords: formData.keywords,
        remarks: formData.remarks
      });
      setFormData({ magnet: '', title: '', keywords: '', remarks: '' });
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Failed to add item', error);
      setError(error.response?.data?.error || error.message || '添加条目失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchContent.trim()) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const lines = batchContent.split('\n').filter(l => l.trim());
      const items = lines.map(line => {
        const parts = line.split(',');
        const magnet = parts[0]?.trim();
        const keywords = parts[1]?.trim() || '';
        const remarks = parts[2]?.trim() || '';
        return {
          magnet,
          keywords,
          remarks
        };
      });

      // Try wrapping in { items: [...] } to match expected backend structure
      await api.post(`/api/collections/${collectionId}/items`, { items });
      
      setBatchContent('');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Failed to batch add items', error);
      setError(error.response?.data?.error || error.message || '批量添加失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-white/40 backdrop-blur-sm" onClick={onClose}></div>
      <div className="glass-dark border border-white/80 w-full max-w-xl rounded-2xl shadow-2xl relative animate-in zoom-in-95 duration-200 overflow-hidden">
        <header className="p-4 border-b border-slate-100 flex justify-between items-center bg-white/50">
          <h3 className="font-bold text-lg text-slate-800">添加新条目</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors">
            <X size={20} />
          </button>
        </header>

        <div className="p-4 flex gap-4 border-b border-slate-100 bg-white/30">
           <button 
              onClick={() => setTab('single')}
              className={`flex-grow py-2 text-sm font-bold rounded-lg transition-all ${tab === 'single' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
           >
              手动添加
           </button>
           <button 
              onClick={() => setTab('batch')}
              className={`flex-grow py-2 text-sm font-bold rounded-lg transition-all ${tab === 'batch' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
           >
              批量添加
           </button>
        </div>

        <div className="p-6 bg-white/30">
          {error && (
            <div className="mb-4 bg-red-500/10 border border-red-500/20 text-red-600 p-3 rounded-xl flex items-center gap-3 animate-in fade-in duration-300">
              <AlertCircle size={18} />
              <p className="font-medium text-xs">{error}</p>
            </div>
          )}
          {tab === 'single' ? (
            <form onSubmit={handleSingleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-500">磁力链接 (Magnet)</label>
                <input
                  required
                  type="text"
                  value={formData.magnet}
                  onChange={(e) => setFormData({...formData, magnet: e.target.value})}
                  placeholder="magnet:?xt=..."
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-blue-500/40 outline-none shadow-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-500">标题 (可选)</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder="如果不填将自动生成"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-blue-500/40 outline-none shadow-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-500">关键字 (可选)</label>
                  <input
                    type="text"
                    value={formData.keywords}
                    onChange={(e) => setFormData({...formData, keywords: e.target.value})}
                    placeholder="空格分隔"
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-blue-500/40 outline-none shadow-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-500">备注 (可选)</label>
                  <input
                    type="text"
                    value={formData.remarks}
                    onChange={(e) => setFormData({...formData, remarks: e.target.value})}
                    placeholder="私人备注"
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-blue-500/40 outline-none shadow-sm"
                  />
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting || !formData.magnet}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-100 disabled:text-slate-400 px-8 py-2.5 rounded-xl text-sm font-bold text-white transition-all shadow-md flex items-center gap-2"
                >
                  {isSubmitting && <Loader2 className="animate-spin" size={16} />}
                  添加到集合
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleBatchSubmit} className="space-y-4">
               <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-500">条目列表 (每行一个)</label>
                <textarea
                  rows={8}
                  value={batchContent}
                  onChange={(e) => setBatchContent(e.target.value)}
                  placeholder={"magnet:?xt=...\nmagnet:?xt=..., 关键字, 备注"}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:ring-2 focus:ring-blue-500/40 outline-none font-mono shadow-sm"
                />
              </div>
              <p className="text-[10px] text-slate-500 font-medium">格式：磁链 [, 关键字, 备注]。关键字和备注可选，以逗号分隔。</p>
              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting || !batchContent.trim()}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-100 disabled:text-slate-400 px-8 py-2.5 rounded-xl text-sm font-bold text-white transition-all shadow-md flex items-center gap-2"
                >
                  {isSubmitting && <Loader2 className="animate-spin" size={16} />}
                  批量添加
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddItemModal;

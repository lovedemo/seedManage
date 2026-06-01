import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';

interface AddCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string) => Promise<void>;
}

const AddCollectionModal: React.FC<AddCollectionModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    setIsSubmitting(true);
    try {
      await onSubmit(name);
      setName('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose}></div>
      <div className="glass-dark border border-white/80 w-full max-w-md rounded-2xl shadow-2xl relative animate-in zoom-in-95 duration-200 overflow-hidden">
        <header className="p-4 border-b border-slate-100 flex justify-between items-center bg-white/50">
          <h3 className="font-bold text-lg text-slate-800">新建收藏集</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors">
            <X size={20} />
          </button>
        </header>
        <form onSubmit={handleSubmit} className="p-6 space-y-4 bg-white/30">
          <div className="space-y-1.5">
            <label htmlFor="collName" className="text-sm font-semibold text-slate-500 ml-1">集合名称</label>
            <input
              id="collName"
              autoFocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：学习资料、必备软件..."
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all shadow-sm"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-grow py-2.5 rounded-xl text-sm font-semibold text-slate-500 hover:bg-slate-50 transition-all border border-transparent"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="flex-grow bg-blue-600 hover:bg-blue-700 disabled:bg-slate-100 disabled:text-slate-400 py-2.5 rounded-xl text-sm font-bold text-white transition-all shadow-md flex items-center justify-center gap-2"
            >
              {isSubmitting && <Loader2 className="animate-spin" size={16} />}
              创建
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddCollectionModal;

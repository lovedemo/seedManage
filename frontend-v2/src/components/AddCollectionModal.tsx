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
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose}></div>
      <div className="glass-dark border border-white/10 w-full max-w-md rounded-2xl shadow-2xl relative animate-in zoom-in-95 duration-200">
        <header className="p-4 border-b border-white/5 flex justify-between items-center">
          <h3 className="font-bold text-lg text-slate-100">新建收藏集</h3>
          <button onClick={onClose} className="p-1 hover:bg-white/5 rounded-lg text-slate-400">
            <X size={20} />
          </button>
        </header>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="collName" className="text-sm font-medium text-slate-400 ml-1">集合名称</label>
            <input
              id="collName"
              autoFocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：学习资料、必备软件..."
              className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-grow py-2.5 rounded-xl text-sm font-semibold text-slate-400 hover:bg-white/5 transition-all"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="flex-grow bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 py-2.5 rounded-xl text-sm font-semibold text-white transition-all shadow-lg flex items-center justify-center gap-2"
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

import React, { useState } from 'react';
import { Copy, ExternalLink, Database, Calendar, HardDrive, Hash, Users } from 'lucide-react';
import type { SearchResult, SearchMeta } from '../types';

interface ResultCardProps {
  result: SearchResult;
  meta: SearchMeta;
}

const ResultCard: React.FC<ResultCardProps> = ({ result, meta }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!result.magnet) return;
    try {
      await navigator.clipboard.writeText(result.magnet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const handleOpen = () => {
    if (result.magnet) {
      window.open(result.magnet, '_blank');
    }
  };

  const adapterLabel = meta.fallbackUsed
    ? `${meta.fallbackAdapterName || meta.fallbackAdapter || '备用适配器'}（回退）`
    : meta.adapterName || meta.adapter || '未知适配器';

  const badgeText = result.category || (meta.mode === 'magnet' ? '磁力链接' : adapterLabel);

  return (
    <article className="glass bg-white/70 hover:bg-white/90 transition-all duration-300 rounded-2xl overflow-hidden border border-white/80 flex flex-col h-full group shadow-sm hover:shadow-md">
      <header className="p-4 pb-2">
        <div className="flex justify-between items-start gap-3 mb-2">
          <h3 className="text-sm font-bold text-slate-800 line-clamp-2 leading-relaxed group-hover:text-blue-600 transition-colors">
            {result.title || '未命名资源'}
          </h3>
          <span className="shrink-0 bg-blue-50 text-blue-600 text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-md border border-blue-100">
            {badgeText}
          </span>
        </div>
      </header>

      <div className="px-4 py-2 flex-grow space-y-2">
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          { (result.sizeLabel || result.size) && (
            <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
              <HardDrive size={12} className="text-slate-400" />
              <span>{result.sizeLabel || `${result.size} B`}</span>
            </div>
          )}
          
          {(result.seeders !== undefined || result.leechers !== undefined) && (
            <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
              <Users size={12} className="text-slate-400" />
              <span>{result.seeders ?? '?'}/{result.leechers ?? '?'}</span>
            </div>
          )}

          {result.uploaded && (
            <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium col-span-2">
              <Calendar size={12} className="text-slate-400" />
              <span>{new Date(result.uploaded).toLocaleString()}</span>
            </div>
          )}

          {result.source && (
            <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium col-span-2">
              <Database size={12} className="text-slate-400" />
              <span>{result.source}</span>
            </div>
          )}
        </div>

        {result.infoHash && (
          <div className="mt-2 pt-2 border-t border-slate-100">
             <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono break-all font-medium">
                <Hash size={10} className="shrink-0" />
                <span>{result.infoHash}</span>
             </div>
          </div>
        )}
      </div>

      <footer className="p-3 bg-white/30 border-t border-slate-100 grid grid-cols-2 gap-2 mt-auto">
        <button
          onClick={handleCopy}
          className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${
            copied 
              ? 'bg-green-50 text-green-600 border border-green-100' 
              : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-sm'
          }`}
        >
          <Copy size={14} />
          {copied ? '已复制' : '复制磁链'}
        </button>
        <button
          onClick={handleOpen}
          className="flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/10 transition-all"
        >
          <ExternalLink size={14} />
          打开资源
        </button>
      </footer>
    </article>
  );
};

export default ResultCard;

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
    <article className="glass bg-white/[0.03] hover:bg-white/[0.06] transition-all duration-300 rounded-2xl overflow-hidden border border-white/5 flex flex-col h-full group">
      <header className="p-4 pb-2">
        <div className="flex justify-between items-start gap-3 mb-2">
          <h3 className="text-sm font-semibold text-slate-100 line-clamp-2 leading-relaxed group-hover:text-blue-300 transition-colors">
            {result.title || '未命名资源'}
          </h3>
          <span className="shrink-0 bg-blue-500/10 text-blue-400 text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-md border border-blue-500/20">
            {badgeText}
          </span>
        </div>
      </header>

      <div className="px-4 py-2 flex-grow space-y-2">
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          { (result.sizeLabel || result.size) && (
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <HardDrive size={12} className="text-slate-500" />
              <span>{result.sizeLabel || `${result.size} B`}</span>
            </div>
          )}
          
          {(result.seeders !== undefined || result.leechers !== undefined) && (
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <Users size={12} className="text-slate-500" />
              <span>{result.seeders ?? '?'}/{result.leechers ?? '?'}</span>
            </div>
          )}

          {result.uploaded && (
            <div className="flex items-center gap-2 text-[11px] text-slate-400 col-span-2">
              <Calendar size={12} className="text-slate-500" />
              <span>{new Date(result.uploaded).toLocaleString()}</span>
            </div>
          )}

          {result.source && (
            <div className="flex items-center gap-2 text-[11px] text-slate-400 col-span-2">
              <Database size={12} className="text-slate-500" />
              <span>{result.source}</span>
            </div>
          )}
        </div>

        {result.infoHash && (
          <div className="mt-2 pt-2 border-t border-white/5">
             <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono break-all">
                <Hash size={10} className="shrink-0" />
                <span>{result.infoHash}</span>
             </div>
          </div>
        )}
      </div>

      <footer className="p-3 bg-white/[0.02] border-t border-white/5 grid grid-cols-2 gap-2 mt-auto">
        <button
          onClick={handleCopy}
          className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-all ${
            copied 
              ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/5'
          }`}
        >
          <Copy size={14} />
          {copied ? '已复制' : '复制磁链'}
        </button>
        <button
          onClick={handleOpen}
          className="flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/20 transition-all"
        >
          <ExternalLink size={14} />
          打开资源
        </button>
      </footer>
    </article>
  );
};

export default ResultCard;


import React, { useState } from 'react';
import { PdfPage, PageStatus } from '../types';

interface PageCardProps {
  page: PdfPage;
  onEdit: (page: PdfPage) => void; 
  onToggleSelection: (id: number) => void; 
}

const PageCard: React.FC<PageCardProps> = ({ page, onEdit, onToggleSelection }) => {
  const [viewMode, setViewMode] = useState<'original' | 'cleaned'>('original');

  const isDone = page.status === PageStatus.DONE;
  const hasCleaned = !!page.cleanedDataUrl;

  return (
    <div className={`
        bg-white rounded-2xl p-3 shadow-sm border flex flex-col gap-3 transition-all hover:shadow-md group/card select-none
        ${page.selected ? 'border-brand-200 ring-1 ring-brand-100' : 'border-slate-100 opacity-60 hover:opacity-100'}
    `}>
      {/* Header */}
      <div className="flex justify-between items-center px-1">
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
             <div 
                onClick={() => onToggleSelection(page.id)}
                className={`
                    w-5 h-5 rounded-md flex items-center justify-center cursor-pointer transition-colors border
                    ${page.selected ? 'bg-brand-600 border-brand-600' : 'bg-white border-slate-300 hover:border-slate-400'}
                `}
             >
                {page.selected && (
                    <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                )}
             </div>
             <span className={`text-xs font-black uppercase tracking-wider ${page.selected ? 'text-slate-600' : 'text-slate-400'}`}>
                Page {page.id}
             </span>
        </div>
        
        <div className="flex gap-1">
            {page.status === PageStatus.RENDERING && (
                <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-full animate-pulse">RENDERING</span>
            )}
            {page.status === PageStatus.ANALYZING && (
                <span className="text-[10px] font-bold text-brand-600 bg-brand-50 px-2 py-1 rounded-full animate-pulse">OCR SCANNING</span>
            )}
            {page.status === PageStatus.CLEANING && (
                <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded-full animate-pulse">INPAINTING</span>
            )}
            {page.status === PageStatus.VERIFYING && (
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full animate-pulse">VERIFYING</span>
            )}
            {page.status === PageStatus.DONE && (
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">READY</span>
            )}
            {page.status === PageStatus.ERROR && (
                <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-1 rounded-full">FAILED</span>
            )}
        </div>
      </div>

      {/* Image Viewport */}
      <div className="relative aspect-[3/4] sm:aspect-[4/3] w-full bg-slate-100 rounded-xl overflow-hidden group cursor-pointer" onClick={() => onToggleSelection(page.id)}>
        <img 
          src={viewMode === 'cleaned' && page.cleanedDataUrl ? page.cleanedDataUrl : page.originalDataUrl} 
          alt={`Page ${page.id}`} 
          className={`w-full h-full object-contain transition-opacity ${page.selected ? 'opacity-100' : 'opacity-50 grayscale'}`}
        />
        
        {/* Hover Controls */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 gap-2">
            {hasCleaned && (
                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        setViewMode(prev => prev === 'original' ? 'cleaned' : 'original');
                    }}
                    className="bg-white text-slate-900 shadow-xl px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wide transform hover:scale-105 transition-transform"
                >
                    {viewMode === 'original' ? 'View Cleaned' : 'View Original'}
                </button>
            )}
            <button 
                onClick={(e) => {
                    e.stopPropagation();
                    onEdit(page);
                }}
                className="bg-brand-600 text-white shadow-xl px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wide transform hover:scale-105 transition-transform flex items-center gap-1"
            >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                Tune
            </button>
        </div>

        {/* Info Overlay */}
        {viewMode === 'original' && page.textBlocks.length > 0 && (
           <div className="absolute top-2 left-2 bg-black/60 text-white text-[10px] px-2 py-1 rounded font-bold backdrop-blur-md">
             {page.textBlocks.length} Blocks
           </div>
        )}
      </div>

      {/* Stats/Info */}
      <div className="text-[10px] text-slate-400 font-medium px-1 flex justify-between">
          <span>{page.width}x{page.height}px</span>
          <span className="bg-slate-100 px-1.5 rounded text-slate-500">{page.scale?.toFixed(1)}x Scale</span>
      </div>
    </div>
  );
};

export default PageCard;

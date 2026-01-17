
import React, { useState, useEffect } from 'react';
import { PdfPage, TextBlock } from '../types';
import { PDF_CONFIG } from '../constants';

interface ModelOption {
    value: string;
    label: string;
}

interface PageEditModalProps {
  page: PdfPage;
  onClose: () => void;
  onReprocess: (pageId: number, newScale: number, newOcrModel: string, newCleaningModel: string, updatedBlocks?: TextBlock[], newEnableVerification?: boolean) => void;
  onSaveMetadata: (pageId: number, updatedBlocks: TextBlock[]) => void;
  isProcessing: boolean;
  ocrModels: ModelOption[];
  cleaningModels: ModelOption[];
}

const PageEditModal: React.FC<PageEditModalProps> = ({ page, onClose, onReprocess, onSaveMetadata, isProcessing, ocrModels, cleaningModels }) => {
  const [scale, setScale] = useState(page.scale !== undefined ? page.scale : PDF_CONFIG.DEFAULT_INDIVIDUAL_SCALE);
  const [ocrModel, setOcrModel] = useState(page.ocrModel || ocrModels[0].value);
  const [cleaningModel, setCleaningModel] = useState(page.cleaningModel || cleaningModels[0].value);
  const [enableVerification, setEnableVerification] = useState(page.enableVerification || false);
  
  const [localBlocks, setLocalBlocks] = useState<TextBlock[]>([]);

  useEffect(() => {
      const blocks = page.textBlocks.map(b => ({
          ...b,
          included: b.included !== false
      }));
      setLocalBlocks(blocks);
  }, [page.textBlocks]);

  const toggleBlock = (index: number) => {
      setLocalBlocks(prev => {
          const newBlocks = [...prev];
          newBlocks[index] = { ...newBlocks[index], included: !newBlocks[index].included };
          return newBlocks;
      });
  };

  const handleApplyReprocess = () => {
      onReprocess(page.id, scale, ocrModel, cleaningModel, localBlocks, enableVerification);
  };

  const handleSaveOnly = () => {
      onSaveMetadata(page.id, localBlocks);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-7xl max-h-[90vh] flex flex-col overflow-hidden">
        
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white">
          <div>
            <h3 className="text-xl font-black text-slate-900">Edit Page {page.id}</h3>
            <p className="text-sm text-slate-500 font-medium">Click boxes to skip cleaning for embedded graphics.</p>
          </div>
          <button onClick={onClose} disabled={isProcessing} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6 bg-slate-50 flex flex-col lg:flex-row gap-6 min-h-0">
          <div className="flex-1 flex gap-4 min-h-0 h-full overflow-hidden">
            {/* Input Selection Side */}
            <div className="flex-1 flex flex-col gap-2 min-h-0">
               <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Input & Selection</span>
                    <span className="text-[10px] text-slate-400 bg-white px-2 py-1 rounded border border-slate-200">
                        <span className="inline-block w-2 h-2 bg-green-500/50 border border-green-500 mr-1 rounded-sm"></span>Clean
                        <span className="inline-block w-2 h-2 border border-red-500 border-dashed mr-1 ml-2 rounded-sm"></span>Skip
                    </span>
               </div>
               <div className="relative flex-1 bg-slate-200 rounded-xl overflow-hidden border border-slate-200 shadow-sm flex items-center justify-center">
                  <div className="relative max-w-full max-h-full" style={{ aspectRatio: `${page.width}/${page.height}` }}>
                       <img 
                            src={page.originalDataUrl} 
                            className="w-full h-full object-contain pointer-events-none select-none" 
                            alt="Original" 
                        />
                        <div className="absolute inset-0">
                            {localBlocks.map((block, idx) => {
                                if(!block.box_2d) return null;
                                const [ymin, xmin, ymax, xmax] = block.box_2d;
                                return (
                                    <div
                                        key={idx}
                                        onClick={() => toggleBlock(idx)}
                                        className={`
                                            absolute cursor-pointer transition-all duration-150 z-10 hover:z-20
                                            ${block.included 
                                                ? 'bg-green-500/20 border-2 border-green-500 hover:bg-green-500/40' 
                                                : 'bg-transparent border-2 border-red-500 border-dashed hover:bg-red-500/10'
                                            }
                                        `}
                                        style={{
                                            top: `${ymin / 10}%`,
                                            left: `${xmin / 10}%`,
                                            height: `${(ymax - ymin) / 10}%`,
                                            width: `${(xmax - xmin) / 10}%`,
                                        }}
                                        title={block.text}
                                    >
                                    </div>
                                );
                            })}
                        </div>
                  </div>
                  <div className="absolute bottom-2 left-2 bg-black/70 text-white text-[10px] px-2 py-1 rounded z-30 pointer-events-none">
                    Source: {page.width}x{page.height}
                  </div>
               </div>
            </div>

            {/* Output Preview Side */}
            <div className="flex-1 flex flex-col gap-2 min-h-0">
               <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Preview Output</span>
               <div className="flex-1 bg-slate-200 rounded-xl overflow-hidden border border-slate-200 shadow-sm flex items-center justify-center relative">
                  {page.cleanedDataUrl ? (
                    <img src={page.cleanedDataUrl} className="max-w-full max-h-full object-contain" alt="Cleaned" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs font-bold uppercase flex-col gap-2">
                        <svg className="w-8 h-8 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        No Cleaned Image
                    </div>
                  )}
                  <div className="absolute bottom-2 left-2 bg-black/70 text-white text-[10px] px-2 py-1 rounded z-30 pointer-events-none">
                    Render: {page.scale?.toFixed(1)}x
                  </div>
               </div>
            </div>
          </div>

          {/* Sidebar Controls */}
          <div className="w-full lg:w-80 flex flex-col gap-5 shrink-0">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-5">
                <h4 className="text-xs font-black text-slate-300 uppercase tracking-wider">Rendering & Workflow</h4>
                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <label className="text-sm font-bold text-slate-900">Scale Multiplier</label>
                        <span className="text-xs font-mono bg-slate-100 px-2 py-1 rounded text-slate-600">{scale.toFixed(1)}x</span>
                    </div>
                    <input 
                        type="range" 
                        min="1.0" 
                        max="4.0" 
                        step="0.5" 
                        value={scale} 
                        onChange={(e) => setScale(parseFloat(e.target.value))}
                        disabled={isProcessing}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-600"
                    />
                </div>
                <div className="pt-3 border-t border-slate-50">
                    <div className="flex items-center gap-3">
                        <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                            <input 
                                type="checkbox" 
                                id="toggle-verification-modal" 
                                checked={enableVerification}
                                onChange={(e) => setEnableVerification(e.target.checked)}
                                className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer checked:right-0 checked:border-brand-600"
                                style={{right: enableVerification ? '0' : 'auto', left: enableVerification ? 'auto' : '0'}}
                            />
                            <label 
                                htmlFor="toggle-verification-modal" 
                                className={`toggle-label block overflow-hidden h-5 rounded-full cursor-pointer ${enableVerification ? 'bg-brand-600' : 'bg-slate-300'}`}
                            ></label>
                        </div>
                        <label htmlFor="toggle-verification-modal" className="text-xs font-bold text-slate-600 cursor-pointer">
                            Deep Clean
                        </label>
                    </div>
                </div>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-4">
                 <h4 className="text-xs font-black text-slate-300 uppercase tracking-wider">AI Models</h4>
                 <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 block">OCR Model</label>
                    <select 
                        value={ocrModel}
                        onChange={(e) => setOcrModel(e.target.value)}
                        disabled={isProcessing}
                        className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg p-2.5 focus:ring-brand-500 focus:border-brand-500 block"
                    >
                        {ocrModels.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 block">Cleaning Model</label>
                    <select 
                        value={cleaningModel}
                        onChange={(e) => setCleaningModel(e.target.value)}
                        disabled={isProcessing}
                        className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg p-2.5 focus:ring-purple-500 focus:border-purple-500 block"
                    >
                        {cleaningModels.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                </div>
            </div>
            
            <div className="mt-auto space-y-3">
                <button 
                    onClick={handleSaveOnly}
                    disabled={isProcessing}
                    className="w-full py-4 rounded-xl font-black uppercase tracking-wide text-xs flex items-center justify-center gap-2 transition-all bg-slate-900 hover:bg-black text-white shadow-lg shadow-slate-900/20 transform hover:-translate-y-0.5"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    Save PPT Selection
                </button>

                <button 
                    onClick={handleApplyReprocess}
                    disabled={isProcessing}
                    className={`
                        w-full py-4 rounded-xl font-black uppercase tracking-wide text-xs flex items-center justify-center gap-2 transition-all shadow-lg
                        ${isProcessing 
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                            : 'bg-brand-600 hover:bg-brand-700 text-white shadow-brand-600/20 transform hover:-translate-y-0.5'
                        }
                    `}
                >
                    {isProcessing ? (
                        <>
                            <div className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                            Processing...
                        </>
                    ) : 'Apply & Reprocess'}
                </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PageEditModal;

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
  onReprocess: (pageId: number, newScale: number, newPadding: number, newOcrModel: string, newCleaningModel: string, updatedBlocks?: TextBlock[], newEnableVerification?: boolean) => void;
  isProcessing: boolean;
  ocrModels: ModelOption[];
  cleaningModels: ModelOption[];
}

const PageEditModal: React.FC<PageEditModalProps> = ({ page, onClose, onReprocess, isProcessing, ocrModels, cleaningModels }) => {
  // Ensure we default if page specific values are missing (backward compatibility)
  const [scale, setScale] = useState(page.scale !== undefined ? page.scale : PDF_CONFIG.DEFAULT_SCALE);
  const [padding, setPadding] = useState(page.padding !== undefined ? page.padding : PDF_CONFIG.DEFAULT_PADDING);
  const [ocrModel, setOcrModel] = useState(page.ocrModel || ocrModels[0].value);
  const [cleaningModel, setCleaningModel] = useState(page.cleaningModel || cleaningModels[0].value);
  const [enableVerification, setEnableVerification] = useState(page.enableVerification || false);
  
  // Local state for block management
  const [localBlocks, setLocalBlocks] = useState<TextBlock[]>([]);

  useEffect(() => {
      // Initialize blocks with 'included' status if missing
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

  const handleApply = () => {
      onReprocess(page.id, scale, padding, ocrModel, cleaningModel, localBlocks, enableVerification);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white">
          <div>
            <h3 className="text-xl font-black text-slate-900">Edit Page {page.id}</h3>
            <p className="text-sm text-slate-500 font-medium">Click boxes on the "Original" image to protect graphics from cleaning.</p>
          </div>
          <button onClick={onClose} disabled={isProcessing} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 bg-slate-50 flex flex-col lg:flex-row gap-6">
          
          {/* Images Area */}
          <div className="flex-1 flex gap-4 min-h-[500px]">
            {/* Original with Overlays */}
            <div className="flex-1 flex flex-col gap-2">
               <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-400 uppercase">Input & Selection</span>
                    <span className="text-[10px] text-slate-400 bg-white px-2 py-1 rounded border border-slate-200">
                        <span className="inline-block w-2 h-2 bg-green-500/50 border border-green-500 mr-1 rounded-sm"></span>Clean
                        <span className="inline-block w-2 h-2 border border-red-500 border-dashed mr-1 ml-2 rounded-sm"></span>Skip
                    </span>
               </div>
               
               <div className="relative w-full h-full bg-slate-200 rounded-xl overflow-hidden border border-slate-200 shadow-sm group">
                  {/* Container that enforces aspect ratio */}
                  <div className="relative w-full h-full">
                       <img 
                            src={page.originalDataUrl} 
                            className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none" 
                            alt="Original" 
                        />
                       
                       {/* Overlay Layer */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="relative w-full h-full" style={{ aspectRatio: `${page.width}/${page.height}` }}>
                                {/* Render Image Again to fill this specific aspect ratio box centered in the parent */}
                                <img src={page.originalDataUrl} className="w-full h-full" alt="Bg" />
                                
                                {/* Boxes */}
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
                  </div>
                  
                  <div className="absolute bottom-2 left-2 bg-black/70 text-white text-[10px] px-2 py-1 rounded z-30 pointer-events-none">
                    Render Scale: {page.scale?.toFixed(1) || PDF_CONFIG.DEFAULT_SCALE.toFixed(1)}x
                  </div>
               </div>
            </div>

            {/* Cleaned Result */}
            <div className="flex-1 flex flex-col gap-2">
               <span className="text-xs font-bold text-slate-400 uppercase">Preview Output</span>
               <div className="w-full h-full bg-slate-200 rounded-xl overflow-hidden border border-slate-200 shadow-sm relative">
                  {page.cleanedDataUrl ? (
                    <img src={page.cleanedDataUrl} className="w-full h-full object-contain" alt="Cleaned" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs font-bold uppercase flex-col gap-2">
                        <svg className="w-8 h-8 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        No Cleaned Image
                    </div>
                  )}
               </div>
            </div>
          </div>

          {/* Settings Sidebar */}
          <div className="w-full lg:w-80 flex flex-col gap-5">
            
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-5">
                <h4 className="text-xs font-black text-slate-300 uppercase tracking-wider">Rendering Parameters</h4>
                
                {/* Scale Control */}
                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <label className="text-sm font-bold text-slate-900">PDF Render Scale</label>
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

                {/* Padding Control */}
                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <label className="text-sm font-bold text-slate-900">Text Removal Area</label>
                        <span className="text-xs font-mono bg-slate-100 px-2 py-1 rounded text-slate-600">Padding: {padding}px</span>
                    </div>
                    <input 
                        type="range" 
                        min="0" 
                        max="60" 
                        step="5" 
                        value={padding} 
                        onChange={(e) => setPadding(parseInt(e.target.value))}
                        disabled={isProcessing}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                    />
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

                <div className="pt-2 border-t border-slate-100">
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
            
            <div className="mt-auto">
                <p className="text-[10px] text-slate-400 mb-2 leading-relaxed">
                    * Uncheck red boxes on the image to preserve illustrations/icons from being erased.
                </p>
                <button 
                    onClick={handleApply}
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
                        <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                        Processing...
                    </>
                    ) : (
                    <>
                        <span>Apply & Reprocess</span>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    </>
                    )}
                </button>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

export default PageEditModal;

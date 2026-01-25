
import React, { useState, useEffect, useRef } from 'react';
import { PdfPage, TextBlock, PageStatus } from '../types';

interface ModalProps {
  page: PdfPage;
  onClose: () => void;
  onSave: (blocks: TextBlock[]) => void;
  onReprocess: (blocks: TextBlock[]) => void;
}

export const Modal: React.FC<ModalProps> = ({ page, onClose, onSave, onReprocess }) => {
  const [blocks, setBlocks] = useState<TextBlock[]>(page.textBlocks);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');
  const containerRef = useRef<HTMLDivElement>(null);
  
  // State for Drag & Drop / Resize
  const [interaction, setInteraction] = useState<{
    type: 'move' | 'resize';
    index: number;
    handle?: 'nw' | 'ne' | 'se' | 'sw';
    startX: number;
    startY: number;
    initialBox: number[]; // [ymin, xmin, ymax, xmax]
  } | null>(null);

  // Sync blocks if page updates externally (e.g. after reprocessing)
  useEffect(() => {
    setBlocks(page.textBlocks);
  }, [page.textBlocks]);

  // Toggle inclusion when clicking (only if not dragging)
  const toggleBlock = (index: number) => {
    setBlocks(prev => prev.map((b, i) => {
      if (i !== index) return b;
      const isIncluded = !b.included;
      return { 
        ...b, 
        included: isIncluded, 
        type: isIncluded ? 'presentation_text' : 'embedded_art_text' 
      };
    }));
    setSaveStatus('idle'); 
  };

  const handleSave = () => {
    onSave(blocks);
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 2000);
  };

  const handleReprocess = () => {
    onReprocess(blocks);
    setSaveStatus('idle');
  };

  const handleReset = () => {
    if (page.initialTextBlocks) {
      setBlocks(JSON.parse(JSON.stringify(page.initialTextBlocks))); // Deep copy
    } else {
      // Fallback if no initial blocks stored (shouldn't happen with new app version)
      alert("No original OCR data found to reset to.");
    }
    setSaveStatus('idle');
  };

  // --- Interaction Handlers (Pointer Events) ---

  const getPointerPos = (e: React.PointerEvent | PointerEvent) => {
    return { x: e.clientX, y: e.clientY };
  };

  const handlePointerDown = (e: React.PointerEvent, index: number, handle?: 'nw' | 'ne' | 'se' | 'sw') => {
    e.preventDefault();
    e.stopPropagation();
    
    // If clicking a handle, it's a resize. If clicking body, it's a move (unless it's just a click to toggle)
    // We differentiate click vs drag in PointerUp, but for now we prepare the state.
    
    const { x, y } = getPointerPos(e);
    setInteraction({
      type: handle ? 'resize' : 'move',
      index,
      handle,
      startX: x,
      startY: y,
      initialBox: [...blocks[index].box_2d],
    });
    
    // Capture pointer to handle tracking outside the div
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!interaction || !containerRef.current) return;
    
    e.preventDefault();
    e.stopPropagation();

    const { x, y } = getPointerPos(e);
    const deltaX_px = x - interaction.startX;
    const deltaY_px = y - interaction.startY;

    const rect = containerRef.current.getBoundingClientRect();
    
    // Convert Pixel Delta to 0-1000 Coordinate Delta
    const deltaX_norm = (deltaX_px / rect.width) * 1000;
    const deltaY_norm = (deltaY_px / rect.height) * 1000;

    setBlocks(prev => {
      const newBlocks = [...prev];
      const box = [...interaction.initialBox]; // [ymin, xmin, ymax, xmax]
      
      if (interaction.type === 'move') {
        // Move whole box
        box[0] += deltaY_norm; // ymin
        box[1] += deltaX_norm; // xmin
        box[2] += deltaY_norm; // ymax
        box[3] += deltaX_norm; // xmax
      } else if (interaction.type === 'resize' && interaction.handle) {
        // Resize logic based on handle
        switch (interaction.handle) {
          case 'nw': // Top-Left
            box[0] += deltaY_norm;
            box[1] += deltaX_norm;
            break;
          case 'ne': // Top-Right
            box[0] += deltaY_norm;
            box[3] += deltaX_norm;
            break;
          case 'sw': // Bottom-Left
            box[2] += deltaY_norm;
            box[1] += deltaX_norm;
            break;
          case 'se': // Bottom-Right
            box[2] += deltaY_norm;
            box[3] += deltaX_norm;
            break;
        }
      }

      // Clamp values to 0-1000
      // Also ensure min size (e.g., 10 units) so it doesn't flip
      const minSize = 10;
      
      // Normalize function to clamp 0-1000
      const clamp = (v: number) => Math.max(0, Math.min(1000, v));
      
      // Ensure validity (min < max)
      if (box[2] < box[0] + minSize) box[2] = box[0] + minSize; // height check
      if (box[3] < box[1] + minSize) box[3] = box[1] + minSize; // width check

      newBlocks[interaction.index] = {
        ...newBlocks[interaction.index],
        box_2d: [clamp(box[0]), clamp(box[1]), clamp(box[2]), clamp(box[3])]
      };
      return newBlocks;
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!interaction) return;
    
    // Check if it was a click (negligible movement) to trigger toggle
    const { x, y } = getPointerPos(e);
    const dist = Math.sqrt(Math.pow(x - interaction.startX, 2) + Math.pow(y - interaction.startY, 2));
    
    if (interaction.type === 'move' && dist < 5) {
      toggleBlock(interaction.index);
    } else {
      setSaveStatus('idle'); // Mark as modified
    }

    setInteraction(null);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const isCleaning = page.status === PageStatus.CLEANING;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-white rounded-[2rem] w-full max-w-[95vw] h-[90vh] flex flex-col overflow-hidden shadow-2xl ring-1 ring-white/20">
        
        {/* Header */}
        <div className="px-8 py-5 border-b flex justify-between items-center bg-slate-50">
          <div>
            <h3 className="font-black text-2xl text-slate-900">Fine-Tune Layout</h3>
            <p className="text-sm text-slate-500 font-medium">
              Left: <span className="text-teal-600 font-bold">Edit Mask</span> • 
              Right: <span className="text-purple-600 font-bold">Preview Result</span>
            </p>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-slate-200 rounded-full transition-colors group">
            <svg className="w-6 h-6 text-slate-400 group-hover:text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Main Split View */}
        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row bg-slate-100">
          
          {/* Left Column: Editor */}
          <div className="flex-1 flex flex-col border-r border-slate-200 min-w-0">
             <div className="bg-white px-4 py-2 border-b flex justify-between items-center shadow-sm z-10">
               <div className="flex items-center gap-4">
                 <span className="text-xs font-black uppercase tracking-widest text-teal-600">Step 1: Define Text to Remove</span>
                 <button 
                    onClick={handleReset}
                    className="text-[10px] font-bold text-slate-400 hover:text-red-500 underline flex items-center gap-1 transition-colors"
                    title="Revert to original OCR results"
                 >
                   <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                   Reset to Original OCR
                 </button>
               </div>
               <span className="text-[10px] bg-teal-50 text-teal-700 px-2 py-1 rounded-md font-bold">Drag to Move/Resize • Click to Toggle</span>
             </div>
             
             <div className="flex-1 overflow-auto p-6 flex items-center justify-center relative bg-slate-50/50">
                <div 
                  className="relative shadow-xl ring-4 ring-white rounded-sm bg-white touch-none" 
                  style={{ aspectRatio: `${page.width}/${page.height}`, maxHeight: '65vh' }}
                  ref={containerRef}
                >
                  <img src={page.originalDataUrl} className="h-full w-full object-contain pointer-events-none select-none" alt="Original" />
                  
                  <div className="absolute inset-0">
                    {blocks.map((b, i) => {
                      const isActive = interaction?.index === i;
                      const isIncluded = b.included;
                      
                      return (
                        <div
                          key={i}
                          onPointerDown={(e) => handlePointerDown(e, i)}
                          onPointerMove={handlePointerMove}
                          onPointerUp={handlePointerUp}
                          className={`absolute group touch-none select-none transition-colors ${
                            isIncluded 
                              ? 'bg-emerald-500/20 border-2 border-emerald-500 hover:bg-emerald-500/30' 
                              : 'bg-red-500/5 border-2 border-red-400/30 border-dashed hover:bg-red-500/20'
                          } ${isActive ? 'z-50 cursor-move' : 'z-10 cursor-pointer'}`}
                          style={{ 
                            top: `${b.box_2d[0] / 10}%`, 
                            left: `${b.box_2d[1] / 10}%`, 
                            height: `${(b.box_2d[2] - b.box_2d[0]) / 10}%`, 
                            width: `${(b.box_2d[3] - b.box_2d[1]) / 10}%` 
                          }}
                        >
                          {/* Resize Handles (Only show on Included or Hovered) */}
                          <div className={`opacity-0 group-hover:opacity-100 transition-opacity ${isActive ? 'opacity-100' : ''}`}>
                            {/* NW */}
                            <div 
                              onPointerDown={(e) => handlePointerDown(e, i, 'nw')}
                              className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border border-teal-600 cursor-nw-resize rounded-full shadow-sm z-50" 
                            />
                            {/* NE */}
                            <div 
                              onPointerDown={(e) => handlePointerDown(e, i, 'ne')}
                              className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border border-teal-600 cursor-ne-resize rounded-full shadow-sm z-50" 
                            />
                            {/* SW */}
                            <div 
                              onPointerDown={(e) => handlePointerDown(e, i, 'sw')}
                              className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border border-teal-600 cursor-sw-resize rounded-full shadow-sm z-50" 
                            />
                            {/* SE */}
                            <div 
                              onPointerDown={(e) => handlePointerDown(e, i, 'se')}
                              className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border border-teal-600 cursor-se-resize rounded-full shadow-sm z-50" 
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
             </div>
          </div>

          {/* Right Column: Preview */}
          <div className="flex-1 flex flex-col min-w-0 bg-slate-200/50">
            <div className="bg-white px-4 py-2 border-b flex justify-between items-center shadow-sm z-10">
              <span className="text-xs font-black uppercase tracking-widest text-purple-600">Step 2: AI Result</span>
               {page.cleanedDataUrl ? (
                  <span className="text-[10px] bg-purple-50 text-purple-700 px-2 py-1 rounded-md font-bold">Cleaned</span>
               ) : (
                  <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded-md font-bold">Pending</span>
               )}
            </div>
            <div className="flex-1 overflow-auto p-6 flex items-center justify-center relative">
               <div className="relative shadow-xl ring-4 ring-white rounded-sm bg-white" style={{ aspectRatio: `${page.width}/${page.height}`, maxHeight: '65vh' }}>
                 {page.cleanedDataUrl ? (
                   <img src={page.cleanedDataUrl} className={`h-full w-full object-contain transition-opacity duration-500 ${isCleaning ? 'opacity-50 blur-sm' : 'opacity-100'}`} alt="Cleaned" />
                 ) : (
                   <div className="h-full w-full flex items-center justify-center text-slate-300 bg-slate-50">
                     <span className="text-sm font-bold uppercase tracking-widest">No cleaned image yet</span>
                   </div>
                 )}
                 
                 {/* Loading Overlay */}
                 {isCleaning && (
                   <div className="absolute inset-0 flex flex-col items-center justify-center z-30">
                     <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                     <div className="bg-black/70 text-white px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest backdrop-blur-md">
                       AI Inpainting...
                     </div>
                   </div>
                 )}
               </div>
            </div>
          </div>
        </div>

        {/* Footer / Controls */}
        <div className="bg-white p-5 border-t flex flex-col md:flex-row gap-6 items-center justify-between z-20">
          
          {/* Stats */}
          <div className="flex gap-6 text-xs font-medium text-slate-500 hidden md:flex">
             <div className="flex items-center gap-2">
               <div className="w-3 h-3 bg-emerald-500/20 border-2 border-emerald-500 rounded-sm"></div>
               <span>{blocks.filter(b => b.included).length} Removed (Text)</span>
             </div>
             <div className="flex items-center gap-2">
               <div className="w-3 h-3 bg-red-500/10 border-2 border-red-400 border-dashed rounded-sm"></div>
               <span>{blocks.filter(b => !b.included).length} Kept (Background)</span>
             </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 w-full md:w-auto">
             <button 
                onClick={handleReprocess}
                disabled={isCleaning}
                className="flex-1 md:flex-none py-3 px-6 bg-purple-50 text-purple-700 border border-purple-100 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-purple-100 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {isCleaning ? 'Processing...' : 'Regenerate Bg'}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              </button>
              
              <button 
                onClick={handleSave}
                disabled={isCleaning}
                className={`flex-1 md:flex-none py-3 px-8 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg ${
                  saveStatus === 'saved' 
                    ? 'bg-emerald-500 text-white shadow-emerald-200' 
                    : 'bg-slate-900 text-white hover:bg-black shadow-slate-200'
                }`}
              >
                {saveStatus === 'saved' ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                    Saved!
                  </>
                ) : (
                  'Save Layout'
                )}
              </button>
          </div>
        </div>

      </div>
    </div>
  );
};

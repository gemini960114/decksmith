import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { parsePdf, renderSinglePage } from './services/pdfService';
import { extractTextFromImage, removeTextFromImage } from './services/geminiService';
import { generatePptx } from './services/pptxService';
import { PdfPage, PageStatus, ProjectJob, TextBlock } from './types';
import UploadZone from './components/UploadZone';
import PageCard from './components/PageCard';
import PageEditModal from './components/PageEditModal';
import Auth from './components/Auth';
import HistorySidebar from './components/HistorySidebar';
import { saveApiKey, loadApiKey, clearApiKey, loadJobsFromStorage, saveJobsToStorage, stripImagesFromPage } from './utils/storageUtils';
import { savePageImages, getPageImages, deleteJobImages } from './utils/dbUtils';
import { MODEL_CONFIG, PDF_CONFIG, APP_CONFIG } from './constants';

function App() {
  // Auth State
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [jobs, setJobs] = useState<ProjectJob[]>([]);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);

  // App State
  const [pages, setPages] = useState<PdfPage[]>([]);
  const [currentFile, setCurrentFile] = useState<File | null>(null); // For re-rendering
  const [isParsing, setIsParsing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Global Settings State
  const [globalScale, setGlobalScale] = useState(PDF_CONFIG.DEFAULT_SCALE); 
  const [globalPadding, setGlobalPadding] = useState(PDF_CONFIG.DEFAULT_PADDING); 
  const [globalOcrModel, setGlobalOcrModel] = useState(MODEL_CONFIG.DEFAULT_OCR_MODEL);
  const [globalCleaningModel, setGlobalCleaningModel] = useState(MODEL_CONFIG.DEFAULT_CLEANING_MODEL);
  const [globalEnableVerification, setGlobalEnableVerification] = useState(false); // Default OFF
  
  // Modal State
  const [editingPage, setEditingPage] = useState<PdfPage | null>(null);

  // Computed Stats
  const selectedPagesCount = useMemo(() => pages.filter(p => p.selected).length, [pages]);
  const processedCount = useMemo(() => pages.filter(p => p.selected && p.status === PageStatus.DONE).length, [pages]);

  // --- Auth & Storage Effects ---

  // 1. Load Key on Mount
  useEffect(() => {
    const key = loadApiKey();
    if (key) {
        setApiKey(key);
        refreshJobsList(key);
    }
  }, []);

  const refreshJobsList = async (key: string) => {
    const loadedJobs = await loadJobsFromStorage(key);
    setJobs(loadedJobs);
  };

  const handleLogin = (key: string) => {
    saveApiKey(key); // Persist logic is simple here: always save if login success
    setApiKey(key);
    refreshJobsList(key);
  };

  const handleLogout = () => {
    clearApiKey();
    setApiKey(null);
    setPages([]);
    setCurrentJobId(null);
  };

  // 2. Auto-Save Logic (When pages change)
  useEffect(() => {
    if (!apiKey || pages.length === 0 || !currentJobId) return;

    const autoSave = async () => {
        // Find existing job or create metadata structure
        // We only save metadata to localStorage
        const updatedJob: ProjectJob = {
            id: currentJobId,
            name: jobs.find(j => j.id === currentJobId)?.name || `Project ${new Date().toLocaleTimeString()}`,
            timestamp: Date.now(),
            pageCount: pages.length,
            pages: pages.map(stripImagesFromPage) // Remove huge strings
        };

        // Update local state jobs array
        const newJobs = jobs.some(j => j.id === currentJobId) 
            ? jobs.map(j => j.id === currentJobId ? updatedJob : j)
            : [...jobs, updatedJob];
        
        setJobs(newJobs);
        await saveJobsToStorage(apiKey, newJobs);

        // Async: Save full images to IndexedDB
        // Optimization: Only save if changed? For now, simple loop
        for (const page of pages) {
            await savePageImages(currentJobId, page.id, page.originalDataUrl, page.cleanedDataUrl);
        }
    };

    // Debounce save
    const timer = setTimeout(autoSave, APP_CONFIG.AUTO_SAVE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [pages, apiKey, currentJobId]); // jobs dependency removed to avoid cycles, using functional update or careful logic if needed

  // --- Job Management ---
  
  const createNewJob = (fileName: string) => {
    const newId = crypto.randomUUID();
    const newJob: ProjectJob = {
        id: newId,
        name: fileName,
        timestamp: Date.now(),
        pageCount: 0,
        pages: []
    };
    setCurrentJobId(newId);
    return newId;
  };

  const loadJob = async (job: ProjectJob) => {
    if(isProcessing) return;
    setIsProcessing(true); // temporary lock
    try {
        const fullPages: PdfPage[] = [];
        for (const meta of job.pages) {
            const images = await getPageImages(job.id, meta.id);
            fullPages.push({
                ...meta,
                originalDataUrl: images.originalDataUrl, // Should exist
                cleanedDataUrl: images.cleanedDataUrl
            });
        }
        setPages(fullPages);
        setCurrentJobId(job.id);
        setCurrentFile(null); // Cannot re-render without file, but can view/clean
    } finally {
        setIsProcessing(false);
    }
  };

  const handleDeleteJob = async (jobId: string) => {
      if(!apiKey) return;
      const newJobs = jobs.filter(j => j.id !== jobId);
      setJobs(newJobs);
      await saveJobsToStorage(apiKey, newJobs);
      await deleteJobImages(jobId);
      if(currentJobId === jobId) {
          setPages([]);
          setCurrentJobId(null);
      }
  };

  // --- Processing Logic ---

  const handleFileSelect = async (file: File) => {
    setIsParsing(true);
    setCurrentFile(file);
    setPages([]);
    
    const newJobId = createNewJob(file.name);

    try {
      const parsedPages = await parsePdf(file, globalScale, globalPadding, globalOcrModel, globalCleaningModel, globalEnableVerification);
      setPages(parsedPages);
      
      // Initial Save to IDB immediately
      for (const page of parsedPages) {
          await savePageImages(newJobId, page.id, page.originalDataUrl, page.cleanedDataUrl);
      }

    } catch (error) {
      console.error("PDF Parse Error:", error);
      alert("Failed to parse PDF. Please try a different file.");
    } finally {
      setIsParsing(false);
    }
  };

  const updatePageInState = (updatedPage: PdfPage) => {
    setPages(prev => prev.map(p => p.id === updatedPage.id ? updatedPage : p));
    if (editingPage && editingPage.id === updatedPage.id) {
        setEditingPage(updatedPage);
    }
  };

  const updatePageStatus = (id: number, status: PageStatus) => {
    setPages(prev => prev.map(p => p.id === id ? { ...p, status } : p));
    if (editingPage && editingPage.id === id) {
        setEditingPage(prev => prev ? { ...prev, status } : null);
    }
  };

  const togglePageSelection = (id: number) => {
    if (isProcessing) return;
    setPages(prev => prev.map(p => p.id === id ? { ...p, selected: !p.selected } : p));
  };

  const toggleAllSelection = (select: boolean) => {
    if (isProcessing) return;
    setPages(prev => prev.map(p => ({ ...p, selected: select })));
  };

  // --- Core Logic: Two-Stage Cleaning ---
  const processPageLogic = async (page: PdfPage, forceSkipOcr: boolean = false) => {
      if(!apiKey) return false;

      let processedPage = { ...page };
      
      const ocrModel = processedPage.ocrModel || globalOcrModel;
      const cleaningModel = processedPage.cleaningModel || globalCleaningModel;
      const paddingToUse = processedPage.padding !== undefined ? processedPage.padding : globalPadding;
      const enableVerify = processedPage.enableVerification !== undefined ? processedPage.enableVerification : globalEnableVerification;

      // --- Stage 1: Initial OCR (Detailed) ---
      // Skip OCR if we already have blocks and are just reprocessing the cleaning (e.g. padding change or block toggle)
      // unless forceSkipOcr is false (which usually implies a full re-run)
      let primaryTextBlocks = processedPage.textBlocks;

      if (!forceSkipOcr || primaryTextBlocks.length === 0) {
          updatePageStatus(processedPage.id, PageStatus.ANALYZING);
          try {
              primaryTextBlocks = await extractTextFromImage(processedPage.originalDataUrl, ocrModel, apiKey, 'detailed');
              processedPage.textBlocks = primaryTextBlocks;
              updatePageInState(processedPage);
          } catch (e) {
              console.error(`OCR 1 failed for page ${processedPage.id}`, e);
              updatePageStatus(processedPage.id, PageStatus.ERROR);
              return false;
          }
      }

      // --- Stage 2: Initial Cleaning ---
      updatePageStatus(processedPage.id, PageStatus.CLEANING);
      let currentCleanedImage = null;
      try {
          currentCleanedImage = await removeTextFromImage(
            processedPage.originalDataUrl, 
            primaryTextBlocks,
            paddingToUse,
            cleaningModel,
            apiKey,
            processedPage.width,
            processedPage.height
          );
          processedPage.cleanedDataUrl = currentCleanedImage;
          updatePageInState(processedPage);
      } catch (e) {
          console.error(`Cleaning 1 failed for page ${processedPage.id}`, e);
          updatePageStatus(processedPage.id, PageStatus.ERROR);
          return false;
      }

      if (!currentCleanedImage) {
          updatePageStatus(processedPage.id, PageStatus.ERROR);
          return false;
      }

      // --- Stage 3 & 4: Optional Verification (Deep Clean) ---
      if (enableVerify) {
          updatePageStatus(processedPage.id, PageStatus.VERIFYING);
          let residueBlocks = [];
          try {
              // Use the same OCR model to check the CLEANED image
              residueBlocks = await extractTextFromImage(currentCleanedImage, ocrModel, apiKey, 'simple');
          } catch (e) {
              console.warn(`Verification OCR failed for page ${processedPage.id}. Skipping second pass.`, e);
          }

          if (residueBlocks.length > 0) {
              console.log(`Page ${processedPage.id}: Found ${residueBlocks.length} residue blocks. Starting Pass 2 cleaning.`);
              
              updatePageStatus(processedPage.id, PageStatus.CLEANING);
              try {
                const refinedImage = await removeTextFromImage(
                    currentCleanedImage,
                    residueBlocks,
                    paddingToUse + 10, 
                    cleaningModel,
                    apiKey,
                    processedPage.width,
                    processedPage.height
                );

                if (refinedImage) {
                    processedPage.cleanedDataUrl = refinedImage;
                    updatePageInState(processedPage);
                }
              } catch (e) {
                  console.error(`Cleaning Pass 2 failed for page ${processedPage.id}`, e);
              }
          } else {
              console.log(`Page ${processedPage.id}: Clean verification passed. No residue found.`);
          }
      } else {
          console.log(`Page ${processedPage.id}: Verification disabled. Skipping Stage 3/4.`);
      }

      updatePageStatus(processedPage.id, PageStatus.DONE);
      return true;
  };

  const startProcessing = useCallback(async () => {
    const queue = pages.filter(p => p.selected && p.status !== PageStatus.DONE);
    
    if (queue.length === 0) {
        if (processedCount < selectedPagesCount) {
             alert("Please select pages to process.");
        }
        return;
    }
    
    if (isProcessing) return;
    setIsProcessing(true);

    for (const page of pages) {
        if (!page.selected) continue;
        if (page.status === PageStatus.DONE) continue;

        await processPageLogic(page, false); // Full process
        await new Promise(r => setTimeout(r, 200)); 
    }

    setIsProcessing(false);
  }, [pages, isProcessing, processedCount, selectedPagesCount, globalOcrModel, globalCleaningModel, globalPadding, apiKey, globalEnableVerification]);

  const handleReprocessPage = async (pageId: number, newScale: number, newPadding: number, newOcrModel: string, newCleaningModel: string, updatedBlocks?: TextBlock[], newEnableVerification?: boolean) => {
    if (!apiKey || isProcessing) return;
    
    setIsProcessing(true);

    try {
        let newImageData = null;
        let scaleChanged = false;
        
        const pageToUpdate = pages.find(p => p.id === pageId);
        if (!pageToUpdate) throw new Error("Page not found");

        // 1. Check if we need to re-render (Scale changed)
        if (currentFile && newScale !== pageToUpdate.scale) {
             scaleChanged = true;
             updatePageStatus(pageId, PageStatus.RENDERING);
             newImageData = await renderSinglePage(currentFile, pageId, newScale);
        }

        const updatedPage: PdfPage = {
            ...pageToUpdate,
            originalDataUrl: newImageData || pageToUpdate.originalDataUrl, 
            scale: newScale,
            padding: newPadding,
            ocrModel: newOcrModel,
            cleaningModel: newCleaningModel,
            enableVerification: newEnableVerification !== undefined ? newEnableVerification : pageToUpdate.enableVerification,
            // If we have updated blocks from the modal (user exclusions), use them
            // If we re-rendered (scale changed), we MUST clear blocks because coordinates are invalid for new resolution
            textBlocks: scaleChanged ? [] : (updatedBlocks || pageToUpdate.textBlocks),
            cleanedDataUrl: null, // Reset clean result
            status: PageStatus.IDLE
        };
        updatePageInState(updatedPage);

        // 2. Process
        // If scale changed, we need full OCR (skipOcr = false)
        // If only padding/model/blocks/verification changed, we can skip OCR if we have blocks (skipOcr = true)
        const skipOcr = !scaleChanged && updatedPage.textBlocks.length > 0;
        
        await processPageLogic(updatedPage, skipOcr);

    } catch (e) {
        console.error("Reprocess error", e);
        updatePageStatus(pageId, PageStatus.ERROR);
    } finally {
        setIsProcessing(false);
    }
  };

  const handleExport = async () => {
    const selectedPages = pages.filter(p => p.selected);
    if (selectedPages.length === 0) return;
    
    // Get job name
    const jobName = jobs.find(j => j.id === currentJobId)?.name || "Export";
    await generatePptx(selectedPages, `DeckSmith_${jobName}_${Date.now()}`);
  };

  const handleReset = () => {
    setPages([]);
    setIsParsing(false);
    setIsProcessing(false);
    setCurrentFile(null);
    setCurrentJobId(null);
  };

  // --- Render ---

  if (!apiKey) {
      return <Auth onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen pb-20 bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
             <button onClick={() => setIsHistoryOpen(true)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-brand-600 transition-colors">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
             </button>
             <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-brand-700 text-white rounded-lg flex items-center justify-center font-black italic">DS</div>
                <div>
                    <h1 className="font-black text-slate-900 tracking-tighter text-lg leading-tight">DeckSmith</h1>
                    <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">AI Reconstruction Engine</p>
                </div>
             </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button onClick={handleLogout} className="text-xs font-bold text-slate-400 hover:text-red-500 uppercase">
                Logout
            </button>
            <div className="text-[10px] font-black tracking-widest text-brand-600 flex items-center gap-1.5 uppercase bg-brand-50 px-2 py-1 rounded-lg border border-brand-100">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500"></span>
                </span>
                System Ready
            </div>
          </div>
        </div>
      </header>
      
      <HistorySidebar 
         jobs={jobs} 
         currentJobId={currentJobId}
         isOpen={isHistoryOpen} 
         onClose={() => setIsHistoryOpen(false)}
         onSelectJob={loadJob}
         onDeleteJob={handleDeleteJob}
      />

      <main className="max-w-7xl mx-auto px-6 py-10">
        
        {/* Section 0: Settings & Upload */}
        {pages.length === 0 && (
           <div className="max-w-3xl mx-auto mt-6 space-y-6">
              
              {/* Configuration Panel */}
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide mb-4 flex items-center gap-2">
                    <svg className="w-4 h-4 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                    Initial Configuration
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Column 1: Render Settings */}
                      <div className="space-y-6">
                        <div className="text-xs font-black text-slate-300 uppercase tracking-wider border-b border-slate-100 pb-1">Rendering</div>
                        
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <label className="text-xs font-bold text-slate-500">Render Scale</label>
                                <span className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-700">{globalScale}x</span>
                            </div>
                            <input 
                                type="range" min="1.5" max="4.0" step="0.5" 
                                value={globalScale}
                                onChange={(e) => setGlobalScale(parseFloat(e.target.value))}
                                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-600"
                                disabled={isParsing}
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <label className="text-xs font-bold text-slate-500">Removal Padding</label>
                                <span className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-700">{globalPadding}px</span>
                            </div>
                            <input 
                                type="range" min="0" max="50" step="5" 
                                value={globalPadding}
                                onChange={(e) => setGlobalPadding(parseInt(e.target.value))}
                                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                                disabled={isParsing}
                            />
                        </div>
                      </div>

                      {/* Column 2: Model Settings */}
                      <div className="space-y-4">
                        <div className="text-xs font-black text-slate-300 uppercase tracking-wider border-b border-slate-100 pb-1">AI Models & Workflow</div>
                        
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 block">OCR Model (Text Extraction)</label>
                            <select 
                                value={globalOcrModel}
                                onChange={(e) => setGlobalOcrModel(e.target.value)}
                                disabled={isParsing}
                                className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg p-2.5 focus:ring-brand-500 focus:border-brand-500 block"
                            >
                                {MODEL_CONFIG.OCR_MODELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                            </select>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 block">Cleaning Model (Inpainting)</label>
                            <select 
                                value={globalCleaningModel}
                                onChange={(e) => setGlobalCleaningModel(e.target.value)}
                                disabled={isParsing}
                                className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg p-2.5 focus:ring-purple-500 focus:border-purple-500 block"
                            >
                                {MODEL_CONFIG.CLEANING_MODELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                            </select>
                        </div>

                        <div className="pt-2">
                            <div className="flex items-center gap-3">
                                <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                                    <input 
                                        type="checkbox" 
                                        id="toggle-verification" 
                                        checked={globalEnableVerification}
                                        onChange={(e) => setGlobalEnableVerification(e.target.checked)}
                                        className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer checked:right-0 checked:border-brand-600"
                                        style={{right: globalEnableVerification ? '0' : 'auto', left: globalEnableVerification ? 'auto' : '0'}}
                                    />
                                    <label 
                                        htmlFor="toggle-verification" 
                                        className={`toggle-label block overflow-hidden h-5 rounded-full cursor-pointer ${globalEnableVerification ? 'bg-brand-600' : 'bg-slate-300'}`}
                                    ></label>
                                </div>
                                <label htmlFor="toggle-verification" className="text-xs font-bold text-slate-600 cursor-pointer">
                                    Deep Clean (Double Pass Verification)
                                </label>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1 pl-1">
                                Enables a second check to remove leftover text. Slower (2x cost), but cleaner.
                            </p>
                        </div>
                      </div>
                  </div>
              </div>

              <UploadZone onFileSelect={handleFileSelect} isProcessing={isParsing} />
           </div>
        )}

        {/* Section 2: Workspace */}
        {pages.length > 0 && (
            <div className="space-y-8">
                {/* Controls */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-3xl shadow-sm border border-slate-100 sticky top-20 z-40">
                    <div className="flex flex-col gap-2">
                        <h2 className="text-xl font-black text-slate-900 tracking-tight">
                            {jobs.find(j => j.id === currentJobId)?.name || 'Processing Queue'}
                        </h2>
                        <div className="flex items-center gap-3">
                             <div className="flex gap-1 text-[10px] font-bold uppercase">
                                <button onClick={() => toggleAllSelection(true)} disabled={isProcessing} className="hover:text-brand-600 disabled:opacity-50">Select All</button>
                                <span className="text-slate-300">|</span>
                                <button onClick={() => toggleAllSelection(false)} disabled={isProcessing} className="hover:text-brand-600 disabled:opacity-50">Deselect All</button>
                             </div>
                             <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                                {selectedPagesCount} Selected
                            </span>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        {!isProcessing && processedCount < selectedPagesCount && (
                            <button 
                                onClick={startProcessing}
                                disabled={selectedPagesCount === 0}
                                className="bg-slate-900 hover:bg-black disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl text-xs font-black shadow-lg shadow-slate-900/20 transition-all flex items-center gap-2 uppercase tracking-wide transform hover:-translate-y-0.5 active:translate-y-0"
                            >
                                <span>Process Selected</span>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                            </button>
                        )}
                         {isProcessing && (
                            <button disabled className="bg-slate-100 text-slate-400 px-6 py-3 rounded-xl text-xs font-black flex items-center gap-2 cursor-wait uppercase tracking-wide">
                                <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                                Processing ({processedCount}/{selectedPagesCount})
                            </button>
                        )}
                        
                        <button 
                            onClick={handleExport}
                            disabled={selectedPagesCount === 0 || isProcessing}
                            className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl text-xs font-black shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2 uppercase tracking-wide transform hover:-translate-y-0.5"
                        >
                            <span>Download ({selectedPagesCount})</span>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                        </button>
                        
                        <button 
                            onClick={handleReset}
                            disabled={isProcessing}
                            className="px-4 py-3 text-red-500 font-black text-xs hover:bg-red-50 rounded-xl transition-colors uppercase tracking-wide"
                        >
                            Close
                        </button>
                    </div>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {pages.map(page => (
                        <PageCard 
                          key={page.id} 
                          page={page} 
                          onEdit={(p) => setEditingPage(p)} 
                          onToggleSelection={togglePageSelection}
                        />
                    ))}
                </div>
            </div>
        )}

        {/* Edit Modal */}
        {editingPage && (
            <PageEditModal 
                page={editingPage}
                isProcessing={isProcessing}
                onClose={() => setEditingPage(null)}
                onReprocess={handleReprocessPage}
                ocrModels={MODEL_CONFIG.OCR_MODELS}
                cleaningModels={MODEL_CONFIG.CLEANING_MODELS}
            />
        )}

      </main>
    </div>
  );
}

export default App;

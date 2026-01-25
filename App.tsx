
import React, { useState, useEffect, useCallback } from 'react';
import { PdfPage, PageStatus, TextBlock, JobSession } from './types';
import { CONFIG, PROMPTS, APP_CONFIG } from './constants';
import { performOcr, cleanImage, validateApiKey } from './services/gemini';
import { maskTextRegions } from './services/imageProcessing';
import { saveSession, getSessions, deleteSession, hashApiKey, hydrateSession } from './services/db';
import { Modal } from './components/Modal';
import { Auth } from './components/Auth';

// Declare global types for libraries loaded via script tags
declare const pdfjsLib: any;
declare const PptxGenJS: any;

export default function App() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [apiKeyHash, setApiKeyHash] = useState<string | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  const [pages, setPages] = useState<PdfPage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [jobId, setJobId] = useState<string>(() => crypto.randomUUID());
  const [jobName, setJobName] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<JobSession[]>([]);

  // --- Auth & Init Logic ---

  useEffect(() => {
    checkAutoLogin();
  }, []);

  const checkAutoLogin = async () => {
    try {
      const stored = localStorage.getItem(APP_CONFIG.AUTH_STORAGE_KEY);
      if (stored) {
        const decodedKey = atob(stored);
        if (decodedKey && decodedKey.startsWith('AIza')) {
           // Optional: Validate on startup. Can skip to make it faster, 
           // but checking ensures key is still valid.
           const isValid = await validateApiKey(decodedKey);
           if (isValid) {
             await handleLoginSuccess(decodedKey);
             return;
           }
        }
      }
    } catch (e) {
      console.error("Auto login failed", e);
      localStorage.removeItem(APP_CONFIG.AUTH_STORAGE_KEY);
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const handleLoginSuccess = async (key: string) => {
    const hash = await hashApiKey(key);
    setApiKey(key);
    setApiKeyHash(hash);
    setIsLoadingAuth(false);
    // Load history after login
    const sessions = await getSessions(hash);
    setHistory(sessions);
  };

  const handleLogout = () => {
    localStorage.removeItem(APP_CONFIG.AUTH_STORAGE_KEY);
    setApiKey(null);
    setApiKeyHash(null);
    setPages([]);
    setHistory([]);
  };

  // --- Core App Logic ---

  const refreshHistory = async () => {
    if (apiKeyHash) {
      const sessions = await getSessions(apiKeyHash);
      setHistory(sessions);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!apiKeyHash) return;
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setError(null);
    setPages([]);
    const newJobId = crypto.randomUUID();
    const newJobName = file.name.replace(/\.[^/.]+$/, "");
    setJobId(newJobId);
    setJobName(newJobName);

    try {
      const parsedPages: PdfPage[] = [];

      if (file.type === 'application/pdf') {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 1 });
          const renderScale = CONFIG.DEFAULT_SCALE / Math.max(viewport.width, viewport.height);
          const highResViewport = page.getViewport({ scale: renderScale });

          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          if (!context) continue;

          canvas.width = highResViewport.width;
          canvas.height = highResViewport.height;

          await page.render({ canvasContext: context, viewport: highResViewport }).promise;
          const dataUrl = canvas.toDataURL('image/png');

          parsedPages.push({
            id: i,
            originalDataUrl: dataUrl,
            cleanedDataUrl: null,
            textBlocks: [],
            status: PageStatus.IDLE,
            width: highResViewport.width,
            height: highResViewport.height,
            aspectRatio: highResViewport.width / highResViewport.height,
            scale: renderScale,
            selected: true,
            ocrModel: 'gemini-3-flash-preview',
            cleaningModel: 'gemini-2.5-flash-image'
          });
        }
      } else if (file.type.startsWith('image/')) {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const image = new Image();
          image.onload = () => resolve(image);
          image.onerror = reject;
          image.src = dataUrl;
        });

        const renderScale = CONFIG.DEFAULT_SCALE / Math.max(img.width, img.height);
        const targetWidth = Math.floor(img.width * renderScale);
        const targetHeight = Math.floor(img.height * renderScale);

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) throw new Error("Canvas context failed");

        canvas.width = targetWidth;
        canvas.height = targetHeight;
        context.drawImage(img, 0, 0, targetWidth, targetHeight);
        
        const normalizedDataUrl = canvas.toDataURL('image/png');

        parsedPages.push({
          id: 1, 
          originalDataUrl: normalizedDataUrl,
          cleanedDataUrl: null,
          textBlocks: [],
          status: PageStatus.IDLE,
          width: targetWidth,
          height: targetHeight,
          aspectRatio: targetWidth / targetHeight,
          scale: renderScale,
          selected: true,
          ocrModel: 'gemini-3-flash-preview',
          cleaningModel: 'gemini-2.5-flash-image'
        });
      } else {
        throw new Error("Unsupported file format. Please upload a PDF or Image.");
      }

      if (parsedPages.length === 0) {
        throw new Error("No valid content found in file.");
      }

      setPages(parsedPages);
      
      const session: JobSession = {
        id: newJobId,
        name: newJobName,
        timestamp: Date.now(),
        pageCount: parsedPages.length,
        thumbnail: parsedPages[0].originalDataUrl,
        pages: parsedPages
      };
      await saveSession(session, apiKeyHash);
      await refreshHistory();

    } catch (err: any) {
      console.error(err);
      setError("Failed to parse file. Please try a valid PDF or Image.");
    } finally {
      setIsProcessing(false);
    }
  };

  const updateSession = async (updatedPages: PdfPage[]) => {
    if (!jobId || !apiKeyHash) return;
    const session: JobSession = {
      id: jobId,
      name: jobName,
      timestamp: Date.now(),
      pageCount: updatedPages.length,
      thumbnail: updatedPages[0]?.originalDataUrl || "",
      pages: updatedPages
    };
    await saveSession(session, apiKeyHash);
    await refreshHistory();
  };

  const processPage = async (page: PdfPage, skipOcr = false) => {
    if (!apiKey) return;

    const alreadyHasBlocks = page.textBlocks.length > 0;
    const shouldRunOcr = !skipOcr && !alreadyHasBlocks;
    
    setPages(prev => prev.map(p => p.id === page.id ? { 
      ...p, 
      status: shouldRunOcr ? PageStatus.ANALYZING : PageStatus.CLEANING 
    } : p));
    
    try {
      let currentBlocks = page.textBlocks;

      if (shouldRunOcr) {
        const ocrData = await performOcr(page.originalDataUrl, page.ocrModel, PROMPTS.OCR, apiKey);
        currentBlocks = ocrData.map(b => ({
          ...b,
          box_2d: b.geometry,
          included: b.type === 'presentation_text'
        }));
        
        setPages(prev => prev.map(p => p.id === page.id ? { 
          ...p, 
          textBlocks: currentBlocks,
          initialTextBlocks: currentBlocks,
          status: PageStatus.CLEANING 
        } : p));
      }

      const maskedImageUrl = await maskTextRegions(page.originalDataUrl, currentBlocks);

      const cleaningModel = page.cleaningModel;
      const cleaned = await cleanImage(maskedImageUrl, cleaningModel, PROMPTS.CLEAN, apiKey);
      
      if (cleaned) {
        setPages(prev => {
          const next = prev.map(p => p.id === page.id ? { 
            ...p, 
            textBlocks: currentBlocks, 
            initialTextBlocks: shouldRunOcr ? currentBlocks : p.initialTextBlocks,
            cleanedDataUrl: cleaned, 
            status: PageStatus.DONE 
          } : p);
          updateSession(next);
          return next;
        });
      } else {
        throw new Error("Cleaning failed");
      }
    } catch (err) {
      console.error(`Page ${page.id} processing error:`, err);
      setPages(prev => prev.map(p => p.id === page.id ? { ...p, status: PageStatus.ERROR } : p));
    }
  };

  const handleAdjustLayout = async (page: PdfPage) => {
    if (!apiKey) return;

    if (page.textBlocks.length === 0) {
      setIsProcessing(true);
      setError(null);
      setPages(prev => prev.map(p => p.id === page.id ? { ...p, status: PageStatus.ANALYZING } : p));
      
      try {
        const ocrData = await performOcr(page.originalDataUrl, page.ocrModel, PROMPTS.OCR, apiKey);
        const blocks = ocrData.map(b => ({
          ...b,
          box_2d: b.geometry,
          included: b.type === 'presentation_text'
        }));
        
        setPages(prev => {
          const next = prev.map(p => p.id === page.id ? { 
            ...p, 
            textBlocks: blocks,
            initialTextBlocks: blocks,
            status: PageStatus.IDLE 
          } : p);
          updateSession(next);
          return next;
        });
        
        setEditId(page.id);
      } catch (err) {
        console.error("Failed to fetch OCR for adjustment", err);
        setError("Text extraction failed. Unable to open layout adjustment.");
      } finally {
        setIsProcessing(false);
      }
    } else {
      setEditId(page.id);
    }
  };

  const startAll = async () => {
    setIsProcessing(true);
    for (const page of pages) {
      if (page.selected && page.status !== PageStatus.DONE) {
        const skipOcr = page.textBlocks.length > 0;
        await processPage(page, skipOcr);
      }
    }
    setIsProcessing(false);
  };

  const togglePageSelection = (id: number) => {
    setPages(prev => prev.map(p => p.id === id ? { ...p, selected: !p.selected } : p));
  };

  const selectAll = (selected: boolean) => {
    setPages(prev => prev.map(p => ({ ...p, selected })));
  };

  const exportPptx = async () => {
    const pptx = new PptxGenJS();
    const layout = CONFIG.LAYOUTS[0]; 
    
    pptx.defineLayout({ name: 'CUSTOM', width: layout.width, height: layout.height });
    pptx.layout = 'CUSTOM';

    for (const page of pages) {
      if (!page.selected) continue;

      const slide = pptx.addSlide();
      slide.addImage({ 
        data: page.cleanedDataUrl || page.originalDataUrl, 
        x: 0, y: 0, w: layout.width, h: layout.height 
      });

      page.textBlocks.filter(b => b.included).forEach(block => {
        const x = (block.box_2d[1] / 1000) * layout.width;
        const y = (block.box_2d[0] / 1000) * layout.height;
        const w = ((block.box_2d[3] - block.box_2d[1]) / 1000) * layout.width;
        const h = ((block.box_2d[2] - block.box_2d[0]) / 1000) * layout.height;

        const rawFontSize = (block.font_size || 20) / 1000 * layout.height * 72;
        const fontSize = rawFontSize * CONFIG.TEXT_SCALE_FACTOR;

        slide.addText(block.text, {
          x, y, w, h,
          fontSize: Math.max(Math.min(fontSize, 100), 6),
          fontFace: CONFIG.FONT_FALLBACK,
          color: block.color?.replace('#', '') || '000000',
          bold: block.is_bold,
          italic: block.italic,
          align: block.align || 'left',
          valign: 'top',
          margin: 0
        });
      });
    }

    await pptx.writeFile({ fileName: `${jobName || 'DeckSmith'}_Export.pptx` });
  };

  const loadJob = async (session: JobSession) => {
    // Session in 'history' (from LS) has stripped images. 
    // We need to hydrate it from IDB.
    const fullSession = await hydrateSession(session);
    
    setJobId(fullSession.id);
    setJobName(fullSession.name);
    setPages(fullSession.pages);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const removeJob = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!apiKeyHash) return;

    if (confirm("Permanently delete this project?")) {
      try {
        await deleteSession(id, apiKeyHash);
      } catch (err) {
        console.error("Failed to fully delete session:", err);
      }
      
      await refreshHistory();
      if (jobId === id) {
        setPages([]);
        setJobId(crypto.randomUUID());
        setJobName("");
      }
    }
  };

  if (isLoadingAuth) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
    </div>;
  }

  if (!apiKey) {
    return <Auth onLogin={handleLoginSuccess} />;
  }

  const selectedCount = pages.filter(p => p.selected).length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-teal-100">
      <header className="sticky top-0 z-50 h-24 bg-white/80 backdrop-blur-md border-b flex items-center justify-between px-8 md:px-12">
        <div className="flex items-center gap-4 cursor-pointer" onClick={() => { setPages([]); setJobId(crypto.randomUUID()); setJobName(""); }}>
          <div className="w-[64px] h-[52px] bg-[#0c6b5e] rounded-[14px] flex items-center justify-center text-white shadow-sm">
            <span className="text-2xl font-black italic tracking-tighter">DS</span>
          </div>
          <div className="flex flex-col">
            <h1 className="text-[32px] font-black leading-none text-[#0b1c2b] tracking-tight">DeckSmith</h1>
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#8ea0b3] mt-1.5">pdf to native pptx</p>
          </div>
        </div>

        <div className="flex gap-4 items-center">
          {pages.length > 0 && (
            <button 
              onClick={() => { setPages([]); setJobId(crypto.randomUUID()); setJobName(""); }}
              className="text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors mr-4"
            >
              Clear Workspace
            </button>
          )}
          <button 
             onClick={handleLogout}
             className="bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold text-[10px] uppercase tracking-widest px-4 py-2 rounded-lg transition-colors"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-8 md:px-12 py-12">
        {pages.length === 0 ? (
          <div className="max-w-4xl mx-auto space-y-20">
            <div className="text-center">
              <h2 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">Convert PDF/Images to Editable PPTX</h2>
            </div>

            <div className="relative group max-w-2xl mx-auto">
              <input 
                type="file" 
                accept=".pdf, image/*" 
                onChange={handleFileUpload} 
                disabled={isProcessing}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
              />
              <div className="border-4 border-dashed border-slate-200 rounded-[3rem] p-16 text-center bg-white group-hover:border-teal-400 group-hover:bg-teal-50 transition-all duration-300">
                <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-12 h-12 text-slate-300 group-hover:text-teal-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <h3 className="text-2xl font-black text-slate-800 mb-2">Drop your PDF or Image here</h3>
                <p className="text-slate-400 font-medium">or click to browse files</p>
                {isProcessing && (
                  <div className="mt-8 flex items-center justify-center gap-2 text-teal-600 font-bold">
                    <div className="w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
                    Processing Task...
                  </div>
                )}
              </div>
            </div>

            {history.length > 0 && (
              <div className="space-y-8">
                <div className="flex items-center gap-4">
                  <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">Recent Projects</h3>
                  <div className="flex-1 h-px bg-slate-100"></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {history.map(session => (
                    <div 
                      key={session.id}
                      onClick={() => loadJob(session)}
                      className="group bg-white border border-slate-100 rounded-[2rem] p-5 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 hover:-translate-y-1 transition-all cursor-pointer relative overflow-hidden"
                    >
                      <div className="aspect-video bg-slate-50 rounded-2xl overflow-hidden mb-4 border border-slate-50">
                        <img src={session.thumbnail} className="w-full h-full object-contain grayscale-[0.2] group-hover:grayscale-0 transition-all" alt={session.name} />
                      </div>
                      <div className="flex justify-between items-start pr-8">
                        <div>
                          <h4 className="font-black text-slate-900 truncate max-w-[180px]">{session.name}</h4>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                            {session.pageCount} Pages • {new Date(session.timestamp).toLocaleDateString()}
                          </p>
                        </div>
                        <button 
                          onClick={(e) => removeJob(session.id, e)}
                          className="absolute top-6 right-6 p-2 bg-white/80 backdrop-blur rounded-xl opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-500"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {error && <p className="mt-4 text-center text-red-500 font-bold">{error}</p>}
          </div>
        ) : (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="bg-white p-6 rounded-[2rem] border shadow-xl shadow-slate-200/50 flex flex-col md:flex-row justify-between items-center gap-6 sticky top-24 z-40">
              <div className="flex items-center gap-6 flex-1">
                <div className="h-12 w-1 bg-slate-100 rounded-full"></div>
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-black text-xl text-slate-900 truncate max-w-[300px]">{jobName}</h3>
                    <div className="flex items-center bg-slate-100 rounded-lg p-1">
                      <button onClick={() => selectAll(true)} className="px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-teal-600">All</button>
                      <div className="w-px h-3 bg-slate-300 mx-1"></div>
                      <button onClick={() => selectAll(false)} className="px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-teal-600">None</button>
                    </div>
                  </div>
                  <div className="flex gap-4 mt-1">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-teal-500"></div>
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{selectedCount} Selected</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{pages.filter(p => p.status === PageStatus.DONE).length} Ready</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 w-full md:w-auto">
                <button 
                  onClick={startAll} 
                  disabled={isProcessing || selectedCount === 0}
                  className="flex-1 md:flex-none bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black disabled:opacity-50 transition-all flex items-center justify-center gap-3"
                >
                  {isProcessing ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : `Process ${selectedCount} Selected`}
                </button>
                <button 
                  onClick={exportPptx} 
                  disabled={pages.every(p => !p.selected || p.status !== PageStatus.DONE)}
                  className="flex-1 md:flex-none bg-teal-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-teal-700 disabled:opacity-50 transition-all shadow-lg shadow-teal-100"
                >
                  Download .PPTX
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {pages.map(page => (
                <div 
                  key={page.id} 
                  className={`group relative bg-white border rounded-[2rem] p-4 shadow-sm transition-all duration-300 ${
                    page.selected ? 'border-teal-500 ring-2 ring-teal-50 shadow-md' : 'border-slate-200 grayscale-[0.5] opacity-80'
                  }`}
                >
                  <div className="aspect-video bg-slate-100 rounded-2xl overflow-hidden relative mb-4 border border-slate-100">
                    <img 
                      src={page.cleanedDataUrl || page.originalDataUrl} 
                      className="w-full h-full object-contain" 
                      alt={`Page ${page.id}`}
                    />
                    
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleAdjustLayout(page)}
                        disabled={isProcessing}
                        className="bg-white text-slate-900 px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:scale-105 transition-transform disabled:opacity-50"
                      >
                        Adjust Layout
                      </button>
                      {page.status === PageStatus.ERROR && (
                        <button 
                          onClick={() => processPage(page)}
                          className="bg-red-500 text-white px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest shadow-xl"
                        >
                          Retry
                        </button>
                      )}
                    </div>

                    <div className="absolute top-4 right-4 z-10">
                      <button 
                        onClick={() => togglePageSelection(page.id)}
                        className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all ${
                          page.selected 
                          ? 'bg-teal-600 border-teal-600 text-white shadow-lg' 
                          : 'bg-white border-slate-300 text-transparent'
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between px-2">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Status</span>
                      <div className="flex items-center gap-2">
                        {page.status === PageStatus.DONE && <div className="w-2 h-2 rounded-full bg-emerald-500"></div>}
                        {page.status === PageStatus.ERROR && <div className="w-2 h-2 rounded-full bg-red-500"></div>}
                        {page.status === PageStatus.IDLE && <div className="w-2 h-2 rounded-full bg-slate-200"></div>}
                        {[PageStatus.ANALYZING, PageStatus.CLEANING].includes(page.status) && (
                          <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></div>
                        )}
                        <span className={`font-black text-[11px] uppercase tracking-widest ${
                          page.status === PageStatus.DONE ? 'text-emerald-600' :
                          page.status === PageStatus.ERROR ? 'text-red-500' : 'text-slate-500'
                        }`}>
                          {page.status}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Extraction</span>
                      <div className="text-[11px] font-black text-slate-900">
                        {page.textBlocks.filter(b => b.included).length} Elements
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {pages.length === 0 && (
        <footer className="py-20 text-center border-t mt-20">
          <div className="max-w-xl mx-auto px-8">
            <p className="text-slate-400 text-sm leading-relaxed">
              Powered by 國網中心 GenAI Team • <a href="https://hackmd.io/@whYPD8MBSHWRZV6y-ymFwQ/HkY70CFrZe" target="_blank" rel="noopener noreferrer" className="underline hover:text-teal-600 transition-colors">User Manual</a>
            </p>
          </div>
        </footer>
      )}

      {editId !== null && (
        <Modal 
          page={pages.find(p => p.id === editId)!}
          onClose={() => setEditId(null)}
          onSave={async (blocks) => {
            const next = pages.map(p => p.id === editId ? { ...p, textBlocks: blocks } : p);
            setPages(next);
            await updateSession(next);
          }}
          onReprocess={async (blocks) => {
            const page = pages.find(p => p.id === editId)!;
            const updatedPage = { ...page, textBlocks: blocks };
            const next = pages.map(p => p.id === editId ? updatedPage : p);
            setPages(next);
            await updateSession(next);
            await processPage(updatedPage, true);
          }}
        />
      )}
    </div>
  );
}

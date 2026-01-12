import { PdfPage, PageStatus } from '../types';
import { PDF_CONFIG, MODEL_CONFIG } from '../constants';

declare global {
  interface Window {
    pdfjsLib: any;
  }
}

if (window.pdfjsLib) {
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_CONFIG.WORKER_SRC;
}

export const parsePdf = async (
    file: File, 
    scale: number = PDF_CONFIG.DEFAULT_SCALE, 
    padding: number = PDF_CONFIG.DEFAULT_PADDING,
    ocrModel: string = MODEL_CONFIG.DEFAULT_OCR_MODEL,
    cleaningModel: string = MODEL_CONFIG.DEFAULT_CLEANING_MODEL,
    enableVerification: boolean = false
): Promise<PdfPage[]> => {
  if (!window.pdfjsLib) {
    throw new Error("PDF.js library not loaded");
  }

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages: PdfPage[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: scale }); 
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) continue;

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvasContext: ctx, viewport }).promise;
    const dataUrl = canvas.toDataURL('image/png');

    pages.push({
      id: i,
      originalDataUrl: dataUrl,
      cleanedDataUrl: null,
      textBlocks: [],
      status: PageStatus.IDLE,
      width: viewport.width,
      height: viewport.height,
      aspectRatio: viewport.width / viewport.height,
      scale: scale, 
      padding: padding,
      selected: true,
      ocrModel: ocrModel,
      cleaningModel: cleaningModel,
      enableVerification: enableVerification
    });
  }

  return pages;
};

// Function to re-render a specific page with a custom scale
export const renderSinglePage = async (file: File, pageNumber: number, scale: number): Promise<string | null> => {
    if (!window.pdfjsLib) return null;
    
    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const page = await pdf.getPage(pageNumber);
        const viewport = page.getViewport({ scale: scale });

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({ canvasContext: ctx, viewport }).promise;
        return canvas.toDataURL('image/png');
    } catch (e) {
        console.error("Re-render error:", e);
        return null;
    }
}


export interface BoundingBox {
  ymin: number;
  xmin: number;
  ymax: number;
  xmax: number;
}

export interface TextBlock {
  text: string;
  box_2d: number[]; // [ymin, xmin, ymax, xmax]
  font_size?: number;
  is_bold?: boolean;
  align?: string;
  color?: string;
  included?: boolean; // New: If false, this block will be skipped during cleaning
}

export enum PageStatus {
  IDLE = 'IDLE',
  RENDERING = 'RENDERING', // New status for re-rendering PDF
  ANALYZING = 'ANALYZING', // OCR
  CLEANING = 'CLEANING',   // Image Inpainting
  VERIFYING = 'VERIFYING', // New: Checking for leftovers
  DONE = 'DONE',
  ERROR = 'ERROR'
}

export interface PdfPage {
  id: number;
  originalDataUrl: string; // Base64 (Heavy)
  cleanedDataUrl: string | null; // Base64 (Heavy)
  textBlocks: TextBlock[];
  status: PageStatus;
  width: number;
  height: number;
  aspectRatio: number;
  scale: number;
  padding?: number;
  selected: boolean;
  ocrModel?: string;
  cleaningModel?: string;
  enableVerification?: boolean; // New: Toggle for 2-pass cleaning
}

// For Storage (Lightweight version of PdfPage to store in LocalStorage)
export interface PdfPageMetadata {
    id: number;
    textBlocks: TextBlock[];
    status: PageStatus;
    width: number;
    height: number;
    aspectRatio: number;
    scale: number;
    padding?: number;
    selected: boolean;
    ocrModel?: string;
    cleaningModel?: string;
    enableVerification?: boolean;
    // DataURLs are NOT stored here, but in IndexedDB
}

export interface ProjectJob {
    id: string; // UUID
    name: string;
    timestamp: number;
    pageCount: number;
    pages: PdfPageMetadata[]; // Lightweight pages
}

export enum ProcessingMode {
  OCR_ONLY = 'OCR_ONLY',
  CLEAN_ONLY = 'CLEAN_ONLY',
  FULL_RECONSTRUCTION = 'FULL_RECONSTRUCTION'
}

export interface ProcessingStats {
  total: number;
  completed: number;
}

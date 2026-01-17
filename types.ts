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
  italic?: boolean; // New: Support for italic text
  align?: string;
  color?: string;
  included?: boolean; 
  type?: 'presentation_text' | 'embedded_art_text'; // New: Text classification
}

export enum PageStatus {
  IDLE = 'IDLE',
  RENDERING = 'RENDERING', 
  ANALYZING = 'ANALYZING', 
  CLEANING = 'CLEANING',   
  VERIFYING = 'VERIFYING', 
  DONE = 'DONE',
  ERROR = 'ERROR'
}

export interface PdfPage {
  id: number;
  originalDataUrl: string; 
  cleanedDataUrl: string | null; 
  textBlocks: TextBlock[];
  status: PageStatus;
  width: number;
  height: number;
  aspectRatio: number;
  scale: number;
  selected: boolean;
  ocrModel?: string;
  cleaningModel?: string;
  enableVerification?: boolean; 
}

export interface PdfPageMetadata {
    id: number;
    textBlocks: TextBlock[];
    status: PageStatus;
    width: number;
    height: number;
    aspectRatio: number;
    scale: number;
    selected: boolean;
    ocrModel?: string;
    cleaningModel?: string;
    enableVerification?: boolean;
}

export interface ProjectJob {
    id: string; 
    name: string;
    timestamp: number;
    pageCount: number;
    pages: PdfPageMetadata[]; 
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
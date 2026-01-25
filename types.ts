
export interface TextBlock {
  text: string;
  box_2d: number[]; // [ymin, xmin, ymax, xmax] (0-1000)
  font_size?: number;
  is_bold?: boolean;
  italic?: boolean;
  align?: 'left' | 'center' | 'right';
  color?: string;
  included?: boolean; 
  type?: 'presentation_text' | 'embedded_art_text';
}

export enum PageStatus {
  IDLE = 'IDLE',
  RENDERING = 'RENDERING', 
  ANALYZING = 'ANALYZING', 
  CLEANING = 'CLEANING',   
  DONE = 'DONE',
  ERROR = 'ERROR'
}

export interface PdfPage {
  id: number;
  originalDataUrl: string; 
  cleanedDataUrl: string | null; 
  textBlocks: TextBlock[];
  initialTextBlocks?: TextBlock[]; // Store the original OCR result for reset capability
  status: PageStatus;
  width: number;
  height: number;
  aspectRatio: number;
  scale: number;
  selected: boolean;
  ocrModel: string;
  cleaningModel: string;
}

export interface DbImageRecord {
  id: string; // jobId_pageId_type
  jobId: string;
  pageId: number;
  type: 'orig' | 'clean';
  data: string;
}

export interface JobSession {
  id: string;
  name: string;
  timestamp: number;
  pageCount: number;
  thumbnail: string; // Data URL of the first page
  pages: PdfPage[]; // Metadata and blocks (excluding heavy dataUrl if preferred, but for now we store for simplicity)
}

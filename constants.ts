import { TextBlock } from "./types";

export const APP_CONFIG = {
  NAME: "DeckSmith",
  INVITATION_CODE: "ai4all",
  AUTO_SAVE_DEBOUNCE_MS: 1000,
  MAX_RECOMMENDED_PAGES: 20,
};

export const STORAGE_CONFIG = {
  API_KEY: 'decksmith_apiKey',
  JOBS_PREFIX: 'decksmith_jobs_',
  DB_NAME: 'DeckSmith_DB',
  STORE_NAME: 'page_images',
};

export const PDF_CONFIG = {
  WORKER_SRC: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
  DEFAULT_SCALE: 2.0,
  DEFAULT_PADDING: 20,
};

export const PPTX_CONFIG = {
  // Standard PPT width is 10 inches
  SLIDE_WIDTH_IN: 10.0,
  // Scale to 98% of detected size (Adjusted from 80%)
  FONT_SCALE_FACTOR: 0.98,
  MIN_FONT_SIZE_PT: 6,
  DEFAULT_FONT_FACE: "Microsoft YaHei",
  DEFAULT_COLOR: "000000",
};

export const MODEL_CONFIG = {
  OCR_MODELS: [
    { value: 'gemini-3-flash-preview', label: 'Gemini 3 Flash (Fast)' },
    { value: 'gemini-3-pro-preview', label: 'Gemini 3 Pro (Precise)' }
  ],
  CLEANING_MODELS: [
    { value: 'gemini-2.5-flash-image', label: 'Nano Banana (Fast)' },
    { value: 'gemini-3-pro-image-preview', label: 'Nano Banana Pro (High Quality)' }
  ],
  DEFAULT_OCR_MODEL: 'gemini-3-flash-preview',
  DEFAULT_CLEANING_MODEL: 'gemini-2.5-flash-image',
  
  // Logic Thresholds
  // 0-1000 units, approx 1.5% of dimension
  BOX_MERGE_THRESHOLD: 15, 
  // Max boxes to send to inpainting to avoid context limit
  MAX_INPAINT_BOXES: 150,
  // Temperature settings
  TEMP_OCR: 0,
  TEMP_INPAINTING: 0.2,
};

export const PROMPTS = {
  // P-01
  API_VALIDATION: "Test",

  // P-02
  OCR_DETECTION: `
Analyze this image and extract ALL visible text.

CRITICAL INSTRUCTIONS:
1. **DETECTION PRIORITY**: Find every single character, including small headers, footers, and labels.
2. **BOUNDING BOXES**: Return precise [ymin, xmin, ymax, xmax] coordinates (0-1000 scale).
3. **SEGMENTATION**: Split text into visual lines.
4. **NO STYLING**: Do not analyse color or font yet. Focus 100% on finding the text.

OUTPUT FORMAT:
JSON Array: [{ "text": "...", "box_2d": [ymin, xmin, ymax, xmax] }]
  `,

  // P-03
  OCR_ENRICHMENT: (basicBlocks: TextBlock[]) => `
You are a design analyzer. I have detected text in this image. 
Your job is to identify the visual attributes (Color, Font Size, Bold, Alignment) for each provided block.

INPUT BLOCKS:
${JSON.stringify(basicBlocks)}

INSTRUCTIONS:
1. Return the EXACT same list of blocks, ensuring text and box_2d match the input.
2. Add the following fields to each object:
   - "color": Dominant hex color (e.g. #FF0000).
   - "font_size": Relative height (0-1000 scale).
   - "is_bold": boolean.
   - "align": "left", "center", or "right".

OUTPUT:
JSON Array of fully enriched text blocks.
  `,

  // P-04
  INPAINTING: (boxes: number[][]) => `
Edit the provided image.

STRATEGY: INTELLIGENT TEXT REMOVAL
Your goal is to remove text from the specified regions while PRESERVING diagrams, icons, and illustrations.

INSTRUCTIONS:
1. **TARGET REGIONS**: Focus strictly on the provided bounding boxes.
2. **ACTION**: Carefully remove the text strokes within the boxes.
3. **BACKGROUND**: Fill the removed text area with the underlying background color or texture.
4. **SAFETY**: If a box overlaps a character, robot, or detailed illustration, DO NOT ERASE THE ILLUSTRATION. Only remove the text characters on top of it.
5. **QUALITY**: Seamless blending. No white patches over graphics.

REGIONS TO CLEAN (0-1000 coords):
${JSON.stringify(boxes)}
  `
};

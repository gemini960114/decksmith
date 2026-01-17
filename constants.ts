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
  GLOBAL_SCALE_OPTIONS: [1024, 1536, 2048, 2560, 3072],
  DEFAULT_GLOBAL_SCALE: 2048,
  DEFAULT_INDIVIDUAL_SCALE: 2.0,
};

export const PPTX_CONFIG = {
  LAYOUTS: [
    { value: '16:9', label: 'Widescreen (16:9)', width: 10, height: 5.625 },
    { value: '4:3', label: 'Standard (4:3)', width: 10, height: 7.5 }
  ],
  DEFAULT_LAYOUT: '16:9',
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
  
  BOX_MERGE_THRESHOLD: 15, 
  MAX_INPAINT_BOXES: 150,
  TEMP_OCR: 0,
  TEMP_INPAINTING: 0.2,
};

export const PROMPTS = {
  API_VALIDATION: "Test",

  OCR_SINGLE_PASS: `
Analyze this image and extract ALL visible text with full layout and style information.

CRITICAL INSTRUCTIONS:
1. DETECTION: Find every character, including headers, footers, labels, and annotations.
2. GEOMETRY: Provide precise [ymin, xmin, ymax, xmax] coordinates on a 0-1000 scale, independent of the original image pixel size.
3. STYLING: For each text block, determine:
   - "font_size": Relative height of the characters (0-1000 scale). This should represent the Cap Height (height of uppercase letters). Ensure it is consistent with the geometry.
   - "is_bold": Whether the text appears bold (boolean).
   - "italic": Whether the text appears italic (boolean).
   - "color": Dominant hex color (e.g., "#000000").
   - "align": Text alignment ("left", "center", or "right").
4. TYPE: Classify each text block as:
   - "presentation_text" → main document text, headers, and bullet points to be extracted for the PPTX.
   - "embedded_art_text" → text physically integrated into charts, diagrams, or illustrations that should stay in the background.

OUTPUT FORMAT:
Return a JSON array of objects with keys: "text", "geometry", "font_size", "is_bold", "italic", "color", "align", "type".
  `,

  INPAINTING: `This is a slide from a presentation. 

TASK:
Remove ONLY the overlay text that belongs to the presentation, including titles, bullet points, headers, footers, and annotations. 

IMPORTANT:
- STRICTLY PRESERVE all illustrations, characters, diagrams, charts, icons, photographs, and any text that is physically part of these elements (e.g., chart labels, axes numbers, labels inside drawings, or text in illustrations).
- Do NOT remove, alter, or obscure any part of illustrations, diagrams, or embedded text.
- Only remove standalone presentation text that is not integrated into artwork or diagrams.
- Maintain the original background seamlessly, reconstructing any areas where text was removed naturally.
- If any text is close to illustrations or charts, carefully preserve the artwork while removing the overlay text.

RETURN:
- Return ONLY the final edited image.
- Ensure the visual integrity of the slide is fully preserved.`
};
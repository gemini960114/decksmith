
export const CONFIG = {
  DB_NAME: "DeckSmith_DB",
  STORE_NAME: "page_images",
  FONT_FALLBACK: "Noto Sans TC",
  DEFAULT_SCALE: 1024, // Base pixel width for high-quality extraction
  TEXT_SCALE_FACTOR: 0.95, // Default text scaling factor for PPTX export
  LAYOUTS: [
    { value: '16:9', width: 10, height: 5.625 },
    { value: '4:3', width: 10, height: 7.5 }
  ]
};

export const APP_CONFIG = {
  INVITATION_CODE: "ai4all",
  STORAGE_KEY_PREFIX: "decksmith_jobs_",
  AUTH_STORAGE_KEY: "decksmith_apiKey"
};

export const PROMPTS = {
  OCR: `Analyze this slide and extract ALL text overlay blocks. For each block, provide:
1. "text": The literal string.
2. "geometry": [ymin, xmin, ymax, xmax] coordinates normalized to 0-1000.
3. "font_size": Estimated size (0-1000 normalized to slide height).
4. "is_bold": true/false.
5. "italic": true/false.
6. "color": Hex code (e.g. #FFFFFF).
7. "align": "left", "center", or "right".
8. "type": Use "presentation_text" for titles/body content to be removed, "embedded_art_text" for text that is part of a logo or illustration.

Return strictly valid JSON array of objects.`,

  CLEAN: `The input image has been pre-processed with masked regions covering text.
These masks use gradients and soft edges (feathering) to approximate the background color.

Your task is "Seamless Inpainting" to perfectly restore the background behind these masks.

Instructions:
1. **Blend & Dissolve:**
   - The mask edges are softened. You must blend them seamlessly into the surrounding background.
   - Eliminate all rectangular artifacts, seams, or color discontinuities.

2. **Reconstruct Structure:**
   - If a background line, gradient, texture, or geometric pattern enters the masked area, continue it naturally.
   - Do NOT just blur the area. Reconstruct the underlying details (grid lines, shapes, noise texture).

3. **Remove Residuals:**
   - If any text fragments, glow, or anti-aliasing artifacts remain near the mask edges, clean them up completely.

4. **Strict Constraints:**
   - PRESERVE all diagrams, icons, and illustrations outside the masked regions.
   - Do NOT add new objects, text, or watermarks.
   - Maintain the original resolution and aspect ratio.

Return ONLY the fully restored image.`
};

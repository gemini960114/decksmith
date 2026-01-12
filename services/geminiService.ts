import { GoogleGenAI, Type } from "@google/genai";
import { TextBlock } from "../types";
import { PROMPTS, MODEL_CONFIG } from "../constants";

// Helper to create client with user's key
const getAiClient = (apiKey: string) => new GoogleGenAI({ apiKey });

/**
 * Validate API Key
 * Checks if the key format is plausible and tests connectivity with Gemini.
 */
export const validateApiKey = async (apiKey: string): Promise<boolean> => {
    // 1. Format Check
    if (!apiKey || !apiKey.startsWith("AIza")) return false;
    
    try {
        const ai = getAiClient(apiKey);
        // 2. Network Check
        // Use default OCR model for a quick and lightweight verification
        await ai.models.generateContent({
            model: MODEL_CONFIG.DEFAULT_OCR_MODEL,
            contents: PROMPTS.API_VALIDATION,
        });
        return true;
    } catch (e) {
        console.warn("API Key Validation Failed:", e);
        return false;
    }
};

/**
 * OCR: Extract text with layout information
 * Implements a Two-Stage strategy for better accuracy:
 * 1. Detection Pass: Focus strictly on geometry (boxes) and content.
 * 2. Enrichment Pass: Analyze style (color, font) for the detected boxes.
 */
export const extractTextFromImage = async (
    base64Image: string, 
    modelName: string, 
    apiKey: string,
    mode: 'simple' | 'detailed' = 'detailed'
): Promise<TextBlock[]> => {
  const ai = getAiClient(apiKey);
  const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');

  // --- PHASE 1: GEOMETRY DETECTION ---
  // Priority: High Recall. Find every character. Ignore style.
  try {
    const detectionResponse = await ai.models.generateContent({
      model: modelName,
      contents: {
        parts: [
          { text: PROMPTS.OCR_DETECTION },
          { inlineData: { mimeType: "image/png", data: cleanBase64 } }
        ]
      },
      config: {
        temperature: MODEL_CONFIG.TEMP_OCR, 
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING },
              box_2d: { 
                type: Type.ARRAY, 
                items: { type: Type.NUMBER },
                description: "ymin, xmin, ymax, xmax (0-1000)"
              }
            },
            required: ["text", "box_2d"]
          }
        } 
      }
    });

    let basicBlocks: TextBlock[] = [];
    if (detectionResponse.text) {
        basicBlocks = JSON.parse(detectionResponse.text) as TextBlock[];
    }
    
    // Initialize 'included' property
    basicBlocks = basicBlocks.map(b => ({ ...b, included: true }));

    // If strictly layout mode or no text found, return early
    if (mode === 'simple' || basicBlocks.length === 0) {
        return basicBlocks;
    }

    // --- PHASE 2: STYLE ENRICHMENT ---
    // Only run if detailed mode is requested.
    // We send the detected blocks back to the model to fill in the styles.
    const enrichmentResponse = await ai.models.generateContent({
      model: modelName,
      contents: {
        parts: [
          { text: PROMPTS.OCR_ENRICHMENT(basicBlocks) },
          { inlineData: { mimeType: "image/png", data: cleanBase64 } }
        ]
      },
      config: {
        temperature: MODEL_CONFIG.TEMP_OCR,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING },
              box_2d: { type: Type.ARRAY, items: { type: Type.NUMBER } },
              font_size: { type: Type.NUMBER },
              is_bold: { type: Type.BOOLEAN },
              align: { type: Type.STRING },
              color: { type: Type.STRING }
            },
            required: ["text", "box_2d"]
          }
        }
      }
    });

    if (enrichmentResponse.text) {
        let enriched = JSON.parse(enrichmentResponse.text) as TextBlock[];
        // Ensure 'included' persists if implicit, but usually Phase 2 returns new objects
        return enriched.map(b => ({ ...b, included: true }));
    }
    
    // Fallback: If phase 2 fails (e.g. empty response), return basic blocks
    return basicBlocks;

  } catch (error) {
    console.error("OCR Error:", error);
    return [];
  }
};

/**
 * Helper: Merge overlapping or nearby boxes to reduce fragmentation
 * This improves inpainting by creating larger, continuous masks instead of confetti.
 */
const mergeBoundingBoxes = (boxes: number[][], threshold: number = MODEL_CONFIG.BOX_MERGE_THRESHOLD): number[][] => {
    if (boxes.length === 0) return [];

    // Sort by ymin then xmin
    const sorted = [...boxes].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const merged: number[][] = [];

    let current = sorted[0];

    for (let i = 1; i < sorted.length; i++) {
        const next = sorted[i];

        // Check for intersection or proximity
        // Box format: [ymin, xmin, ymax, xmax]
        const isVerticalClose = next[0] < current[2] + threshold; // next.ymin < current.ymax + gap
        const isHorizontalClose = 
            (next[1] < current[3] + threshold) && // next.xmin < current.xmax + gap
            (next[3] > current[1] - threshold);   // next.xmax > current.xmin - gap

        // Also merge if one is inside another
        const isInside = 
            next[0] >= current[0] && next[2] <= current[2] &&
            next[1] >= current[1] && next[3] <= current[3];

        if ((isVerticalClose && isHorizontalClose) || isInside) {
            // Merge
            current = [
                Math.min(current[0], next[0]),
                Math.min(current[1], next[1]),
                Math.max(current[2], next[2]),
                Math.max(current[3], next[3]),
            ];
        } else {
            merged.push(current);
            current = next;
        }
    }
    merged.push(current);
    return merged;
};

/**
 * Image Cleaning: Remove text from image (Inpainting)
 * Updated to use correct coordinate normalization and box merging.
 */
export const removeTextFromImage = async (
    base64Image: string, 
    textBlocks: TextBlock[] = [], 
    paddingPx: number = 20, 
    modelName: string, 
    apiKey: string,
    imageWidth: number,
    imageHeight: number
): Promise<string | null> => {
  try {
    const ai = getAiClient(apiKey);
    const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');

    // 1. Calculate Normalized Padding (Pixels -> 0-1000 scale)
    // Guard against divide by zero, though unlikely with valid images
    const safeW = imageWidth || 1000;
    const safeH = imageHeight || 1000;
    
    const normPadX = (paddingPx / safeW) * 1000;
    const normPadY = (paddingPx / safeH) * 1000;

    // Helper to expand a box
    const expand = ([ymin, xmin, ymax, xmax]: number[]) => ([
        Math.max(0, Math.floor(ymin - normPadY)),
        Math.max(0, Math.floor(xmin - normPadX)),
        Math.min(1000, Math.ceil(ymax + normPadY)),
        Math.min(1000, Math.ceil(xmax + normPadX)),
    ]);

    // 2. Pre-process Boxes: Filter Included -> Extract -> Merge -> Expand
    
    // FILTER: Only process blocks that are NOT marked as excluded
    const activeBlocks = textBlocks.filter(b => b.included !== false);

    // Extract valid raw boxes
    const rawBoxes = activeBlocks
        .filter(b => b.box_2d && b.box_2d.length === 4)
        .map(b => b.box_2d);

    // Merge nearby boxes FIRST 
    const mergedBoxes = mergeBoundingBoxes(rawBoxes, MODEL_CONFIG.BOX_MERGE_THRESHOLD);

    // Expand merged boxes using the normalized padding
    const boxesToClean = mergedBoxes.map(expand);

    // Limit complexity for the prompt
    const finalBoxes = boxesToClean.slice(0, MODEL_CONFIG.MAX_INPAINT_BOXES);

    const response = await ai.models.generateContent({
        model: modelName,
        contents: {
            parts: [
                { text: PROMPTS.INPAINTING(finalBoxes) },
                {
                    inlineData: {
                        mimeType: "image/png",
                        data: cleanBase64
                    }
                }
            ]
        },
        config: {
            temperature: MODEL_CONFIG.TEMP_INPAINTING, 
        }
    });

    const parts = response.candidates?.[0]?.content?.parts;
    if (parts) {
        for (const part of parts) {
            if (part.inlineData && part.inlineData.data) {
                return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
            }
        }
    }
    
    return null;
  } catch (error) {
    console.error("Inpainting Error:", error);
    return null;
  }
};

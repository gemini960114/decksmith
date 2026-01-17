import { GoogleGenAI, Type } from "@google/genai";
import { TextBlock } from "../types";
import { PROMPTS, MODEL_CONFIG } from "../constants";

const getAiClient = (apiKey: string) => new GoogleGenAI({ apiKey });

export const validateApiKey = async (apiKey: string): Promise<boolean> => {
    if (!apiKey || !apiKey.startsWith("AIza")) return false;
    
    try {
        const ai = getAiClient(apiKey);
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

const sortBlocksByReadingOrder = (blocks: TextBlock[]): TextBlock[] => {
    return [...blocks].sort((a, b) => {
        if (!a.box_2d || !b.box_2d) return 0;
        const [yminA, xminA] = a.box_2d;
        const [yminB, xminB] = b.box_2d;

        if (Math.abs(yminA - yminB) > 20) {
            return yminA - yminB;
        }
        return xminA - xminB;
    });
};

export const extractTextFromImage = async (
    base64Image: string, 
    modelName: string, 
    apiKey: string,
    mode: 'simple' | 'detailed' = 'detailed'
): Promise<TextBlock[]> => {
  const ai = getAiClient(apiKey);
  const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: {
        parts: [
          { text: PROMPTS.OCR_SINGLE_PASS },
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
              geometry: { 
                type: Type.ARRAY, 
                items: { type: Type.NUMBER },
                description: "ymin, xmin, ymax, xmax (0-1000)"
              },
              font_size: { type: Type.NUMBER },
              is_bold: { type: Type.BOOLEAN },
              italic: { type: Type.BOOLEAN },
              align: { type: Type.STRING },
              color: { type: Type.STRING },
              type: { type: Type.STRING, enum: ["presentation_text", "embedded_art_text"] }
            },
            required: ["text", "geometry", "type"]
          }
        } 
      }
    });

    if (response.text) {
        const rawJson = JSON.parse(response.text);
        const blocks = rawJson.map((b: any) => ({
            text: b.text,
            box_2d: b.geometry,
            font_size: b.font_size,
            is_bold: b.is_bold || false,
            italic: b.italic || false,
            align: b.align || 'left',
            color: b.color || '#000000',
            type: b.type || 'presentation_text',
            included: true
        })) as TextBlock[];
        
        return sortBlocksByReadingOrder(blocks).map(b => ({ 
            ...b, 
            font_size: b.font_size || 12,
            is_bold: b.is_bold || false,
            italic: b.italic || false,
            align: b.align || 'left',
            color: b.color || '#000000',
            type: b.type || 'presentation_text'
        }));
    }
    
    return [];

  } catch (error) {
    console.error("Single-Pass OCR Error:", error);
    return [];
  }
};

export const removeTextFromImage = async (
    base64Image: string, 
    modelName: string, 
    apiKey: string
): Promise<string | null> => {
  try {
    const ai = getAiClient(apiKey);
    const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');

    const response = await ai.models.generateContent({
        model: modelName,
        contents: {
            parts: [
                { text: PROMPTS.INPAINTING },
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
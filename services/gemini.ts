
import { GoogleGenAI, Type } from "@google/genai";

export const validateApiKey = async (apiKey: string): Promise<boolean> => {
  try {
    const ai = new GoogleGenAI({ apiKey });
    // Make a very cheap/fast call to validate the key
    await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts: [{ text: "Hi" }] },
      config: { maxOutputTokens: 1 }
    });
    return true;
  } catch (error) {
    console.warn("API Key Validation Failed:", error);
    return false;
  }
};

export const performOcr = async (base64: string, model: string, prompt: string, apiKey: string): Promise<any[]> => {
  const ai = new GoogleGenAI({ apiKey });
  const data = base64.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');
  
  const response = await ai.models.generateContent({
    model,
    contents: { 
      parts: [
        { text: prompt }, 
        { inlineData: { mimeType: "image/png", data } }
      ] 
    },
    config: {
      temperature: 0,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING },
            geometry: { type: Type.ARRAY, items: { type: Type.NUMBER } },
            font_size: { type: Type.NUMBER },
            is_bold: { type: Type.BOOLEAN },
            italic: { type: Type.BOOLEAN },
            align: { type: Type.STRING },
            color: { type: Type.STRING },
            type: { type: Type.STRING }
          },
          required: ["text", "geometry", "font_size", "is_bold", "italic", "align", "color", "type"]
        }
      }
    }
  });

  try {
    return JSON.parse(response.text || '[]');
  } catch (e) {
    console.error("Failed to parse OCR response", e);
    return [];
  }
};

export const cleanImage = async (base64: string, model: string, prompt: string, apiKey: string): Promise<string | null> => {
  const ai = new GoogleGenAI({ apiKey });
  const data = base64.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');

  const response = await ai.models.generateContent({
    model,
    contents: { 
      parts: [
        { text: prompt }, 
        { inlineData: { mimeType: "image/png", data } }
      ] 
    },
    config: {
      temperature: 0.1,
    }
  });

  const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
  if (part?.inlineData?.data) {
    return `data:image/png;base64,${part.inlineData.data}`;
  }
  return null;
};

import { GoogleGenAI } from "@google/genai";

export function getGeminiAI(apiKey: string) {
  if (!apiKey) {
    throw new Error("Gemini API Key is required. Please set it in Settings.");
  }
  return new GoogleGenAI({ apiKey });
}

export async function generateGeminiContent(apiKey: string, prompt: string, context: string, attachments: any[] = []) {
  const ai = getGeminiAI(apiKey);
  
  const contentParts: any[] = [
    { text: `You are an expert AI coding assistant. 
    Context:
    ${context}
    
    User Request:
    ${prompt}
    
    Provide code snippets and explanations. Use markdown.` }
  ];

  // Add image attachments for multimodal support
  attachments.forEach(file => {
    if (file.type.startsWith('image/')) {
      const base64Data = file.data.split(',')[1];
      contentParts.push({
        inlineData: {
          data: base64Data,
          mimeType: file.type
        }
      });
    }
  });

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: [{ role: "user", parts: contentParts }],
  });

  return response.text;
}

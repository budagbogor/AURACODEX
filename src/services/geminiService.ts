import { GoogleGenAI } from "@google/genai";

const API_KEY = process.env.GEMINI_API_KEY;

export const ai = new GoogleGenAI({ apiKey: API_KEY });

export async function generateCode(prompt: string, context: string) {
  const model = ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: [
      {
        role: "user",
        parts: [{ text: `You are an expert AI coding assistant. 
        Context:
        ${context}
        
        User Request:
        ${prompt}
        
        Provide code snippets and explanations. Use markdown.` }],
      },
    ],
  });

  const response = await model;
  return response.text;
}

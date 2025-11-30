import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AISuggestion } from "../types";

const apiKey = process.env.API_KEY;

// Initialize Gemini Client
// We assume process.env.API_KEY is available.
const ai = new GoogleGenAI({ apiKey: apiKey });

const suggestionSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    tags: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "A list of 3-5 relevant short tags for the idea.",
    },
    nextSteps: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "A list of 3 concrete, actionable first steps to validate or start this idea.",
    },
  },
  required: ["tags", "nextSteps"],
};

export const generateIdeaSuggestions = async (title: string, content: string): Promise<AISuggestion> => {
  if (!apiKey) {
    throw new Error("API Key is missing");
  }

  const prompt = `
    Analyze the following idea and provide:
    1. A set of relevant tags (max 5).
    2. A list of immediate next steps (max 3) to execute this idea.
    
    Idea Title: ${title}
    Idea Description: ${content}
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: suggestionSchema,
        systemInstruction: "You are a helpful product manager and creative assistant. Output strictly in JSON.",
      },
    });

    const text = response.text;
    if (!text) return { tags: [], nextSteps: [] };
    
    return JSON.parse(text) as AISuggestion;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return { tags: [], nextSteps: [] };
  }
};

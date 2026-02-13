import { GoogleGenAI } from "@google/genai";
import { SubtaskSuggestion } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export const generateSubtasks = async (taskTitle: string): Promise<SubtaskSuggestion[]> => {
  try {
    const prompt = `
      Break down the following task into 3 to 5 distinct, actionable, and concrete subtasks.
      Task: "${taskTitle}"
      
      Return ONLY a raw JSON array of strings. Do not include markdown formatting (like \`\`\`json).
      Example output: ["Subtask 1", "Subtask 2", "Subtask 3"]
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      }
    });

    const text = response.text;
    if (!text) return [];

    // Parse the JSON array
    const suggestions = JSON.parse(text);
    if (Array.isArray(suggestions)) {
      return suggestions.map(s => String(s));
    }
    return [];

  } catch (error) {
    console.error("Failed to generate subtasks:", error);
    // Fallback or rethrow depending on desired behavior. 
    // For UI simplicity, we return empty array to signal failure silently or let UI handle it.
    return [];
  }
};

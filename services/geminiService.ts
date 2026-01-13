import { GoogleGenAI } from "@google/genai";

let client: GoogleGenAI | null = null;

const getClient = () => {
  if (!client) {
    const apiKey = process.env.API_KEY || ''; // Fallback to empty if not set, will fail gracefully
    client = new GoogleGenAI({ apiKey });
  }
  return client;
};

export const generateAIResponse = async (history: { role: 'user' | 'model', text: string }[], userPrompt: string): Promise<string> => {
  try {
    const ai = getClient();
    if (!process.env.API_KEY) {
      return "Пожалуйста, настройте API_KEY в среде, чтобы общаться со Spark AI.";
    }

    // Convert history to compatible format if needed, or just use generateContent with system instruction context
    // For simplicity in this demo, we'll send the prompt directly or use a chat session if we were maintaining state here.
    // We will use generateContent for stateless simplicity in this specific function wrapper.

    const model = 'gemini-3-flash-preview';
    
    // Construct a context-aware prompt
    const conversation = history.map(h => `${h.role === 'user' ? 'User' : 'Spark AI'}: ${h.text}`).join('\n');
    const fullPrompt = `You are Spark AI, an intelligent and helpful assistant inside the Spark Chat messenger.
    Be concise, friendly, and helpful. 
    
    Conversation History:
    ${conversation}
    
    User: ${userPrompt}
    Spark AI:`;

    const response = await ai.models.generateContent({
      model,
      contents: fullPrompt,
    });

    return response.text || "Извините, я не могу ответить прямо сейчас.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Произошла ошибка при соединении с нейросетью.";
  }
};
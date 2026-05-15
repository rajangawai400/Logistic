import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function getLogisticsInsight(data: any[]) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analysing the following logistics tracking data.
      For each day, provide a extremely brief "mood" (e.g. "Safe", "Escalating", "Critical", "Avoid Delay") and a 5-word micro-insight.
      Return the response as a JSON object where keys are the 'formattedDate' and values are like { mood: string, tip: string }.
      
      Data:
      ${JSON.stringify(data, null, 2)}`,
      config: {
        systemInstruction: "You are a logistics AI. Be ultra-concise. Return ONLY valid JSON.",
        responseMimeType: "application/json",
      },
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Gemini Error:", error);
    return null;
  }
}

export async function fetchLiveRates() {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "As a logistics and financial analyst, provide the current (May 2026) estimated ocean freight rates for 20ft and 40ft from JNPT to Europe, and the 24K Gold price (per 10g). Return a JSON object: { oceanFreight20ft: number, oceanFreight40ft: number, goldRate: number, goldChange: number, reason: string }. The goldChange is the INR change from the previous day.",
      config: {
        systemInstruction: "You are a market pricing expert. Provide realistic May 2026 estimates. Return ONLY valid JSON.",
        responseMimeType: "application/json",
      },
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Gemini Live Rate Error:", error);
    return null;
  }
}

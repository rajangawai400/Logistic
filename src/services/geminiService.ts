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
      contents: "As a logistics expert analyst, provide the current (May 2026) estimated ocean freight rates for 20ft and 40ft containers from JNPT (Nhava Sheva) to major European ports. Return the rates in INR as a simple JSON object: { oceanFreight20ft: number, oceanFreight40ft: number, reason: string }. The reason should be a short 10-word market context.",
      config: {
        systemInstruction: "You are a logistics pricing expert. Provide realistic estimated market rates for May 2026. Only return valid JSON.",
        responseMimeType: "application/json",
      },
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Gemini Live Rate Error:", error);
    return null;
  }
}

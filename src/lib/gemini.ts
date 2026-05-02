import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function getHealthcareInsights(vitals: any, context: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{
        role: "user",
        parts: [{
          text: `You are MedGemma, a personalized AI healthcare consultant. 
          Analyze the following vital signs and provide personalized health insights and recommendations.
          
          Patient Vital Signs:
          - Heart Rate: ${vitals.heartRate} bpm
          - Blood Pressure: ${vitals.bloodPressure}
          - SpO2: ${vitals.spo2}%
          
          Clinical Context: ${context}
          
          Provide a "Cardiovascular Stability Assessment" section in your analysis.
          
          Format your response with:
          1. Analysis of current signals and stability.
          2. Specific recommendations.
          3. Potential risks for chronic diseases.
          4. Emergency Dispatch: If vitals are critical (HR > 100 or SpO2 < 92), state "ACTION: INITIATE_EMERGENCY_VIDEO_CONSULT" at the end.
          Keep it professional yet accessible.`
        }]
      }],
      config: {
        temperature: 0.7,
      }
    });

    return response.text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "I'm sorry, I'm currently unable to process health insights. Please consult with a medical professional.";
  }
}

export async function chatWithMedGemma(message: string, history: any[]) {
  try {
    const formattedHistory = history.map(h => ({
      role: h.role === 'user' ? 'user' : 'model',
      parts: [{ text: h.content }]
    }));

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        ...formattedHistory,
        { role: 'user', parts: [{ text: message }] }
      ],
      config: {
        systemInstruction: "You are MedGemma, a world-class AI healthcare consultant specializing in chronic disease monitoring. You provide empathetic, accurate, and evidence-based health advice. Always remind the user that you are an AI and they should consult human doctors for final clinical decisions.",
      }
    });

    return response.text;
  } catch (error) {
    console.error("Chat Error:", JSON.stringify(error));
    return "I'm having trouble connecting to my knowledge base. Please try again in a moment.";
  }
}

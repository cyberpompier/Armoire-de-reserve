import { GoogleGenAI, Modality } from "@google/genai";
import { EquipmentType } from "../types";

const getAiClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const identifyEquipmentFromImage = async (base64Image: string): Promise<{ type: EquipmentType | null, condition: string, confidence: number }> => {
  try {
    const ai = getAiClient();
    const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");

    const prompt = `
      Analyses cette image d'équipement de pompier. 
      Identifie le type d'équipement parmi cette liste exacte : 
      ${Object.values(EquipmentType).join(', ')}.
      Estime aussi l'état général (Neuf, Bon, Usé, Critique).
      
      Réponds UNIQUEMENT au format JSON :
      {
        "type": "Nom exact de la liste",
        "condition": "État estimé",
        "confidence": 0.95
      }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { inlineData: { data: cleanBase64, mimeType: 'image/jpeg' } },
          { text: prompt },
        ],
      },
      config: {
        responseModalities: [Modality.TEXT],
        temperature: 0.4,
      },
    });

    const text = response.text;
    if (!text) return { type: null, condition: 'Inconnu', confidence: 0 };

    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const result = JSON.parse(jsonStr);

    return {
      type: result.type as EquipmentType,
      condition: result.condition,
      confidence: result.confidence
    };

  } catch (error) {
    console.error("Gemini Vision Error:", error);
    return { type: null, condition: 'Erreur', confidence: 0 };
  }
};

export const analyzeStockStatus = async (inventoryJson: string): Promise<string> => {
  try {
    const ai = getAiClient();
    const prompt = `
      Agis comme un responsable logistique de caserne de pompiers.
      Voici l'export JSON de notre stock actuel :
      ${inventoryJson}

      Fournis une analyse concise (max 3 points) sur :
      1. Les équipements critiques manquants ou en faible quantité (status 'Disponible').
      2. Le pourcentage de matériel 'Hors service'.
      3. Une recommandation prioritaire.
      
      Utilise un ton professionnel et direct.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "Analyse indisponible.";

  } catch (error) {
    console.error("Gemini Text Error:", error);
    return "Erreur lors de l'analyse IA.";
  }
};
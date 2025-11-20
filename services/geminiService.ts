import { GoogleGenAI } from "@google/genai";
import { AIHint, SearchResult } from "../types";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key not found");
  return new GoogleGenAI({ apiKey });
};

export const getGameHint = async (
  grid: number[][],
  pieces: (any | null)[],
  score: number
): Promise<AIHint | null> => {
  try {
    const ai = getClient();
    
    // Filter out null pieces and get shapes
    const availablePieces = pieces
      .map((p, index) => p ? { index, type: p.type, shape: p.shape } : null)
      .filter(p => p !== null);

    if (availablePieces.length === 0) return null;

    const prompt = `
      Ahşap Blok Bulmaca oyunlarında (Woodoku benzeri) uzman bir oyuncusun.
      
      Mevcut Oyun Durumu:
      - Tahta Boyutu: 9x9
      - Puan: ${score}
      - Izgara (0 boş, 1 dolu):
      ${JSON.stringify(grid)}
      
      - Yerleştirilebilir Parçalar (sırasıyla):
      ${JSON.stringify(availablePieces)}
      
      Görev:
      Tahtayı ve mevcut parçaları analiz et.
      Puanı maksimize etmek veya satırları temizlemek için EN İYİ hamleyi bul.
      Oyunun bitmesini önlemek için 3x3 kareleri, satırları veya sütunları temizlemeye öncelik ver.
      
      SADECE aşağıdaki yapıda geçerli bir JSON nesnesi döndür:
      {
        "pieceIndex": <kullanılacak parçanın listedeki indeksi>,
        "position": { "row": <satır indeksi 0-8>, "col": <sütun indeksi 0-8> },
        "reasoning": "<bu hamlenin neden en iyisi olduğuna dair TÜRKÇE kısa açıklama>"
      }
      
      Pozisyon, parça şeklinin başladığı sol üst koordinat olmalıdır.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 32768 },
        responseMimeType: "application/json"
      }
    });

    if (!response.text) return null;
    
    // Clean markdown if present
    const cleanJson = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanJson) as AIHint;

  } catch (error) {
    console.error("Error getting hint:", error);
    return null;
  }
};

export const getWoodBlockTips = async (): Promise<{ tips: string, sources: SearchResult[] }> => {
  try {
    const ai = getClient();
    const prompt = "9x9 Ahşap Blok Bulmaca oyunlarında (Woodoku gibi) yüksek puan almak için en iyi ileri düzey stratejiler nelerdir? TÜRKÇE olarak, kısa maddeler halinde yaz.";
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });

    const tips = response.text || "Tahtayı temiz tutmaya odaklanın ve kombo yapmak için aynı anda birden fazla satır veya 3x3 kare temizlemeye çalışın!";
    const sources: SearchResult[] = [];
    
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks) {
      chunks.forEach((chunk: any) => {
        if (chunk.web?.uri && chunk.web?.title) {
          sources.push({ title: chunk.web.title, uri: chunk.web.uri });
        }
      });
    }

    return { tips, sources };
  } catch (error) {
    console.error("Error getting tips:", error);
    return { tips: "Kombo bonusları için birden fazla satırı aynı anda temizlemeye odaklanın!", sources: [] };
  }
};
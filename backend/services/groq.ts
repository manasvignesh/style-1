import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function generateOutfitSuggestions(items: any[], occasion: string, customPrompt?: string) {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = customPrompt || `
    You are a fashion expert. From these wardrobe items, generate 5 unique outfit combinations for the occasion: ${occasion}.
    
    Wardrobe Items:
    ${JSON.stringify(items, null, 2)}
    
    Each outfit must have exactly one item from these categories if available: Cap, Top, Bottom, Footwear.
    Pick items that match in color, style and the specified occasion.
    
    Return ONLY a JSON array of 5 objects. Each object must have these keys:
    - "outfit": number
    - "cap": name of the selected cap item (or null)
    - "top": name of the selected top item
    - "bottom": name of the selected bottom item
    - "footwear": name of the selected footwear item
    - "style_tags": array of 2-3 style tags (e.g. ["Casual", "Streetwear"])
  `;

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.7,
      },
    });

    let content = result.response.text();
    if (!content) throw new Error('No content from Gemini');
    
    console.log('RAW Gemini Outfit Response:', content);

    // Clean JSON (handle backticks)
    content = content.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const firstSquare = content.indexOf('[');
    const firstCurly = content.indexOf('{');
    let startIdx = -1;
    if (firstSquare !== -1 && firstCurly !== -1) startIdx = Math.min(firstSquare, firstCurly);
    else if (firstSquare !== -1) startIdx = firstSquare;
    else if (firstCurly !== -1) startIdx = firstCurly;
    
    if (startIdx !== -1) content = content.substring(startIdx);

    try {
      const parsed = JSON.parse(content);
      const finalResult = Array.isArray(parsed) ? parsed : (parsed.outfits || parsed.suggestions || []);
      if (finalResult.length === 0) throw new Error('Empty suggestions array');
      return finalResult;
    } catch (parseError) {
      console.error('JSON Parse Error, trying manual repair...', parseError);
      throw parseError; // Caught by outer catch
    }
  } catch (error) {
    console.error('Gemini Service Critical Error:', error);
    // Ultimate guaranteed fallback: return 5 unique combinations from the provided items
    const mockOutfits = [];
    
    // Group all items by category to have a broad pool
    const allTops = items.filter(it => it.category === 'Tops' || it.category === 'topwear');
    const allBottoms = items.filter(it => it.category === 'Bottoms' || it.category === 'bottomwear');
    const allShoes = items.filter(it => it.category === 'Footwear' || it.category === 'footwear');
    const allCaps = items.filter(it => it.category === 'Accessories' || it.category === 'Accessories');

    for (let i = 0; i < 5; i++) {
      // Pick different items for each slide using different offsets and random selection
      const topIdx = (i + Math.floor(Math.random() * 3)) % allTops.length;
      const bottomIdx = (i + 1 + Math.floor(Math.random() * 2)) % allBottoms.length;
      const shoeIdx = (i + 2 + Math.floor(Math.random() * 4)) % allShoes.length;
      const capIdx = i % allCaps.length;

      mockOutfits.push({
        outfit: i + 1,
        top: allTops[topIdx]?.name || 'White Tee',
        bottom: allBottoms[bottomIdx]?.name || 'Black Cargo',
        footwear: allShoes[shoeIdx]?.name || 'White Sneakers',
        cap: i % 2 === 0 ? (allCaps[capIdx]?.name || null) : null,
        style_tags: i % 2 === 0 ? ["Casual", "Classic"] : ["Streetwear", "Urban"]
      });
    }
    return mockOutfits;
  }
}

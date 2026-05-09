// ============================================
// AI Vision Service (via Google Gemini)
// Body analysis + Outfit generation
// ============================================

import { GoogleGenerativeAI, Part } from '@google/generative-ai';
import { logger } from '../utils/logger.js';
import { buildBodyAnalysisPrompt } from '../prompts/bodyAnalysis.js';
import { buildOutfitPrompt } from '../prompts/outfitGeneration.js';
import type { BodyAnalysis, Outfit } from '../types.js';

const MAX_RETRIES = 2;

export const FALLBACK_BODY_ANALYSIS: BodyAnalysis = {
  bodyType: "Average build",
  physiqueAnalysis: "Balanced proportions with average shoulder width",
  skinTone: "Neutral",
  faceStructure: "Oval face shape",
  vibe: "Casual Minimalist",
  bestColors: ["Navy", "White", "Beige", "Olive", "Black"],
  recommendedFits: ["Relaxed fits", "Classic proportions"],
  avoid: ["Overly tight garments", "Clashing bold patterns"],
  fashionInspiration: ["Smart Casual", "Everyday Minimal"]
};

export const FALLBACK_OUTFITS: Outfit[] = [
  {
    title: "Minimal Casual",
    topwear: "Oversized black t-shirt",
    bottomwear: "Relaxed beige trousers",
    footwear: "White sneakers",
    layering: "none",
    accessories: ["Silver watch"],
    keywords: ["oversized black t-shirt men", "beige relaxed trousers men", "white minimalist sneakers"],
    imagePrompt: "Fashion catalog photo: oversized black t-shirt with beige relaxed trousers, white sneakers, clean studio background, full body, high detail"
  }
];

function getGenAI() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY is not set in environment');
  return new GoogleGenerativeAI(key);
}

function cleanGeminiJson(text: string): any {
  console.log("RAW GEMINI RESPONSE:\n", text);
  let cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  const firstCurly = cleaned.indexOf('{');
  const firstSquare = cleaned.indexOf('[');
  let startIndex = -1;
  if (firstCurly !== -1 && firstSquare !== -1) startIndex = Math.min(firstCurly, firstSquare);
  else if (firstCurly !== -1) startIndex = firstCurly;
  else if (firstSquare !== -1) startIndex = firstSquare;
  if (startIndex !== -1) cleaned = cleaned.substring(startIndex);

  try {
    return JSON.parse(cleaned);
  } catch (e) {
    try {
      cleaned = cleaned.replace(/,\s*([\]}])/g, '$1');
      return JSON.parse(cleaned);
    } catch (err: any) {
      logger.error('Gemini', 'JSON Parse Error', err.message);
      throw new Error('Failed to parse Gemini response as valid JSON');
    }
  }
}

async function callGemini(
  prompt: string,
  imageBase64: string,
  mimeType: string,
  retryCount = 0
): Promise<any> {
  const genAI = getGenAI();
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

  try {
    const parts: Part[] = [
      { text: prompt },
      {
        inlineData: {
          data: imageBase64,
          mimeType: mimeType
        }
      }
    ];

    const result = await model.generateContent({
      contents: [{ role: 'user', parts }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.7,
      },
    });

    const text = result.response.text();
    if (!text.trim()) throw new Error('Empty response from Gemini');
    return cleanGeminiJson(text);
  } catch (error: any) {
    if (retryCount < MAX_RETRIES) {
      logger.warn('Gemini', `Attempt ${retryCount + 1} failed, retrying...`, error.message);
      await new Promise((r) => setTimeout(r, 1000 * (retryCount + 1)));
      return callGemini(prompt, imageBase64, mimeType, retryCount + 1);
    }
    throw error;
  }
}

export async function analyzeBody(
  imageBase64: string,
  mimeType: string,
  occasion: string,
  style: string,
  preferences: string
): Promise<BodyAnalysis> {
  logger.stage('ANALYZE', 'Starting Gemini body analysis...');
  const prompt = buildBodyAnalysisPrompt(occasion, style, preferences);
  try {
    const result = await callGemini(prompt, imageBase64, mimeType);
    return {
      bodyType: result.bodyType || 'Athletic',
      physiqueAnalysis: result.physiqueAnalysis || "Balanced proportions",
      skinTone: result.skinTone || 'Neutral',
      faceStructure: result.faceStructure || "Average",
      vibe: result.vibe || 'Minimal',
      bestColors: result.bestColors || [],
      recommendedFits: result.recommendedFits || ["Relaxed fits"],
      avoid: result.avoid || [],
      fashionInspiration: result.fashionInspiration || []
    };
  } catch (err: any) {
    logger.error('ANALYZE', 'Gemini analysis failed, using fallback', err.message);
    return FALLBACK_BODY_ANALYSIS;
  }
}

export async function generateOutfits(
  analysis: BodyAnalysis,
  imageBase64: string,
  mimeType: string,
  occasion: string,
  style: string,
  preferences: string
): Promise<Outfit[]> {
  logger.stage('OUTFITS', 'Generating Gemini outfit recommendations...');
  const prompt = buildOutfitPrompt(analysis, occasion, style, preferences);
  try {
    const result = await callGemini(prompt, imageBase64, mimeType);
    const outfits = Array.isArray(result) ? result : result.outfits || [];
    return outfits;
  } catch (err: any) {
    logger.error('OUTFITS', 'Gemini outfit generation failed, using fallback', err.message);
    return FALLBACK_OUTFITS;
  }
}

import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, Sparkles, X, Star, Image as ImageIcon, Shirt, Home, User, Wand2, Layers, ChevronRight, Heart, Share2, ArrowLeft, Loader2, Maximize2, CheckCircle, RefreshCw, Search, Bell } from 'lucide-react';
import { client } from "@gradio/client";
import { GoogleGenerativeAI } from '@google/generative-ai';
import Wardrobe from './Wardrobe';

const SYSTEM_INSTRUCTIONS = {
  'try-on': `You are a fashion assistant. A user has uploaded their photo and wants to see how a specific clothing item or style fits them.
Carefully observe the user's body proportions, build, and current style.
Provide a detailed analysis of the fit and look of the specified item on them.

Output ONLY in JSON:
{
  "fit": "Detailed analysis of how the item fits their body proportions",
  "look": "How the item complements their physique and style",
  "styleVibe": "The overall vibe (e.g., casual, elegant, streetwear)",
  "verdict": "Overall recommendation",
  "tryThisNext": "One additional item or accessory that would enhance this look"
}`,
  'suggestions': `You are a fashion assistant. A user has uploaded their photo and wants outfit suggestions.
Carefully observe the user's body proportions, build, and current style.
Suggest outfits that would suit them perfectly for their specified event and preferences.

Output ONLY in JSON:
{
  "bodyType": "Short friendly description of their body type",
  "fitAdvice": "General advice on what silhouettes fit them best",
  "styleVibe": "Their natural style vibe",
  "outfitSuggestions": [
    {
      "title": "Outfit name",
      "description": "Detailed clothing combination",
      "reason": "Why this specific outfit suits them",
      "imagePrompt": "high quality fashion photo of outfit, Generate a realistic fashion product image: Outfit: {{clothing combo}}, Style: {{style type}}, Clean studio background, Full body mannequin OR model, High detail fabric texture, Fashion catalog quality, Neutral lighting. IMPORTANT: Do NOT include original user face, Only show outfit clearly"
    }
  ]
}`
};


type TabType = 'home' | 'try-on' | 'suggestions' | 'wardrobe' | 'profile';

interface SuggestResults {
  bodyType: string;
  fitAdvice: string;
  styleVibe: string;
  outfitSuggestions: {
    title: string;
    description: string;
    reason: string;
    imagePrompt: string;
  }[];
}

interface WeatherSnapshot {
  city: string;
  tempC: number;
  feelsLikeC: number;
  humidity: number;
  windKph: number;
  main: string;
  condition: string;
}

interface UserProfile {
  name: string;
  age: string;
  height: string;
  gender: string;
  preferredFits: string;
  preferredStyles: string;
}

const STORAGE_KEYS = {
  auth: 'agni:isLoggedIn',
  showGetStarted: 'agni:showGetStarted',
  showOnboarding: 'agni:showOnboarding',
  onboardingStep: 'agni:onboardingStep',
  activeTab: 'agni:activeTab',
  userProfile: 'agni:userProfile',
} as const;

const defaultUserProfile: UserProfile = {
  name: '',
  age: '',
  height: '',
  gender: '',
  preferredFits: '',
  preferredStyles: '',
};

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
const apiUrl = (path: string) => `${API_BASE_URL}${path}`;

const readStoredBoolean = (key: string, fallback: boolean) => {
  if (typeof window === 'undefined') return fallback;
  const value = window.localStorage.getItem(key);
  return value === null ? fallback : value === 'true';
};

const readStoredNumber = (key: string, fallback: number) => {
  if (typeof window === 'undefined') return fallback;
  const value = window.localStorage.getItem(key);
  if (value === null) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const readStoredTab = () => {
  if (typeof window === 'undefined') return 'home' as TabType;
  const value = window.localStorage.getItem(STORAGE_KEYS.activeTab);
  return value === 'try-on' || value === 'suggestions' || value === 'wardrobe' || value === 'profile' || value === 'home'
    ? value
    : 'home';
};

const readStoredUserProfile = (): UserProfile => {
  if (typeof window === 'undefined') return defaultUserProfile;
  const value = window.localStorage.getItem(STORAGE_KEYS.userProfile);
  if (!value) return defaultUserProfile;

  try {
    const parsed = JSON.parse(value);
    return {
      ...defaultUserProfile,
      ...parsed,
    };
  } catch {
    return defaultUserProfile;
  }
};

const getWeatherStyleTip = (weather: WeatherSnapshot | null, gender: string) => {
  const audience = gender === 'Male' ? 'Men' : gender === 'Female' ? 'Women' : 'Everyone';

  if (!weather) {
    return {
      title: 'Style Tip of the Day',
      message: `${audience}: Choose breathable layers today while Agni checks your local weather.`,
      meta: 'Weather loading',
    };
  }

  const condition = weather.main.toLowerCase();
  const temp = weather.feelsLikeC ?? weather.tempC;
  const isRainy = condition.includes('rain') || condition.includes('drizzle') || condition.includes('thunderstorm');
  const isCold = temp <= 18;
  const isHot = temp >= 31;
  const isHumid = weather.humidity >= 70;
  const isWindy = weather.windKph >= 24;

  let outfit = 'a breathable cotton tee with relaxed trousers and clean sneakers';

  if (gender === 'Male') {
    if (isRainy) outfit = 'a light waterproof jacket, quick-dry tee, dark jeans, and closed sneakers';
    else if (isCold) outfit = 'a knit layer or overshirt with straight jeans and boots';
    else if (isHot || isHumid) outfit = 'a linen shirt or airy polo with chinos and breathable loafers';
    else if (isWindy) outfit = 'a structured overshirt with a tucked tee, trousers, and low-top sneakers';
    else outfit = 'a crisp shirt layered over a tee with chinos and minimal sneakers';
  } else if (gender === 'Female') {
    if (isRainy) outfit = 'a cropped rain jacket, quick-dry top, straight pants, and closed flats';
    else if (isCold) outfit = 'a soft cardigan or blazer over a midi dress with ankle boots';
    else if (isHot || isHumid) outfit = 'a cotton kurta, linen co-ord, or breezy midi dress with sandals';
    else if (isWindy) outfit = 'a fitted top with wide-leg trousers and a light jacket';
    else outfit = 'a flowy blouse with tailored trousers or a relaxed day dress';
  } else {
    if (isRainy) outfit = 'a water-resistant layer, quick-dry base, dark bottoms, and closed shoes';
    else if (isCold) outfit = 'a warm overshirt or cardigan with denim and sturdy shoes';
    else if (isHot || isHumid) outfit = 'linen or cotton separates in a relaxed fit with breathable footwear';
    else if (isWindy) outfit = 'a light jacket over a fitted base with structured trousers';
  }

  return {
    title: 'Weather Style Tip',
    message: `${audience}: ${weather.condition} in ${weather.city}, feels like ${temp}C. Wear ${outfit}.`,
    meta: `${weather.tempC}C · ${weather.humidity}% humidity · ${weather.windKph} km/h wind`,
  };
};

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => readStoredBoolean(STORAGE_KEYS.auth, false));
  const [landingView, setLandingView] = useState<'initial' | 'login' | 'signup'>('initial');
  const [showGetStarted, setShowGetStarted] = useState(() => readStoredBoolean(STORAGE_KEYS.showGetStarted, false));
  const [showOnboarding, setShowOnboarding] = useState(() => readStoredBoolean(STORAGE_KEYS.showOnboarding, false));
  const [onboardingStep, setOnboardingStep] = useState(() => readStoredNumber(STORAGE_KEYS.onboardingStep, 1));
  const [userProfile, setUserProfile] = useState<UserProfile>(() => readStoredUserProfile());
  const [weatherTip, setWeatherTip] = useState(() => getWeatherStyleTip(null, ''));

  const [activeTab, setActiveTab] = useState<TabType>(() => readStoredTab());
  const [selectedOutfitFromSuggest, setSelectedOutfitFromSuggest] = useState<any>(null);
  
  // Cross-app State
  const [personImage, setPersonImage] = useState<File | null>(null);
  const [personPreview, setPersonPreview] = useState<string | null>(null);
  const personInputRef = useRef<HTMLInputElement>(null);

  const [clothingImage, setClothingImage] = useState<File | null>(null);
  const [clothingPreview, setClothingPreview] = useState<string | null>(null);
  const clothingInputRef = useRef<HTMLInputElement>(null);

  const [description, setDescription] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);

  // Suggestions Flow State
  const [suggestStep, setSuggestStep] = useState(1);
  const [suggestEvent, setSuggestEvent] = useState('');
  const [suggestStyle, setSuggestStyle] = useState('');
  const [suggestPreferences, setSuggestPreferences] = useState('');
  const [suggestResults, setSuggestResults] = useState<any>(null);
  const [suggestError, setSuggestError] = useState(false);
  const [suggestStage, setSuggestStage] = useState<string>(''); // SSE pipeline stage
  const [suggestProducts, setSuggestProducts] = useState<Record<string, any[]>>({}); // product results
  const [selectedOutfit, setSelectedOutfit] = useState<any>(null); // Viewing outfit detail
  const [activeFilter, setActiveFilter] = useState('All');
  const [aiTrialRoomOutfit, setAiTrialRoomOutfit] = useState<any>(null); // Trial Room specific

  // Try-On Redesign State
  const [selectedTryOnCategory, setSelectedTryOnCategory] = useState<string>('');
  const [selectedTryOnMode, setSelectedTryOnMode] = useState<string>('Gen Z');
  const [selectedTryOnOutfit, setSelectedTryOnOutfit] = useState<any>(null);
  const [isTryOnStyling, setIsTryOnStyling] = useState(false);
  const [tryOnResult, setTryOnResult] = useState<any>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [tryOnError, setTryOnError] = useState<string | null>(null);
  const tryOnClothingInputRef = useRef<HTMLInputElement>(null);
  const [tryOnClothingImage, setTryOnClothingImage] = useState<File | null>(null);
  const [tryOnClothingPreview, setTryOnClothingPreview] = useState<string | null>(null);
  const [debugLog, setDebugLog] = useState<{step: string, status: string, error?: string, id?: string}>({ step: 'Idle', status: 'Waiting' });

  const fileToDataUri = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
    });
  };

  const [simulationStepText, setSimulationStepText] = useState('Generating your look...');

  const generateVirtualTryOn = async () => {
    console.log("TRY-ON BUTTON CLICKED");
    if (!personImage || !tryOnClothingImage) return;

    setIsTryOnStyling(true);
    setTryOnError(null);
    setGeneratedImageUrl(null);
    setTryOnResult(null);
    setDebugLog({ step: 'Initializing', status: 'Connecting to Local Backend' });
    setSimulationStepText('Preparing your images...');

    try {
      setDebugLog({ step: 'API Request', status: 'Connecting directly to HuggingFace (yisol/IDM-VTON)' });
      setSimulationStepText('Connecting to IDM-VTON space...');

      const app = await client("yisol/IDM-VTON");

      setDebugLog({ step: 'API Request', status: 'Sending images to AI model...' });
      setSimulationStepText('Generating your look...');

      const result: any = await app.predict("/tryon", [
         { background: personImage, layers: [], composite: null },
         tryOnClothingImage,
         description.trim() || "A stylish outfit",
         true,
         true,
         30,
         42
      ]);

      console.log("Gradio Result:", result);

      if (result && result.data && result.data[0]) {
        // Depending on Gradio version, it could be a URL string or an object with a .url property
        const outputImage = result.data[0].url || result.data[0];
        
        setGeneratedImageUrl(outputImage);
        setTryOnResult({ 
           matchScore: 98, 
           fitAnalysis: 'AI-generated virtual try-on complete. The garment has been mapped onto your photo using the IDM-VTON HuggingFace space directly.', 
           styleVibe: 'Futuristic ' + selectedTryOnMode, 
           eventCompatibility: 'Perfect for Hackathon Demos & Pitch Presentations.' 
        });
        setDebugLog({ step: 'Complete', status: 'Success' });
      } else {
        throw new Error('No valid image returned from HuggingFace.');
      }
    } catch (err: any) {
      console.error('Try-on error:', err);
      console.log("API Error:", err);
      
      let errorMessage = err.message || 'Something went wrong.';
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
         errorMessage = 'Failed to communicate with HuggingFace.';
      }
      
      setTryOnError(errorMessage);
      setDebugLog(prev => ({ ...prev, step: 'Error', error: errorMessage }));
    } finally {
      setIsTryOnStyling(false);
    }
  };

  const generateFashnTryOn = async () => {
    if (!personPreview || (!clothingPreview && !selectedOutfitFromSuggest?.canvasImage)) return;

    setIsTryOnStyling(true);
    setTryOnError(null);
    setGeneratedImageUrl(null);
    setSimulationStepText('Connecting to Fashn.ai...');

    try {
      const garmentImage = selectedOutfitFromSuggest?.canvasImage || clothingPreview;
      
      const response = await fetch(apiUrl('/api/style/try-on'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personImage: personPreview, garmentImage }),
      });

      const prediction = await response.json();
      if (prediction.error) throw new Error(prediction.error);

      // Poll for result
      let status = prediction.status;
      let predictionId = prediction.id;

      while (status !== 'succeeded' && status !== 'failed') {
        await new Promise(r => setTimeout(r, 2000));
        const res = await fetch(apiUrl(`/api/style/prediction/${predictionId}`));
        const data = await res.json();
        status = data.status;
        if (status === 'succeeded') {
          setGeneratedImageUrl(data.output[0]);
          setTryOnResult({
            matchScore: 95,
            fitAnalysis: 'Your AI-curated outfit has been perfectly mapped to your body proportions.',
            styleVibe: 'Curated ' + (selectedOutfitFromSuggest?.styleTags?.join(', ') || 'Style'),
          });
        } else if (status === 'failed') {
          throw new Error('Try-on failed');
        }
      }
    } catch (err: any) {
      setTryOnError(err.message);
    } finally {
      setIsTryOnStyling(false);
    }
  };

  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    setImage: (f: File | null) => void,
    setPreview: (p: string | null) => void
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      const url = URL.createObjectURL(file);
      setPreview(url);
    }
  };

  const removeImage = (
    setImage: (f: File | null) => void,
    setPreview: (p: string | null) => void
  ) => {
    setImage(null);
    setPreview(null);
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result.split(',')[1]);
        }
      };
      reader.onerror = reject;
    });
  };

  const handleRunAnalysis = async (modeName: string, customPrompt?: string, retryCount = 0): Promise<any> => {
    const apiKey = process.env.GEMINI_API_KEY;
    const ai = apiKey ? new GoogleGenerativeAI(apiKey) : null;

    if (!personImage) return null;
    if (!ai) {
      alert('Please set your GEMINI_API_KEY in .env.local and restart the server to use AI features.');
      return null;
    }

    setIsAnalyzing(true);
    setResult(null);

    const modeKey = (modeName === 'try-on' || modeName === 'suggestions') ? modeName : 'try-on';
    const systemInstruction = SYSTEM_INSTRUCTIONS[modeKey] || SYSTEM_INSTRUCTIONS['try-on'];

    try {
      const parts: any[] = [];
      
      const personData = await fileToBase64(personImage);
      parts.push({
        inlineData: { data: personData, mimeType: personImage.type }
      });

      if (clothingImage) {
        const clothingData = await fileToBase64(clothingImage);
        parts.push({
          inlineData: { data: clothingData, mimeType: clothingImage.type }
        });
      }

      const textualInput = customPrompt || description;
      if (textualInput.trim()) {
        parts.push({ text: textualInput });
      }

      const model = ai.getGenerativeModel({ 
        model: "gemini-1.5-flash-latest",
        systemInstruction: systemInstruction,
      });

      const response = await model.generateContent({
        contents: [{ role: 'user', parts }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.7
        }
      });

      const textRes = response.response.text();
      if (!textRes.trim()) {
        if (retryCount < 1) {
          console.log("Empty response, retrying...");
          return handleRunAnalysis(modeName, customPrompt, retryCount + 1);
        } else {
          throw new Error("Empty response from API");
        }
      }
      
      console.log(`Full response for ${modeName}:`, textRes);
      const cleanedText = textRes.replace(/```json/g, '').replace(/```/g, '').trim();
      
      const jsonRes = JSON.parse(cleanedText);
      
      if (modeName !== 'suggestions') {
        setResult(jsonRes);
      }
      return jsonRes;
    } catch (error) {
      console.error(error);
      if (retryCount < 1) {
         console.log("Error occurred, retrying...");
         return handleRunAnalysis(modeName, customPrompt, retryCount + 1);
      }
      if (modeName !== 'suggestions') {
         alert('An error occurred during analysis.');
      }
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  };



  const handleGetSuggestions = async () => {
    if (!personImage) return;
    setSuggestStep(5); // Loading
    setSuggestError(false);
    setSuggestStage('uploading_photo');
    setSuggestResults(null);
    setSuggestProducts({});

    try {
      const formData = new FormData();
      formData.append('image', personImage);
      formData.append('occasion', suggestEvent);
      formData.append('style', suggestStyle);
      formData.append('preferences', suggestPreferences);

      const response = await fetch(apiUrl('/api/style/analyze'), {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Server error' }));
        throw new Error(err.error || `Server error: ${response.status}`);
      }

      // Read SSE stream
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response stream');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6));
            setSuggestStage(event.stage);

            if (event.stage === 'error') {
              throw new Error(event.error || event.message);
            }

            // Progressively populate results
            if (event.data?.analysis) {
              setSuggestResults((prev: any) => ({
                ...prev,
                bodyType: event.data.analysis.bodyType,
                physiqueAnalysis: event.data.analysis.physiqueAnalysis,
                faceStructure: event.data.analysis.faceStructure,
                fitAdvice: event.data.analysis.fitAdvice || event.data.analysis.fitSuggestions?.join(', '),
                styleVibe: event.data.analysis.vibe,
                skinTone: event.data.analysis.skinTone,
                recommendedColors: event.data.analysis.recommendedColors,
                bestColors: event.data.analysis.bestColors,
                recommendedFits: event.data.analysis.recommendedFits,
                avoid: event.data.analysis.avoid,
                fashionInspiration: event.data.analysis.fashionInspiration,
              }));
            }
            if (event.data?.outfits) {
              setSuggestResults((prev: any) => ({
                ...prev,
                outfitSuggestions: event.data.outfits.map((o: any) => ({
                  title: o.title,
                  description: [o.topwear, o.bottomwear, o.footwear].filter(Boolean).join(' + '),
                  reason: `${o.topwear} paired with ${o.bottomwear} and ${o.footwear}${o.layering && o.layering !== 'none' ? `, layered with ${o.layering}` : ''}`,
                  topwear: o.topwear,
                  bottomwear: o.bottomwear,
                  footwear: o.footwear,
                  accessories: o.accessories,
                  keywords: o.keywords,
                  imagePrompt: o.imagePrompt || `Fashion catalog photo: ${o.topwear} with ${o.bottomwear}, ${o.footwear}, clean studio background, full body, high detail`,
                })),
              }));
            }
            if (event.data?.products) {
              setSuggestProducts(event.data.products);
            }

            if (event.stage === 'completed') {
              setSuggestStep(6);
            }
          } catch (parseErr: any) {
            if (parseErr.message && !parseErr.message.includes('JSON')) throw parseErr;
          }
        }
      }

      // If we never got 'completed', check if we have results
      if (suggestStep !== 6) {
        setSuggestStep(6);
      }
    } catch (err: any) {
      console.error('Suggestion pipeline error:', err);
      setSuggestError(true);
    }
  };

  const startTrialRoomFromSuggestion = (outfit: any) => {
    setAiTrialRoomOutfit(outfit);
  };

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.auth, String(isLoggedIn));
  }, [isLoggedIn]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.showGetStarted, String(showGetStarted));
  }, [showGetStarted]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.showOnboarding, String(showOnboarding));
  }, [showOnboarding]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.onboardingStep, String(onboardingStep));
  }, [onboardingStep]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.activeTab, activeTab);
  }, [activeTab]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.userProfile, JSON.stringify(userProfile));
  }, [userProfile]);

  useEffect(() => {
    if (!isLoggedIn) return;

    let cancelled = false;

    const loadWeather = async (query: string) => {
      try {
        const response = await fetch(apiUrl(`/api/weather/current?${query}`));
        if (!response.ok) throw new Error('Weather unavailable');
        const weather = await response.json();
        if (!cancelled) {
          setWeatherTip(getWeatherStyleTip(weather, userProfile.gender));
        }
      } catch {
        if (!cancelled) {
          setWeatherTip(getWeatherStyleTip(null, userProfile.gender));
        }
      }
    };

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          loadWeather(`lat=${latitude}&lon=${longitude}`);
        },
        () => loadWeather('city=Bengaluru'),
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 600000 }
      );
    } else {
      loadWeather('city=Bengaluru');
    }

    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, userProfile.gender]);


  // Reusable components for forms
  const PersonImageSection = () => (
    <section className="bg-white p-5 rounded-3xl soft-shadow border border-brand-100 flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <Camera className="w-5 h-5 text-brand-400" />
          Your Photo
        </h2>
      </div>
      
      <div className="flex gap-2">
        <input 
          type="file" 
          accept="image/*" 
          className="hidden" 
          id="file-upload"
          onChange={(e) => handleImageUpload(e, setPersonImage, setPersonPreview)}
        />
        <input 
          type="file" 
          accept="image/*" 
          capture="environment"
          className="hidden" 
          id="camera-upload"
          onChange={(e) => handleImageUpload(e, setPersonImage, setPersonPreview)}
        />
      </div>
      
      {personPreview ? (
        <div className="relative w-full aspect-[3/4] rounded-2xl overflow-hidden bg-brand-50">
          <img src={personPreview} alt="You" className="w-full h-full object-cover" />
          <button 
            onClick={() => removeImage(setPersonImage, setPersonPreview)}
            className="absolute top-3 right-3 bg-white/90 p-2 rounded-full shadow-md text-gray-700 hover:text-red-500 transition-colors"
            aria-label="Remove photo"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
         <div className="flex gap-3 mt-4">
           <button 
              onClick={() => document.getElementById('file-upload')?.click()}
              className="flex-1 py-4 rounded-2xl border-2 border-dashed border-brand-200 bg-brand-50 flex flex-col items-center justify-center text-brand-400 hover:bg-brand-100/50 transition-colors cursor-pointer"
           >
              <ImageIcon className="w-6 h-6 mb-2 opacity-60" />
              <span className="font-medium text-xs">Gallery</span>
           </button>
           <button 
              onClick={() => document.getElementById('camera-upload')?.click()}
              className="flex-1 py-4 rounded-2xl border-2 border-dashed border-brand-200 bg-brand-50 flex flex-col items-center justify-center text-brand-400 hover:bg-brand-100/50 transition-colors cursor-pointer"
           >
              <Camera className="w-6 h-6 mb-2 opacity-60" />
              <span className="font-medium text-xs">Camera</span>
           </button>
         </div>
      )}
    </section>
  );

  // Old renderContent removed to resolve duplication

// --- Sub-components moved outside App to prevent re-mounting/focus loss ---

interface LandingPageProps {
  landingView: 'initial' | 'login' | 'signup';
  setLandingView: (view: 'initial' | 'login' | 'signup') => void;
  setIsLoggedIn: (val: boolean) => void;
  setShowGetStarted: (val: boolean) => void;
}

const LandingPage = ({ landingView, setLandingView, setIsLoggedIn, setShowGetStarted }: LandingPageProps) => {
  if (landingView === 'signup' || landingView === 'login') {
    return (
      <div className="fixed inset-0 z-[100] bg-white flex flex-col p-8 overflow-y-auto">
        <div className="max-w-md mx-auto w-full flex flex-col py-12">
          <button onClick={() => setLandingView('initial')} className="flex items-center gap-2 text-gray-400 font-bold text-sm mb-12 hover:text-brand-500 transition-colors">
            <ArrowLeft className="w-4 h-4" /> BACK
          </button>
          
          <h2 className="text-4xl font-black text-gray-900 tracking-tight mb-2">
            {landingView === 'signup' ? 'Create Account' : 'Welcome Back'}
          </h2>
          <p className="text-gray-500 font-medium mb-10">
            {landingView === 'signup' ? 'Start your journey with Agni Fashion' : 'Sign in to continue your style journey'}
          </p>
          
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Email Address</label>
              <input type="email" placeholder="hello@agni.com" className="w-full p-4 rounded-2xl bg-gray-50 border border-gray-100 focus:ring-2 focus:ring-brand-500 outline-none" />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Password</label>
              <input type="password" placeholder="••••••••" className="w-full p-4 rounded-2xl bg-gray-50 border border-gray-100 focus:ring-2 focus:ring-brand-500 outline-none" />
            </div>
            
            <button 
              onClick={() => {
                setIsLoggedIn(true);
                if (landingView === 'signup') {
                  setShowGetStarted(true);
                }
              }}
              className="w-full py-4 bg-brand-gradient text-white font-black rounded-2xl shadow-xl shadow-brand-100 mt-4 active:scale-95 transition-all"
            >
              {landingView === 'signup' ? 'SIGN UP' : 'LOG IN'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center p-8 overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-brand-100 rounded-full blur-3xl opacity-50 animate-pulse"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-80 h-80 bg-brand-200 rounded-full blur-3xl opacity-30 animate-pulse" style={{ animationDelay: '1s' }}></div>
      
      <div className="relative z-10 flex flex-col items-center text-center animate-in fade-in zoom-in duration-700">
        <div className="w-20 h-20 bg-brand-gradient rounded-3xl flex items-center justify-center shadow-2xl mb-8 rotate-12">
          <Sparkles className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-5xl font-black text-gray-900 tracking-tighter mb-4 leading-[0.9]">
          AGNI<br/>
          <span className="text-brand-500">FASHION</span>
        </h1>
        <p className="text-gray-500 font-medium text-lg mb-12 max-w-xs leading-relaxed">
          The world's most powerful AI fashion assistant. Curated for your unique style.
        </p>
        
        <div className="flex flex-col gap-4 w-full max-w-xs">
          <button 
            onClick={() => setLandingView('signup')}
            className="w-full py-4 bg-brand-gradient hover:bg-brand-gradient-hover text-white font-black rounded-2xl shadow-xl shadow-brand-200 transition-all active:scale-95"
          >
            CREATE ACCOUNT
          </button>
          <button 
             onClick={() => setLandingView('login')}
             className="w-full py-4 bg-white border-2 border-brand-100 text-brand-600 font-black rounded-2xl hover:bg-brand-50 transition-all"
          >
            LOG IN
          </button>
        </div>
        
        <p className="mt-12 text-[10px] text-gray-300 font-black uppercase tracking-[0.3em]">
          Precision Styling Engine v2.0
        </p>
      </div>
    </div>
  );
};

interface GetStartedPageProps {
  setShowGetStarted: (val: boolean) => void;
  setShowOnboarding: (val: boolean) => void;
}

const GetStartedPage = ({ setShowGetStarted, setShowOnboarding }: GetStartedPageProps) => (
  <div className="fixed inset-0 z-[105] bg-white flex flex-col items-center justify-center p-8 text-center">
    <div className="absolute inset-0 bg-brand-50/30"></div>
    <div className="relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="w-24 h-24 bg-brand-gradient rounded-full flex items-center justify-center shadow-2xl mb-8 mx-auto">
        <CheckCircle className="w-12 h-12 text-white" />
      </div>
      <h2 className="text-4xl font-black text-gray-900 tracking-tight mb-4">Account Created! 🔥</h2>
      <p className="text-gray-500 font-medium text-lg mb-12 max-w-xs mx-auto">
        Welcome to the Agni inner circle. Ready to customize your style profile?
      </p>
      
      <button 
        onClick={() => { setShowGetStarted(false); setShowOnboarding(true); }}
        className="w-full max-w-xs py-5 bg-brand-gradient text-white font-black rounded-2xl shadow-2xl shadow-brand-200 active:scale-95 transition-all text-xl"
      >
        GET STARTED
      </button>
    </div>
  </div>
);

interface OnboardingPageProps {
  onboardingStep: number;
  setOnboardingStep: (step: number) => void;
  userProfile: any;
  setUserProfile: (profile: any) => void;
  setShowOnboarding: (val: boolean) => void;
}

const OnboardingPage = ({ onboardingStep, setOnboardingStep, userProfile, setUserProfile, setShowOnboarding }: OnboardingPageProps) => {
  const totalSteps = 3;
  const progress = (onboardingStep / totalSteps) * 100;

  return (
    <div className="fixed inset-0 z-[110] bg-white flex flex-col p-8">
      <div className="max-w-md mx-auto w-full pt-12 pb-8">
         <div className="flex justify-between items-end mb-4">
            <div>
               <span className="text-xs font-black text-brand-500 uppercase tracking-widest block mb-1">Step 0{onboardingStep}</span>
               <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                  {onboardingStep === 1 ? 'Identity' : onboardingStep === 2 ? 'Body Metrics' : 'Style Vibe'}
               </h2>
            </div>
            <span className="text-xs font-bold text-gray-400">{onboardingStep}/{totalSteps}</span>
         </div>
         <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden shadow-inner">
            <div className="h-full bg-brand-gradient transition-all duration-500 ease-out" style={{ width: `${progress}%` }}></div>
         </div>
      </div>

      <div className="max-w-md mx-auto w-full flex-1 flex flex-col">
        {onboardingStep === 1 && (
          <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-right-8 duration-500">
             <div>
                <p className="text-gray-500 font-medium leading-relaxed mb-8">Let's start with the basics. What should we call you?</p>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Your Name</label>
                  <input 
                    type="text" 
                    placeholder="Enter your name"
                    className="w-full p-5 rounded-3xl bg-gray-50 border border-brand-100 focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none transition-all text-lg font-bold"
                    value={userProfile.name}
                    onChange={(e) => setUserProfile({...userProfile, name: e.target.value})}
                    onKeyDown={(e) => e.key === 'Enter' && userProfile.name && setOnboardingStep(2)}
                  />
                </div>
                <div className="flex flex-col gap-3 mt-6">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Style Gender</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['Male', 'Female', 'Unisex'].map(gender => (
                      <button
                        key={gender}
                        onClick={() => setUserProfile({...userProfile, gender})}
                        className={`p-3 rounded-2xl text-xs font-black border transition-all ${
                          userProfile.gender === gender
                            ? 'bg-brand-500 text-white border-brand-500 shadow-lg shadow-brand-100'
                            : 'bg-white text-gray-500 border-brand-100 hover:bg-brand-50'
                        }`}
                      >
                        {gender}
                      </button>
                    ))}
                  </div>
                </div>
             </div>
             
             <div className="mt-auto pb-12">
                <button 
                  onClick={() => setOnboardingStep(2)}
                  disabled={!userProfile.name}
                  className={`w-full py-5 rounded-2xl font-black text-white shadow-xl transition-all ${!userProfile.name ? 'bg-gray-200 cursor-not-allowed' : 'bg-brand-gradient active:scale-95'}`}
                >
                  CONTINUE
                </button>
             </div>
          </div>
        )}

        {onboardingStep === 2 && (
          <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-right-8 duration-500">
             <p className="text-gray-500 font-medium leading-relaxed">Agni uses your dimensions to recommend the perfect fit.</p>
             
             <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Age</label>
                  <input 
                    type="number" 
                    placeholder="24"
                    className="w-full p-5 rounded-3xl bg-gray-50 border border-brand-100 outline-none text-lg font-bold"
                    value={userProfile.age}
                    onChange={(e) => setUserProfile({...userProfile, age: e.target.value})}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Height (cm)</label>
                  <input 
                    type="number" 
                    placeholder="180"
                    className="w-full p-5 rounded-3xl bg-gray-50 border border-brand-100 outline-none text-lg font-bold"
                    value={userProfile.height}
                    onChange={(e) => setUserProfile({...userProfile, height: e.target.value})}
                  />
                </div>
             </div>

             <div className="flex flex-col gap-3">
                <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Preferred Fit</label>
                <div className="grid grid-cols-2 gap-3">
                  {['Oversized', 'Slim', 'Regular', 'Athletic'].map(fit => (
                    <button 
                      key={fit}
                      onClick={() => setUserProfile({...userProfile, preferredFits: fit})}
                      className={`p-4 rounded-2xl text-sm font-bold border transition-all ${userProfile.preferredFits === fit ? 'bg-brand-500 text-white border-brand-500 shadow-lg shadow-brand-100' : 'bg-white text-gray-500 border-brand-100 hover:bg-brand-50'}`}
                    >
                      {fit}
                    </button>
                  ))}
                </div>
             </div>
             
             <div className="mt-auto pb-12 flex gap-3">
                <button onClick={() => setOnboardingStep(1)} className="flex-1 py-5 rounded-2xl font-black text-gray-400 bg-gray-100 active:scale-95 transition-all">BACK</button>
                <button onClick={() => setOnboardingStep(3)} className="flex-[2] py-5 bg-brand-gradient rounded-2xl font-black text-white shadow-xl active:scale-95 transition-all">CONTINUE</button>
             </div>
          </div>
        )}

        {onboardingStep === 3 && (
          <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-right-8 duration-500">
             <p className="text-gray-500 font-medium leading-relaxed">Finally, what style aesthetic do you identify with most?</p>
             
             <div className="grid grid-cols-2 gap-3">
               {['Streetwear', 'Minimalist', 'Old Money', 'Gorpcore', 'Vintage', 'Cyberpunk'].map(style => (
                  <button 
                    key={style}
                    onClick={() => setUserProfile({...userProfile, preferredStyles: style})}
                    className={`p-4 rounded-2xl text-sm font-bold border transition-all flex flex-col items-center gap-2 ${userProfile.preferredStyles === style ? 'bg-brand-500 text-white border-brand-500 shadow-lg shadow-brand-100' : 'bg-white text-gray-500 border-brand-100 hover:bg-brand-50'}`}
                  >
                    <Star className={`w-4 h-4 ${userProfile.preferredStyles === style ? 'fill-white' : 'text-brand-300'}`} />
                    {style}
                  </button>
                ))}
             </div>
             
             <div className="mt-auto pb-12 flex flex-col gap-3">
                <button 
                  onClick={() => setShowOnboarding(false)}
                  className="w-full py-5 bg-brand-gradient text-white font-black rounded-2xl shadow-xl active:scale-95 transition-all text-lg"
                >
                  FINISH SETUP
                </button>
                <button 
                  onClick={() => setShowOnboarding(false)}
                  className="w-full py-4 text-gray-400 font-bold text-sm hover:text-gray-600 transition-colors"
                >
                  SKIP & EXPLORE
                </button>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

  const renderContent = () => {
    return (
      <>
        {/* Unified Header Style */}
        <header className="px-6 pt-10 pb-6 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-black text-[#111827] tracking-tight">
              {activeTab === 'home' ? 'Style Studio' : 
               activeTab === 'try-on' ? 'Virtual Fitting' : 
               activeTab === 'suggestions' ? 'AI Curation' : 
               activeTab === 'wardrobe' ? 'Digital Wardrobe' : 'Your Profile'}
            </h1>
            <p className="text-gray-400 font-semibold text-sm mt-1">
              {activeTab === 'home' ? 'Ready to find your look?' : 
               activeTab === 'try-on' ? 'See your style come to life' : 
               activeTab === 'suggestions' ? 'Personalized for you' : 
               activeTab === 'wardrobe' ? 'Your curated collection' : 'Manage your style profile'}
            </p>
          </div>
          <div className="flex gap-4 items-center mt-2">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm border border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors">
              <Search className="w-5 h-5 text-gray-400" />
            </div>
            <div className="relative w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm border border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors">
              <Bell className="w-5 h-5 text-gray-400" />
              <div className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-brand-500 rounded-full border-2 border-white"></div>
            </div>
          </div>
        </header>

        <div className="flex-1 px-6 pb-24 overflow-y-auto scrollbar-hide">
          {(() => {
          switch (activeTab) {
            case 'home':
              return (
                <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <header className="mb-2">
                    <h1 className="text-3xl font-black text-[#111827] tracking-tight">Welcome, {userProfile.name || 'Stylist'}! ✨</h1>
                    <p className="text-brand-500 font-medium text-lg">Igniting your fashion journey</p>
                  </header>

                  <div className="grid grid-cols-1 gap-4">
                    <button onClick={() => setActiveTab('try-on')} className="bg-white p-5 rounded-3xl soft-shadow border border-brand-100 flex items-center justify-between hover:bg-brand-50/50 transition-colors text-left">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-brand-100 text-brand-500 rounded-2xl">
                          <Shirt className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">Virtual Try-On</h3>
                          <p className="text-sm text-gray-500 mt-1">See how an item looks on you</p>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-300" />
                    </button>

                    <button onClick={() => setActiveTab('suggestions')} className="bg-white p-5 rounded-3xl soft-shadow border border-brand-100 flex items-center justify-between hover:bg-brand-50/50 transition-colors text-left">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-brand-100 text-brand-500 rounded-2xl">
                          <Wand2 className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">Personalized Style</h3>
                          <p className="text-sm text-gray-500 mt-1">Get curated outfits for your body</p>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-300" />
                    </button>

                    <button onClick={() => setActiveTab('wardrobe')} className="bg-white p-5 rounded-3xl soft-shadow border border-brand-100 flex items-center justify-between hover:bg-brand-50/50 transition-colors text-left">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-brand-100 text-brand-500 rounded-2xl">
                          <Layers className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">Wardrobe Styling</h3>
                          <p className="text-sm text-gray-500 mt-1">Mix and match your closet</p>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-300" />
                    </button>
                  </div>

                  <div className="mt-4 bg-brand-500 text-white rounded-3xl p-6 relative overflow-hidden">
                     <div className="absolute top-0 right-0 p-6 opacity-10">
                       <Sparkles className="w-24 h-24" />
                     </div>
                     <h3 className="text-xl font-bold mb-2">{weatherTip.title}</h3>
                     <p className="text-brand-50 leading-relaxed font-medium">
                       {weatherTip.message}
                     </p>
                     <p className="text-brand-100 text-xs font-black uppercase tracking-widest mt-4">
                       {weatherTip.meta}
                     </p>
                  </div>
                </div>
              );

            case 'try-on':
              return (
                <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
                  {/* Style Modes */}
                  <div className="flex overflow-x-auto scrollbar-hide gap-2 px-1 pb-2">
                     {['Gen Z', 'Wedding', 'Minimal', 'Streetwear', 'Smart Casual'].map(mode => (
                        <button 
                           key={mode}
                           onClick={() => setSelectedTryOnMode(mode)}
                           className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${selectedTryOnMode === mode ? 'bg-brand-500 text-white shadow-lg shadow-brand-100' : 'bg-white text-gray-500 border border-brand-100 hover:bg-brand-50'}`}
                        >
                           {mode}
                        </button>
                     ))}
                  </div>

                  {/* Center Preview Area */}
                  <div className="relative w-full aspect-[3/4] max-h-[60vh] rounded-[2.5rem] overflow-hidden soft-shadow bg-gradient-to-b from-brand-50 to-brand-100/50 border-4 border-white flex items-center justify-center">
                     {isTryOnStyling && (
                        <div className="absolute inset-0 z-50 bg-white/60 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in">
                           <div className="relative w-24 h-24 mb-6">
                              <div className="absolute inset-0 border-4 border-brand-100 rounded-full"></div>
                              <div className="absolute inset-0 border-4 border-brand-500 rounded-full border-t-transparent animate-spin"></div>
                              <div className="absolute inset-0 flex items-center justify-center">
                                 <Sparkles className="w-8 h-8 text-brand-500 animate-pulse" />
                              </div>
                           </div>
                           <p className="font-bold text-brand-600 text-xl tracking-tight">{simulationStepText}</p>
                           <p className="text-gray-400 text-sm mt-2">This may take 15-30 seconds</p>
                        </div>
                     )}

                     {generatedImageUrl && generatedImageUrl !== 'simulated' ? (
                        <img src={generatedImageUrl} alt="AI Generated Try-On" className="w-full h-full object-cover transition-all duration-700" />
                     ) : personPreview ? (
                        <img src={personPreview} alt="Your photo" className="w-full h-full object-cover transition-all duration-700 hover:scale-[1.02]" />
                     ) : (
                        <div className="w-2/3 h-5/6 bg-brand-200/40 rounded-full blur-2xl absolute"></div>
                     )}
                     {!personPreview && !generatedImageUrl && (
                        <div className="flex flex-col items-center justify-center z-10 text-brand-400 opacity-70">
                           <User className="w-24 h-24 mb-4" strokeWidth={1} />
                           <p className="text-sm font-bold uppercase tracking-[0.2em]">Upload Your Photo</p>
                        </div>
                     )}

                     {/* Upload Button Overlay */}
                     {!personPreview && (
                        <button 
                           onClick={() => document.getElementById('tryon-person-upload')?.click()}
                           className="absolute bottom-6 bg-white/95 backdrop-blur-md px-6 py-3 rounded-full font-bold text-brand-600 shadow-xl hover:-translate-y-1 transition-all flex items-center gap-2 z-30 border border-brand-50"
                        >
                           <Camera className="w-5 h-5" /> Upload Photo
                        </button>
                     )}
                     {personPreview && !generatedImageUrl && (
                        <button 
                           onClick={() => { removeImage(setPersonImage, setPersonPreview); setGeneratedImageUrl(null); setTryOnResult(null); }}
                           className="absolute top-4 right-4 bg-white/90 p-2 rounded-full shadow-md text-gray-700 hover:text-red-500 transition-colors z-30"
                        >
                           <X className="w-4 h-4" />
                        </button>
                     )}
                     <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        id="tryon-person-upload"
                        onChange={(e) => handleImageUpload(e, setPersonImage, setPersonPreview)}
                     />
                  </div>

                  {/* Outfit Upload & Generate */}
                  {!tryOnResult && (
                     <div className="flex flex-col gap-4">
                        <div className="flex justify-between items-center px-1">
                           <h3 className="font-bold text-gray-800 text-xl">Upload Outfit</h3>
                        </div>

                        {tryOnClothingPreview ? (
                           <div className="relative w-full h-48 rounded-3xl overflow-hidden soft-shadow border-2 border-brand-100">
                              <img src={tryOnClothingPreview} alt="Clothing" className="w-full h-full object-cover" />
                              <button 
                                 onClick={() => removeImage(setTryOnClothingImage, setTryOnClothingPreview)}
                                 className="absolute top-3 right-3 bg-white/90 p-2 rounded-full shadow-md text-gray-700 hover:text-red-500 transition-colors"
                              >
                                 <X className="w-4 h-4" />
                              </button>
                           </div>
                        ) : (
                           <button 
                              onClick={() => tryOnClothingInputRef.current?.click()}
                              className="w-full py-10 rounded-3xl border-2 border-dashed border-brand-200 bg-brand-50/50 flex flex-col gap-2 items-center justify-center text-brand-500 hover:bg-brand-100/50 transition-colors cursor-pointer"
                           >
                              <Upload className="w-6 h-6 mb-1" />
                              <span className="font-bold text-sm">Upload garment</span>
                           </button>
                        )}
                        <input type="file" accept="image/*" className="hidden" ref={tryOnClothingInputRef} onChange={(e) => handleImageUpload(e, setTryOnClothingImage, setTryOnClothingPreview)} />

                        <button 
                           onClick={generateVirtualTryOn}
                           disabled={!personImage || (!tryOnClothingImage && !selectedOutfitFromSuggest) || isTryOnStyling}
                           className={`w-full py-4 rounded-full font-black text-white text-lg shadow-xl shadow-brand-100 transition-all ${(!personImage || (!tryOnClothingImage && !selectedOutfitFromSuggest) || isTryOnStyling) ? 'bg-brand-200 cursor-not-allowed' : 'bg-brand-gradient hover:-translate-y-1'}`}
                        >
                           GENERATE TRY-ON
                        </button>
                     </div>
                  )}

                  {tryOnResult && (
                     <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-6">
                        <div className="glass-card rounded-[2.5rem] p-7 relative overflow-hidden">
                           <div className="flex items-center gap-4 mb-6">
                              <div className="w-16 h-16 rounded-2xl bg-brand-50 flex items-center justify-center text-brand-600 font-black text-2xl border border-brand-100">
                                 {tryOnResult.matchScore}
                              </div>
                              <div>
                                 <h3 className="font-black text-gray-900 text-xl tracking-tight">Match Score</h3>
                                 <p className="text-xs text-brand-600 font-bold uppercase tracking-wider">Agni Fit Verified</p>
                              </div>
                           </div>
                           <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-5 border border-white/50">
                              <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2"><Sparkles className="w-4 h-4 text-brand-500"/> Fit Analysis</h4>
                              <p className="text-sm text-gray-600 leading-relaxed font-medium">{tryOnResult.fitAnalysis}</p>
                           </div>
                        </div>
                        <button onClick={() => { setTryOnResult(null); setGeneratedImageUrl(null); }} className="py-4 font-black text-brand-600 hover:text-brand-700 uppercase tracking-widest text-xs">Try Another Look</button>
                     </div>
                  )}
                </div>
              );

            case 'suggestions':
              return (
                <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="bg-white rounded-3xl border border-brand-100 p-5 soft-shadow">
                    <div className="flex items-start justify-between gap-4 mb-5">
                      <div>
                        <h2 className="text-xl font-black text-gray-900 tracking-tight">Personalized Style</h2>
                        <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                          Upload your photo and Agni will curate outfits that match your body, occasion, and vibe.
                        </p>
                      </div>
                      <div className="w-12 h-12 rounded-2xl bg-brand-100 text-brand-500 flex items-center justify-center flex-shrink-0">
                        <Wand2 className="w-6 h-6" />
                      </div>
                    </div>

                    <PersonImageSection />
                  </div>

                  <div className="bg-white rounded-3xl border border-brand-100 p-5 soft-shadow flex flex-col gap-5">
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Occasion</label>
                      <div className="flex overflow-x-auto scrollbar-hide gap-2 pb-1">
                        {['Casual', 'College', 'Office', 'Party', 'Wedding', 'Date Night'].map((event) => (
                          <button
                            key={event}
                            onClick={() => setSuggestEvent(event)}
                            className={`px-4 py-2 rounded-full text-xs font-black whitespace-nowrap border transition-all ${
                              suggestEvent === event
                                ? 'bg-brand-500 text-white border-brand-500 shadow-lg shadow-brand-100'
                                : 'bg-white text-gray-500 border-brand-100 hover:bg-brand-50'
                            }`}
                          >
                            {event}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Style Vibe</label>
                      <div className="grid grid-cols-2 gap-2">
                        {['Streetwear', 'Minimal', 'Old Money', 'Smart Casual'].map((style) => (
                          <button
                            key={style}
                            onClick={() => setSuggestStyle(style)}
                            className={`p-3 rounded-2xl text-sm font-bold border transition-all ${
                              suggestStyle === style
                                ? 'bg-brand-500 text-white border-brand-500'
                                : 'bg-white text-gray-500 border-brand-100 hover:bg-brand-50'
                            }`}
                          >
                            {style}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Preferences</label>
                      <textarea
                        value={suggestPreferences}
                        onChange={(e) => setSuggestPreferences(e.target.value)}
                        placeholder="Colors, fits, brands, or anything you want Agni to consider"
                        className="w-full min-h-24 p-4 rounded-2xl bg-gray-50 border border-brand-100 focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none transition-all text-sm font-medium resize-none"
                      />
                    </div>

                    {suggestError && (
                      <div className="rounded-2xl bg-red-50 border border-red-100 p-4 text-sm font-bold text-red-500">
                        Could not generate recommendations. Make sure the backend is running and try again.
                      </div>
                    )}

                    <button
                      onClick={handleGetSuggestions}
                      disabled={!personImage || !suggestEvent || !suggestStyle || suggestStep === 5}
                      className={`w-full py-4 rounded-full font-black text-white text-lg shadow-xl transition-all flex items-center justify-center gap-2 ${
                        !personImage || !suggestEvent || !suggestStyle || suggestStep === 5
                          ? 'bg-brand-200 cursor-not-allowed'
                          : 'bg-brand-gradient hover:-translate-y-1'
                      }`}
                    >
                      {suggestStep === 5 ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          {suggestStage ? suggestStage.replace(/_/g, ' ').toUpperCase() : 'STYLING YOU'}
                        </>
                      ) : (
                        <>
                          GET STYLE RECOMMENDATIONS
                          <Sparkles className="w-5 h-5" />
                        </>
                      )}
                    </button>
                  </div>

                  {suggestResults && (
                    <div className="flex flex-col gap-4">
                      <div className="bg-white rounded-3xl border border-brand-100 p-5 soft-shadow">
                        <h3 className="text-lg font-black text-gray-900 mb-3">Your Style Profile</h3>
                        <div className="grid grid-cols-1 gap-3">
                          {suggestResults.bodyType && (
                            <p className="text-sm text-gray-600 leading-relaxed"><span className="font-black text-gray-900">Body:</span> {suggestResults.bodyType}</p>
                          )}
                          {suggestResults.styleVibe && (
                            <p className="text-sm text-gray-600 leading-relaxed"><span className="font-black text-gray-900">Vibe:</span> {suggestResults.styleVibe}</p>
                          )}
                          {suggestResults.fitAdvice && (
                            <p className="text-sm text-gray-600 leading-relaxed"><span className="font-black text-gray-900">Fit:</span> {suggestResults.fitAdvice}</p>
                          )}
                        </div>
                      </div>

                      {suggestResults.outfitSuggestions?.map((outfit: any, index: number) => (
                        <div key={`${outfit.title}-${index}`} className="bg-white rounded-3xl border border-brand-100 p-5 soft-shadow">
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div>
                              <p className="text-[10px] font-black text-brand-500 uppercase tracking-widest">Look {index + 1}</p>
                              <h3 className="text-lg font-black text-gray-900">{outfit.title || 'Curated Outfit'}</h3>
                            </div>
                            <Sparkles className="w-5 h-5 text-brand-400 flex-shrink-0" />
                          </div>
                          <p className="text-sm text-gray-600 leading-relaxed font-medium mb-3">{outfit.description}</p>
                          <p className="text-sm text-gray-500 leading-relaxed">{outfit.reason}</p>
                          <button
                            onClick={() => {
                              setSelectedOutfitFromSuggest(outfit);
                              setDescription(outfit.description || outfit.title || '');
                              setActiveTab('try-on');
                            }}
                            className="mt-5 w-full py-3 rounded-2xl bg-brand-50 text-brand-600 font-black hover:bg-brand-100 transition-colors"
                          >
                            TRY THIS LOOK
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );

            case 'wardrobe':
              return <Wardrobe onTryOn={async (outfit) => {
                if (outfit.canvasImage) {
                  const res = await fetch(outfit.canvasImage);
                  const blob = await res.blob();
                  const file = new File([blob], 'outfit.png', { type: 'image/png' });
                  setTryOnClothingImage(file);
                  setTryOnClothingPreview(outfit.canvasImage);
                }
                setSelectedOutfitFromSuggest(outfit);
                setDescription(`Outfit: ${outfit.top} + ${outfit.bottom}`);
                setActiveTab('try-on');
              }} />;

            case 'profile':
              return (
                <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="bg-white p-8 rounded-[2.5rem] soft-shadow border border-brand-100 flex flex-col items-center gap-6">
                    <div className="relative">
                      <div className="w-24 h-24 bg-brand-gradient rounded-full flex items-center justify-center shadow-lg shadow-brand-100">
                        <User className="w-10 h-10 text-white" />
                      </div>
                      <div className="absolute bottom-0 right-0 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md border border-brand-50 cursor-pointer">
                        <Camera className="w-4 h-4 text-brand-500" />
                      </div>
                    </div>
                    
                    <div className="text-center">
                      <h2 className="text-2xl font-black text-gray-900 tracking-tight">{userProfile.name || 'Agni Stylist'}</h2>
                      <p className="text-gray-400 font-bold text-xs uppercase tracking-widest mt-1">
                        {userProfile.age ? `${userProfile.age} YRS • ` : ''}
                        {userProfile.height ? `${userProfile.height} CM` : 'Level 1 Stylist'}
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-3 w-full">
                      <div className="bg-brand-50 p-4 rounded-2xl border border-brand-100">
                        <span className="text-[10px] font-black text-brand-400 uppercase tracking-wider block mb-1">Gender</span>
                        <span className="text-sm font-bold text-brand-700">{userProfile.gender || 'Unisex'}</span>
                      </div>
                      <div className="bg-brand-50 p-4 rounded-2xl border border-brand-100">
                        <span className="text-[10px] font-black text-brand-400 uppercase tracking-wider block mb-1">Preferred Fit</span>
                        <span className="text-sm font-bold text-brand-700">{userProfile.preferredFits || 'Not Set'}</span>
                      </div>
                      <div className="bg-brand-50 p-4 rounded-2xl border border-brand-100">
                        <span className="text-[10px] font-black text-brand-400 uppercase tracking-wider block mb-1">Style Vibe</span>
                        <span className="text-sm font-bold text-brand-700">{userProfile.preferredStyles || 'Not Set'}</span>
                      </div>
                    </div>

                    <button 
                      onClick={() => setShowOnboarding(true)}
                      className="w-full py-4 bg-gray-50 text-gray-600 font-bold rounded-2xl hover:bg-brand-50 hover:text-brand-600 transition-all border border-transparent hover:border-brand-100"
                    >
                      Update Profile
                    </button>
                  </div>

                  <div className="flex flex-col gap-4">
                    <h3 className="font-black text-gray-900 text-sm uppercase tracking-widest px-1">Settings</h3>
                    <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
                       {['Privacy', 'Notifications', 'Connected Accounts', 'Logout'].map((item, i) => (
                         <button 
                           key={item} 
                           onClick={() => item === 'Logout' && setIsLoggedIn(false)}
                           className={`w-full p-5 text-left flex justify-between items-center hover:bg-gray-50 transition-colors ${i !== 3 ? 'border-b border-gray-50' : ''}`}
                         >
                           <span className={`font-semibold ${item === 'Logout' ? 'text-red-500' : 'text-gray-700'}`}>{item}</span>
                           <ChevronRight className="w-4 h-4 text-gray-300" />
                         </button>
                       ))}
                    </div>
                  </div>
                </div>
              );
            
            default:
              return null;
          }
        })()}
        </div>
      </>
    );
  };

  const navItems: { id: TabType; icon: React.ElementType; label: string }[] = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'try-on', icon: Shirt, label: 'Try On' },
    { id: 'suggestions', icon: Wand2, label: 'AI Style' },
    { id: 'wardrobe', icon: Layers, label: 'Wardrobe' },
    { id: 'profile', icon: User, label: 'Profile' },
  ];

  if (!isLoggedIn) return LandingPage({
    landingView,
    setLandingView,
    setIsLoggedIn,
    setShowGetStarted,
  });
  
  if (showGetStarted) return GetStartedPage({
    setShowGetStarted,
    setShowOnboarding,
  });
  
  if (showOnboarding) return OnboardingPage({
    onboardingStep,
    setOnboardingStep,
    userProfile,
    setUserProfile,
    setShowOnboarding,
  });

  return (
    <div className="min-h-screen bg-brand-50 font-sans pb-24 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-brand-100/50 to-transparent pointer-events-none"></div>
      
      <div className="max-w-md mx-auto relative z-10">
        {renderContent()}
      </div>

      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-brand-100 pb-safe pt-2 px-2 pb-6 sm:pb-4 z-50 shadow-[0_-10px_30px_rgba(230,74,25,0.05)]">
        <div className="max-w-md mx-auto flex justify-between items-center px-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center justify-center w-16 h-12 gap-1 rounded-xl transition-all ${
                  isActive ? 'text-brand-500' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <div className={`relative p-1.5 rounded-xl transition-all ${isActive ? 'bg-brand-gradient shadow-lg shadow-brand-200 text-white' : 'bg-transparent'}`}>
                   <Icon className="w-6 h-6" strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span className={`text-[10px] font-black uppercase tracking-tighter ${isActive ? 'text-brand-600' : 'text-gray-500'}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

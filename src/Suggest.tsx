import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Sparkles, Heart, ChevronRight, ChevronLeft, RefreshCw, Shirt, Camera } from 'lucide-react';
import { CLOTHING, type ClothingItem } from './WardrobeData';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
const apiUrl = (path: string) => `${API_BASE_URL}${path}`;

interface OutfitSuggestion {
  cap: string;
  top: string;
  bottom: string;
  footwear: string;
  styleTags: string[];
  canvasImage?: string;
}

const Suggest: React.FC<{ onBack: () => void, onTryOn: (outfit: any) => void }> = ({ onBack, onTryOn }) => {
  const [occasion, setOccasion] = useState('Casual');
  const [outfits, setOutfits] = useState<OutfitSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [favorites, setFavorites] = useState<number[]>([]);

  const occasions = ['Casual', 'Formal', 'Party', 'Outdoor', 'Work', 'Date Night'];

  const findItemByName = (name: string): ClothingItem | undefined => {
    for (const catItems of Object.values(CLOTHING)) {
      const item = catItems.find(i => i.name.toLowerCase() === name.toLowerCase());
      if (item) return item;
    }
    return undefined;
  };

  const generateOutfits = async () => {
    setIsLoading(true);
    setOutfits([]);
    setCurrentSlide(0);

    // Prepare wardrobe items for GROQ
    const wardrobeItems = Object.entries(CLOTHING).flatMap(([cat, items]) => 
      items.map(i => ({ name: i.name, category: cat, color: i.color }))
    );

    try {
      const response = await fetch(apiUrl('/api/style/suggest'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: wardrobeItems, occasion }),
      });

      if (!response.ok) throw new Error('Failed to generate suggestions');
      const data = await response.json();
      
      // Process suggestions and generate canvas images
      const processedOutfits = await Promise.all(data.map(async (outfit: any) => {
        const canvasImg = await createOutfitCanvas(outfit);
        return { ...outfit, canvasImage: canvasImg };
      }));

      setOutfits(processedOutfits);
    } catch (error) {
      console.error('Error generating outfits:', error);
      alert('Failed to generate outfits. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const createOutfitCanvas = async (outfit: any): Promise<string> => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    canvas.width = 400;
    canvas.height = 800;

    const itemNames = [outfit.cap, outfit.top, outfit.bottom, outfit.footwear];
    const itemHeight = canvas.height / 4;

    try {
      const images = await Promise.all(itemNames.map(name => {
        const item = findItemByName(name);
        if (!item) return null;
        return new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = item.img;
          img.onload = () => resolve(img);
          img.onerror = reject;
        });
      }));

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      images.forEach((img, idx) => {
        if (img) {
          const image = img as HTMLImageElement;
          const aspectRatio = image.width / image.height;
          let drawWidth = canvas.width;
          let drawHeight = canvas.width / aspectRatio;

          if (drawHeight > itemHeight) {
            drawHeight = itemHeight;
            drawWidth = itemHeight * aspectRatio;
          }

          const x = (canvas.width - drawWidth) / 2;
          const y = (idx * itemHeight) + (itemHeight - drawHeight) / 2;

          ctx.drawImage(image, x, y, drawWidth, drawHeight);
        }
      });

      return canvas.toDataURL('image/png');
    } catch (err) {
      console.error('Canvas error:', err);
      return '';
    }
  };

  const toggleFavorite = (idx: number) => {
    setFavorites(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]);
  };

  return (
    <div className="flex flex-col min-h-screen bg-white font-sans text-gray-900 pb-20">
      {/* Header */}
      <header className="px-6 pt-10 pb-6 flex items-center gap-4">
        <button onClick={onBack} className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-50 border border-gray-100">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-black tracking-tight">Style Generator</h1>
          <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">AI-curated outfits</p>
        </div>
      </header>

      {/* Occasion Selector */}
      <div className="px-6 mb-8">
        <div className="flex overflow-x-auto scrollbar-hide gap-3 pb-2">
          {occasions.map(occ => (
            <button
              key={occ}
              onClick={() => setOccasion(occ)}
              className={`px-6 py-2.5 rounded-full text-xs font-black transition-all whitespace-nowrap border-2 ${
                occasion === occ ? 'bg-black text-white border-black shadow-lg' : 'bg-white text-gray-400 border-gray-100 hover:border-gray-300'
              }`}
            >
              {occ}
            </button>
          ))}
        </div>
      </div>

      {/* Generate Button */}
      <div className="px-6 mb-10">
        <button
          onClick={generateOutfits}
          disabled={isLoading}
          className="w-full py-4 bg-black text-white rounded-2xl font-black text-lg flex items-center justify-center gap-2 shadow-xl hover:scale-[1.02] active:scale-95 transition-all disabled:bg-gray-400"
        >
          {isLoading ? (
            <RefreshCw className="w-5 h-5 animate-spin" />
          ) : (
            <>Generate Outfits <Sparkles className="w-5 h-5" /></>
          )}
        </button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex-1 flex flex-col items-center justify-center py-20 animate-pulse">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
            <RefreshCw className="w-8 h-8 text-black animate-spin" />
          </div>
          <p className="font-black text-gray-400 uppercase tracking-widest text-sm">GROQ is styling you...</p>
        </div>
      )}

      {/* Outfit Slides */}
      {outfits.length > 0 && !isLoading && (
        <div className="flex-1 flex flex-col gap-6">
          <div className="relative px-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Outfit {currentSlide + 1} of {outfits.length}</span>
              <div className="flex gap-2">
                <button 
                  disabled={currentSlide === 0}
                  onClick={() => setCurrentSlide(s => s - 1)}
                  className="w-8 h-8 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center disabled:opacity-30"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button 
                  disabled={currentSlide === outfits.length - 1}
                  onClick={() => setCurrentSlide(s => s + 1)}
                  className="w-8 h-8 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center disabled:opacity-30"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Slide Card */}
            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-[0_20px_50px_rgba(0,0,0,0.05)] overflow-hidden flex flex-col">
              <div className="relative aspect-[3/4] bg-gray-50 p-6">
                <button 
                  onClick={() => toggleFavorite(currentSlide)}
                  className="absolute top-6 right-6 z-20 w-10 h-10 rounded-full bg-white/90 backdrop-blur-md shadow-md flex items-center justify-center"
                >
                  <Heart className={`w-5 h-5 transition-colors ${favorites.includes(currentSlide) ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
                </button>
                
                {outfits[currentSlide].canvasImage ? (
                  <img src={outfits[currentSlide].canvasImage} alt="Outfit" className="w-full h-full object-contain" />
                ) : (
                  <div className="w-full h-full flex flex-col gap-4">
                    {[outfits[currentSlide].cap, outfits[currentSlide].top, outfits[currentSlide].bottom, outfits[currentSlide].footwear].map((name, i) => {
                      const item = findItemByName(name);
                      return (
                        <div key={i} className="flex items-center gap-4 bg-white/50 p-2 rounded-xl">
                          <div className="w-16 h-16 rounded-lg bg-white overflow-hidden shadow-sm">
                            {item && <img src={item.img} alt={name} className="w-full h-full object-cover" />}
                          </div>
                          <div>
                            <p className="text-sm font-black text-gray-900">{name}</p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase">{['Cap', 'Top', 'Bottom', 'Shoes'][i]}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              
              <div className="p-6">
                <div className="flex flex-wrap gap-2 mb-6">
                  {outfits[currentSlide].styleTags.map(tag => (
                    <span key={tag} className="px-3 py-1 bg-gray-100 rounded-full text-[10px] font-black uppercase text-gray-500 tracking-wider">
                      {tag}
                    </span>
                  ))}
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => onTryOn(outfits[currentSlide])}
                    className="py-4 bg-black text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-lg hover:scale-[1.02] active:scale-95 transition-all"
                  >
                    Try On <Camera className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={generateOutfits}
                    className="py-4 bg-gray-100 text-gray-900 rounded-2xl font-black text-sm flex items-center justify-center gap-2 hover:bg-gray-200 transition-all"
                  >
                    Fresh Outfits <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Suggest;

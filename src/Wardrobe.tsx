import React, { useState, useRef } from 'react';
import { Search, Bell, Shirt, MoreVertical, ChevronDown, ArrowUpDown, Sparkles, RefreshCw, ChevronLeft, ChevronRight, Heart, Camera, X, Upload, Check, Plus, Layers, Footprints } from 'lucide-react';
import { CLOTHING, CATEGORIES, type ClothingItem, type CatKey } from './WardrobeData';

interface OutfitSuggestion {
  cap: string;
  top: string;
  bottom: string;
  footwear: string;
  styleTags: string[];
  canvasImage?: string;
}

type SelectedItemType = (ClothingItem | { name: string; img: string; isCustom: boolean }) & { category: CatKey; instanceId: string };

const Wardrobe: React.FC<{ onTryOn: (outfit: any) => void }> = ({ onTryOn }) => {
  const [occasion, setOccasion] = useState('Casual');
  const [outfits, setOutfits] = useState<OutfitSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCompositing, setIsCompositing] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [favorites, setFavorites] = useState<number[]>([]);
  
  const [selectedItems, setSelectedItems] = useState<SelectedItemType[]>([]);
  const [showCatalogue, setShowCatalogue] = useState(false);
  const [activeCategory, setActiveCategory] = useState<CatKey | null>(null);
  const [popupMode, setPopupMode] = useState<'select' | 'upload'>('select');

  const generatorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const occasions = ['Casual', 'Formal', 'Party', 'Outdoor', 'Work', 'Date Night'];

  const findItemByName = (name: string): ClothingItem | undefined => {
    for (const catItems of Object.values(CLOTHING)) {
      const item = catItems.find(i => i.name.toLowerCase() === name.toLowerCase());
      if (item) return item;
    }
    return undefined;
  };

  const createOutfitCanvas = async (outfit: any): Promise<string> => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    
    canvas.width = 400;
    canvas.height = 700;
    
    const itemsToDraw = [
      { key: 'cap', label: 'Cap', name: outfit.cap },
      { key: 'top', label: 'Topwear', name: outfit.top },
      { key: 'bottom', label: 'Bottomwear', name: outfit.bottom },
      { key: 'footwear', label: 'Footwear', name: outfit.footwear }
    ].filter(item => item.name && item.name !== 'null');

    const sectionHeight = canvas.height / itemsToDraw.length;

    try {
      const images = await Promise.all(itemsToDraw.map(async (row) => {
        const selected = selectedItems.find(si => si.name === row.name);
        let imgSrc = '';
        if (selected) {
          imgSrc = selected.img;
        } else {
          const item = findItemByName(row.name);
          if (item) imgSrc = item.img;
        }

        if (!imgSrc) return null;

        return new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = imgSrc;
          img.onload = () => resolve(img);
          img.onerror = reject;
        });
      }));

      // Background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      images.forEach((img, idx) => {
        if (img) {
          const image = img as HTMLImageElement;
          const yOffset = idx * sectionHeight;
          
          // Draw Image
          const aspectRatio = image.width / image.height;
          let drawWidth = canvas.width * 0.8;
          let drawHeight = drawWidth / aspectRatio;
          
          if (drawHeight > sectionHeight * 0.7) {
            drawHeight = sectionHeight * 0.7;
            drawWidth = drawHeight * aspectRatio;
          }

          const x = (canvas.width - drawWidth) / 2;
          const y = yOffset + (sectionHeight - drawHeight) / 2 - 10;
          
          ctx.drawImage(image, x, y, drawWidth, drawHeight);

          // Divider Line
          if (idx < images.length - 1) {
            ctx.beginPath();
            ctx.moveTo(40, yOffset + sectionHeight);
            ctx.lineTo(360, yOffset + sectionHeight);
            ctx.strokeStyle = '#f0f0f0';
            ctx.lineWidth = 1;
            ctx.stroke();
          }

          // Label
          ctx.fillStyle = '#9ca3af';
          ctx.font = 'bold 12px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(itemsToDraw[idx].label.toUpperCase(), canvas.width / 2, yOffset + sectionHeight - 20);
        }
      });

      return canvas.toDataURL('image/png');
    } catch (err) {
      console.error('Canvas compositing error:', err);
      return '';
    }
  };

  const generateOutfits = async (fixedItems?: SelectedItemType[]) => {
    setIsLoading(true);
    setOutfits([]);
    setCurrentSlide(0);
    
    if (generatorRef.current) {
      generatorRef.current.scrollIntoView({ behavior: 'smooth' });
    }

    // Removed artificial delay for high-speed generation

    const wardrobeItems = Object.entries(CLOTHING).flatMap(([cat, items]) => 
      items.map(i => ({ name: i.name, category: cat }))
    );

    const activeFixed = fixedItems || selectedItems;
    const fixedItemNames = activeFixed.map(i => i.name);
    const sessionId = Math.random().toString(36).substring(7);
    
    // Improved Prompt: Strictly demands 5 DISTINCT combinations
    const customPrompt = `You are a professional fashion stylist. Session ID: ${sessionId}.
Create 5 unique outfit combinations for ${occasion}. 

"Selection Pool" (Use these primarily): ${fixedItemNames.join(', ')}.
"Wardrobe Inventory": ${JSON.stringify(wardrobeItems)}.

STRICT RULES:
1. Each of the 5 outfits MUST be visually distinct from the others.
2. For each outfit, pick one Top, one Bottom, and one Footwear. Cap is optional.
3. If the "Selection Pool" has multiple items for a category, distribute them across the 5 outfits.
4. If the "Selection Pool" only has one item for a category (e.g., one shirt), vary the OTHER categories (different pants, different shoes, or adding/removing a cap) to ensure all 5 outfits are DIFFERENT.
5. Do NOT return the same combination twice.

Return ONLY a JSON array of 5 distinct objects. No explanation. 
Format: [{ "outfit": 1, "top": "name", "bottom": "name", "footwear": "name", "cap": "name or null", "style_tags": [] }]`;

    try {
      const response = await fetch('/api/style/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: wardrobeItems, occasion, prompt: customPrompt }),
      });
      
      const data = await response.json();
      console.log('Gemini Raw Suggestions:', data);
      
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error('AI returned an empty or invalid result');
      }

      setIsLoading(false);
      setIsCompositing(true);
      
      const processedOutfits = [];
      for (const outfit of data) {
        console.log('Processing outfit:', outfit);
        try {
          const canvasImg = await createOutfitCanvas(outfit);
          processedOutfits.push({ 
            ...outfit, 
            styleTags: outfit.style_tags || [], 
            canvasImage: canvasImg,
            cap: outfit.cap,
            top: outfit.top || outfit.topwear,
            bottom: outfit.bottom || outfit.bottomwear,
            footwear: outfit.footwear
          });
        } catch (canvasErr) {
          console.error('Failed to composite outfit slide:', canvasErr);
          // Still push without image so at least text shows, or skip
        }
      }
      
      console.log('Final Processed Outfits:', processedOutfits);
      if (processedOutfits.length === 0) throw new Error('Failed to composite any outfit slides');
      
      setOutfits(processedOutfits);
    } catch (error: any) {
      console.error('Generation Flow Error:', error);
      alert(`Styling Error: ${error.message || 'Please try selecting different items.'}`);
    } finally {
      setIsLoading(false);
      setIsCompositing(false);
    }
  };

  const handleCategoryClick = (key: CatKey) => {
    setActiveCategory(key);
    setPopupMode('select');
    setShowCatalogue(true);
  };

  const handleSelectItem = (item: ClothingItem) => {
    if (!activeCategory) return;
    const instanceId = Math.random().toString(36).substring(7);
    const newSelected: SelectedItemType[] = [...selectedItems, { ...item, category: activeCategory, instanceId }];
    setSelectedItems(newSelected);
    setShowCatalogue(false);
    // Removed automatic generation
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && activeCategory) {
      const reader = new FileReader();
      reader.onload = () => {
        const instanceId = Math.random().toString(36).substring(7);
        const customItem: SelectedItemType = { 
          name: `Uploaded ${activeCategory}`, 
          img: reader.result as string, 
          isCustom: true, 
          category: activeCategory, 
          instanceId 
        };
        const newSelected = [...selectedItems, customItem];
        setSelectedItems(newSelected);
        setShowCatalogue(false);
        // Removed automatic generation
      };
      reader.readAsDataURL(file);
    }
  };

  const removeItem = (instanceId: string) => {
    setSelectedItems(prev => prev.filter(i => i.instanceId !== instanceId));
  };

  const toggleFavorite = (idx: number) => {
    setFavorites(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]);
  };

  return (
    <div className="flex flex-col w-full bg-[#F2F4F7] font-sans text-gray-900 pb-32">
      {/* Internal header removed to avoid duplication */}

      {/* Overview Card */}
      {/* Ultra-Compact Overview Card */}
      <div className="px-6 mb-6">
        <div className="bg-white rounded-[1.5rem] p-4 shadow-sm border border-gray-100">
          <h2 className="text-xs font-black text-gray-900 mb-3 tracking-tight">Overview</h2>
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'Total Items', val: Object.values(CLOTHING).flat().length, icon: Shirt, color: '#2563eb', bg: '#eff6ff' },
              { label: 'Tops', val: CLOTHING.topwear?.length || 0, icon: Shirt, color: '#10b981', bg: '#ecfdf5' },
              { label: 'Bottoms', val: CLOTHING.bottomwear?.length || 0, icon: Layers, color: '#f59e0b', bg: '#fffbeb' },
              { label: 'Footwear', val: CLOTHING.footwear?.length || 0, icon: Footprints, color: '#8b5cf6', bg: '#f5f3ff' },
            ].map((stat, i) => (
              <div key={i} style={{ backgroundColor: stat.bg }} className="rounded-xl py-2 px-1 flex flex-col items-center justify-center gap-1 border border-white shadow-sm transition-all hover:scale-[1.02]">
                <div className="flex items-center gap-1.5">
                  <stat.icon style={{ color: stat.color }} className="w-4 h-4" strokeWidth={3} />
                  <span style={{ color: stat.color }} className="text-sm font-black tracking-tight">{stat.val}</span>
                </div>
                <span className="text-[7px] text-gray-400 font-black uppercase tracking-tighter text-center leading-none px-1">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Categories Section */}
      <section className="mb-10">
        <div className="px-6 mb-6 flex justify-between items-end">
          <h2 className="text-xl font-black text-gray-900 tracking-tight">Categories</h2>
          <button className="text-blue-500 text-sm font-black hover:underline transition-all">View all</button>
        </div>
        <div className="flex overflow-x-auto scrollbar-hide gap-8 px-6 pb-2">
          {CATEGORIES.map((cat) => {
             const selectedCount = selectedItems.filter(si => si.category === cat.key).length;
             return (
            <div 
              key={cat.key} 
              onClick={() => handleCategoryClick(cat.key)}
              className="flex flex-col items-center gap-3 flex-shrink-0 group cursor-pointer relative"
            >
              <div className={`w-22 h-22 rounded-full overflow-hidden p-1.5 border-2 transition-all ${selectedCount > 0 ? 'border-blue-500 bg-blue-50' : 'border-transparent bg-gray-100 group-hover:border-blue-100'}`}>
                <img src={cat.img} alt={cat.label} className="w-full h-full object-cover rounded-full shadow-inner" />
                {selectedCount > 0 && (
                  <div className="absolute top-0 right-0 bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center border-2 border-white shadow-md text-[10px] font-black">
                    {selectedCount}
                  </div>
                )}
              </div>
              <div className="text-center">
                <p className={`text-sm font-black transition-colors ${selectedCount > 0 ? 'text-blue-600' : 'text-gray-800 group-hover:text-blue-600'}`}>{cat.label}</p>
                <p className="text-[11px] text-gray-400 font-bold">{CLOTHING[cat.key]?.length || 0} items</p>
              </div>
            </div>
          )})}
        </div>
      </section>

      {/* Catalogue Popup */}
      {showCatalogue && activeCategory && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-t-[3rem] p-8 pb-12 shadow-2xl animate-in slide-in-from-bottom-full duration-500">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-2xl font-black text-gray-900 tracking-tight">{CATEGORIES.find(c => c.key === activeCategory)?.label}</h3>
                <p className="text-gray-400 font-semibold text-xs uppercase tracking-widest mt-1">{popupMode === 'select' ? 'Pick items to style' : 'Upload your own image'}</p>
              </div>
              <button onClick={() => setShowCatalogue(false)} className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center hover:bg-gray-100 transition-colors"><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="flex bg-gray-100 p-1.5 rounded-2xl mb-8">
              <button onClick={() => setPopupMode('select')} className={`flex-1 py-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${popupMode === 'select' ? 'bg-white text-black shadow-sm' : 'text-gray-400'}`}><Shirt className="w-4 h-4" /> Catalogue</button>
              <button onClick={() => setPopupMode('upload')} className={`flex-1 py-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${popupMode === 'upload' ? 'bg-white text-black shadow-sm' : 'text-gray-400'}`}><Upload className="w-4 h-4" /> Upload</button>
            </div>
            {popupMode === 'select' ? (
              <div className="grid grid-cols-2 gap-4 max-h-[50vh] overflow-y-auto pr-2 scrollbar-hide">
                {CLOTHING[activeCategory]?.map((item) => {
                  const isSelected = selectedItems.some(si => si.name === item.name);
                  return (
                    <div key={item.id} onClick={() => handleSelectItem(item)} className={`rounded-[2rem] p-3 border transition-all cursor-pointer group ${isSelected ? 'bg-blue-50 border-blue-500' : 'bg-gray-50 border-transparent hover:border-blue-200'}`}>
                      <div className="aspect-square rounded-2xl overflow-hidden mb-3 relative">
                        <img src={item.img} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                        {isSelected && <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center"><Check className="w-8 h-8 text-white drop-shadow-md" /></div>}
                      </div>
                      <p className={`text-xs font-black text-center uppercase tracking-wider ${isSelected ? 'text-blue-600' : 'text-gray-900'}`}>{item.name}</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 border-4 border-dashed border-gray-100 rounded-[2rem] bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-md mb-6"><Upload className="w-10 h-10 text-blue-500" /></div>
                <p className="font-black text-gray-900">Tap to upload image</p>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Style Generator Section */}
      <section ref={generatorRef} className="px-6 mb-8">
        <div className="bg-white rounded-[2.5rem] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <Sparkles className="w-32 h-32 text-black" />
          </div>
          
          <div className="mb-8">
            <h2 className="text-2xl font-black text-[#111827] tracking-tight">Style Generator</h2>
            <p className="text-gray-400 font-semibold text-xs uppercase tracking-widest mt-1">AI Curated Looks</p>
          </div>

          {/* Active Selections Row (Small) */}
          {selectedItems.length > 0 && (
            <div className="mb-8 overflow-hidden">
               <div className="flex items-center justify-between mb-4">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Active Selections ({selectedItems.length})</h4>
                  <button onClick={() => setSelectedItems([])} className="text-[10px] font-black text-red-400 uppercase tracking-widest">Clear All</button>
               </div>
               <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide -mx-1 px-1">
                  {selectedItems.map((item) => (
                      <div key={item.instanceId} className="w-24 h-32 rounded-2xl bg-white border border-blue-100 shadow-sm flex flex-col overflow-hidden flex-shrink-0 relative group animate-in zoom-in duration-300">
                        <div className="w-full h-20 overflow-hidden bg-gray-50"><img src={item.img} alt={item.name} className="w-full h-full object-cover" /></div>
                        <div className="p-2 flex-1 flex flex-col justify-center">
                           <p className="text-[8px] font-black text-gray-900 truncate leading-tight uppercase tracking-tighter">{item.name}</p>
                           <p className="text-[7px] text-blue-500 font-bold uppercase tracking-tighter mt-0.5">{CATEGORIES.find(c => c.key === item.category)?.label}</p>
                        </div>
                        <button onClick={() => removeItem(item.instanceId)} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm"><X className="w-3 h-3" /></button>
                      </div>
                  ))}
                  <div onClick={() => setShowCatalogue(true)} className="w-24 h-32 rounded-2xl border-2 border-dashed border-gray-100 flex flex-col items-center justify-center gap-2 flex-shrink-0 bg-gray-50/50 hover:bg-gray-50 transition-colors cursor-pointer"><Plus className="w-4 h-4 text-gray-300" /><span className="text-[8px] font-black text-gray-400 uppercase tracking-tighter">Add More</span></div>
               </div>
            </div>
          )}

          <div className="flex overflow-x-auto scrollbar-hide gap-3 mb-8 pb-2">
            {occasions.map(occ => (
              <button key={occ} onClick={() => setOccasion(occ)} className={`px-6 py-2.5 rounded-full text-xs font-black transition-all whitespace-nowrap border-2 ${occasion === occ ? 'bg-black text-white border-black shadow-lg' : 'bg-white text-gray-400 border-gray-100 hover:border-gray-300'}`}>{occ}</button>
            ))}
          </div>

          <button onClick={() => generateOutfits()} disabled={isLoading || isCompositing} className="w-full py-4 bg-black text-white rounded-2xl font-black text-lg flex items-center justify-center gap-2 shadow-xl hover:scale-[1.02] active:scale-95 transition-all disabled:bg-gray-400">
            {(isLoading || isCompositing) ? <RefreshCw className="w-5 h-5 animate-spin" /> : <><Sparkles className="w-5 h-5" /> Generate Outfits</>}
          </button>
        </div>
      </section>

      {/* Generated Outfit Slides Section */}
      {(isLoading || isCompositing || outfits.length > 0) && (
        <section className="px-6 pb-20 animate-in slide-in-from-bottom-10 duration-700">
          {(isLoading || isCompositing) ? (
            <div className="bg-white rounded-[2.5rem] p-12 shadow-xl border border-white flex flex-col items-center justify-center">
              <div className="relative w-24 h-24 mb-8">
                 <div className="absolute inset-0 border-4 border-gray-100 rounded-full"></div>
                 <div className="absolute inset-0 border-4 border-t-black rounded-full animate-spin"></div>
                 <div className="absolute inset-0 flex items-center justify-center">
                    <Sparkles className="w-8 h-8 text-black animate-pulse" />
                 </div>
              </div>
              
              <h3 className="font-black text-gray-900 uppercase tracking-widest text-lg mb-2">Styling In-Progress</h3>
              <p className="text-gray-400 text-xs font-bold mb-8">Gemini is curating 5 unique looks...</p>
              
              {/* Animated Progress Bar */}
              <div className="w-full max-w-[200px] h-1.5 bg-gray-100 rounded-full overflow-hidden">
                 <div className="h-full bg-black animate-progress-fast"></div>
              </div>
            </div>
          ) : outfits.length > 0 && (
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between px-2">
                <div className="flex flex-col">
                  <h3 className="text-xl font-black text-gray-900 tracking-tight">Curated Looks</h3>
                  <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em]">{occasion} Collection</span>
                </div>
                <div className="flex gap-2">
                  <button disabled={currentSlide === 0} onClick={() => setCurrentSlide(s => s - 1)} className="w-10 h-10 rounded-full bg-white shadow-md border border-gray-100 flex items-center justify-center disabled:opacity-30 transition-all hover:scale-110"><ChevronLeft className="w-5 h-5" /></button>
                  <button disabled={currentSlide === outfits.length - 1} onClick={() => setCurrentSlide(s => s + 1)} className="w-10 h-10 rounded-full bg-white shadow-md border border-gray-100 flex items-center justify-center disabled:opacity-30 transition-all hover:scale-110"><ChevronRight className="w-5 h-5" /></button>
                </div>
              </div>

              <div className="bg-white rounded-[3rem] p-0 relative overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.1)] border border-white group">
                <div className="absolute top-6 left-6 z-20 px-4 py-2 bg-black/60 backdrop-blur-md rounded-full border border-white/20">
                   <span className="text-[10px] font-black text-white uppercase tracking-widest">Outfit {currentSlide + 1} of {outfits.length}</span>
                </div>
                
                <button onClick={() => toggleFavorite(currentSlide)} className="absolute top-6 right-6 z-20 w-12 h-12 rounded-full bg-white/90 backdrop-blur-md shadow-lg flex items-center justify-center transition-all hover:scale-110 active:scale-90"><Heart className={`w-6 h-6 transition-colors ${favorites.includes(currentSlide) ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} /></button>
                
                {outfits[currentSlide].canvasImage && (
                  <div className="w-full bg-white p-4">
                    <img src={outfits[currentSlide].canvasImage} alt="Outfit Composite" className="w-full h-auto object-contain rounded-[2.5rem] shadow-sm" />
                  </div>
                )}

                <div className="p-8 bg-gray-50/50 border-t border-gray-100">
                  <div className="flex flex-wrap gap-2 mb-8">
                    {outfits[currentSlide].styleTags.map(tag => (
                      <span key={tag} className="px-4 py-2 bg-white rounded-full text-[10px] font-black uppercase text-gray-500 tracking-wider shadow-sm border border-gray-100">#{tag}</span>
                    ))}
                  </div>

                  <div className="flex flex-col gap-4">
                    <button onClick={() => onTryOn(outfits[currentSlide])} className="w-full py-4 bg-white border-2 border-black text-black rounded-2xl font-black text-lg flex items-center justify-center gap-2 hover:bg-gray-100 active:scale-95 transition-all shadow-sm">Try On 👤</button>
                    <button onClick={() => generateOutfits()} className="w-full py-4 bg-black text-white rounded-2xl font-black text-lg flex items-center justify-center gap-2 shadow-xl hover:scale-[1.02] active:scale-95 transition-all">Generate More 🔄</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
};

export default Wardrobe;

export interface ClothingItem { id: string; name: string; img: string; color?: string; }

export const CLOTHING: Record<string, ClothingItem[]> = {
  topwear: [
    { id: 't1', name: 'White Oversized Tee', img: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=500&fit=crop', color: '#ffffff' },
    { id: 't2', name: 'Black Minimalist Tee', img: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=400&h=500&fit=crop', color: '#1a1a1a' },
    { id: 't3', name: 'Sand Beige T-Shirt', img: 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=400&h=500&fit=crop', color: '#d4b896' },
    { id: 't4', name: 'Classic Navy Polo', img: 'https://images.unsplash.com/photo-1618354691229-88d47f285158?w=400&h=500&fit=crop', color: '#001f3f' },
    { id: 't5', name: 'Olive Green Hoodie', img: 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=400&h=500&fit=crop', color: '#4a7c59' },
    { id: 't6', name: 'Heather Gray Sweatshirt', img: 'https://images.unsplash.com/photo-1578587018452-892bacefd3f2?w=400&h=500&fit=crop', color: '#888888' },
    { id: 't7', name: 'Vintage Denim Jacket', img: 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=400&h=500&fit=crop', color: '#5b7daa' },
    { id: 't8', name: 'Red Plaid Flannel', img: 'https://images.unsplash.com/photo-1589310243389-96a5483213a8?w=400&h=500&fit=crop', color: '#8b4444' },
    { id: 't9', name: 'Sky Blue Oxford Shirt', img: 'https://images.unsplash.com/photo-1598032895397-b9472444bf93?w=400&h=500&fit=crop', color: '#4a90d9' },
    { id: 't10', name: 'Striped Breton Tee', img: 'https://images.unsplash.com/photo-1627225924765-552d49cf2b5d?w=400&h=500&fit=crop', color: '#dddddd' },
    { id: 't11', name: 'Charcoal Knit Sweater', img: 'https://images.unsplash.com/photo-1620799139507-2a76f79a2f4d?w=400&h=500&fit=crop', color: '#333333' },
    { id: 't12', name: 'Mustard Yellow Tee', img: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=400&h=500&fit=crop', color: '#ffdb58' },
    { id: 't13', name: 'Graphic Streetwear Tee', img: 'https://images.unsplash.com/photo-1554568218-0f1715e72254?w=400&h=500&fit=crop', color: '#111111' },
    { id: 't14', name: 'Beige Trench Coat', img: 'https://images.unsplash.com/photo-1591047139829-d91aec96bcbd?w=400&h=500&fit=crop', color: '#f5f5dc' },
    { id: 't15', name: 'Black Bomber Jacket', img: 'https://images.unsplash.com/photo-1591047139451-90c000302302?w=400&h=500&fit=crop', color: '#000000' },
  ],
  bottomwear: [
    { id: 'b1', name: 'Black Cargo Pants', img: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=400&h=500&fit=crop', color: '#222222' },
    { id: 'b2', name: 'Deep Blue Jeans', img: 'https://images.unsplash.com/photo-1542272454315-4c01d7abdf4a?w=400&h=500&fit=crop', color: '#4a6fa5' },
    { id: 'b3', name: 'Sand Khaki Chinos', img: 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=400&h=500&fit=crop', color: '#c4a97d' },
    { id: 'b4', name: 'Slate Gray Joggers', img: 'https://images.unsplash.com/photo-1552664110-ad30f2e4c595?w=400&h=500&fit=crop', color: '#888888' },
    { id: 'b5', name: 'Olive Army Trousers', img: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=400&h=500&fit=crop', color: '#4a5d23' },
    { id: 'b6', name: 'Tan Linen Shorts', img: 'https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=400&h=500&fit=crop', color: '#d2b48c' },
    { id: 'b7', name: 'Off-White Straight Pants', img: 'https://images.unsplash.com/photo-1519456243297-67803d6f427f?w=400&h=500&fit=crop', color: '#fdfdfd' },
    { id: 'b8', name: 'Chocolate Brown Slacks', img: 'https://images.unsplash.com/photo-1475178626620-a4d074967452?w=400&h=500&fit=crop', color: '#5d4037' },
    { id: 'b9', name: 'Light Wash Denim', img: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=400&h=500&fit=crop', color: '#a0c4ff' },
    { id: 'b10', name: 'Black Slim Fit Jeans', img: 'https://images.unsplash.com/photo-1604176354204-926873ff349c?w=400&h=500&fit=crop', color: '#000000' },
    { id: 'b11', name: 'Beige Corduroy Pants', img: 'https://images.unsplash.com/photo-1598554747436-c9293d6a588f?w=400&h=500&fit=crop', color: '#e1c699' },
    { id: 'b12', name: 'Navy Tailored Trousers', img: 'https://images.unsplash.com/photo-1605518216938-7c31b7b14ad0?w=400&h=500&fit=crop', color: '#000080' },
  ],
  footwear: [
    { id: 'f1', name: 'Classic White Sneakers', img: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400&h=500&fit=crop', color: '#f5f5f5' },
    { id: 'f2', name: 'Chelsea Black Boots', img: 'https://images.unsplash.com/photo-1608256246200-53e635b5b65f?w=400&h=500&fit=crop', color: '#1a1a1a' },
    { id: 'f3', name: 'Black Canvas High-Tops', img: 'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=400&h=500&fit=crop', color: '#333333' },
    { id: 'f4', name: 'Tan Suede Loafers', img: 'https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?w=400&h=500&fit=crop', color: '#5d4037' },
    { id: 'f5', name: 'Red Performance Runners', img: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=500&fit=crop', color: '#ff0000' },
    { id: 'f6', name: 'Gray Slip-on Sneakers', img: 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=400&h=500&fit=crop', color: '#555555' },
    { id: 'f7', name: 'Desert Suede Boots', img: 'https://images.unsplash.com/photo-1520639889313-7272170b1c31?w=400&h=500&fit=crop', color: '#8d6e63' },
    { id: 'f8', name: 'Stealth Black Sneakers', img: 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=400&h=500&fit=crop', color: '#000000' },
    { id: 'f9', name: 'Retro High-Top Jordans', img: 'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?w=400&h=500&fit=crop', color: '#ffffff' },
    { id: 'f10', name: 'Cognac Leather Boots', img: 'https://images.unsplash.com/photo-1605733513597-a8f8d410fe3e?w=400&h=500&fit=crop', color: '#8b4513' },
    { id: 'f11', name: 'Minimalist Gray Trainers', img: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=400&h=500&fit=crop', color: '#cccccc' },
  ],
  cap: [
    { id: 'c1', name: 'Beige Cotton Cap', img: 'https://images.unsplash.com/photo-1588850561407-ed78c334e67a?w=400&h=500&fit=crop', color: '#d4b896' },
    { id: 'c2', name: 'Black Structured Cap', img: 'https://images.unsplash.com/photo-1572307480813-ceb0e59d8325?w=400&h=500&fit=crop', color: '#222222' },
    { id: 'c3', name: 'Crimson Red Beanie', img: 'https://images.unsplash.com/photo-1576871337632-b9aef4c17ab9?w=400&h=500&fit=crop', color: '#c62828' },
    { id: 'c4', name: 'Classic Trucker Hat', img: 'https://images.unsplash.com/photo-1556306535-0f09a537f0a3?w=400&h=500&fit=crop', color: '#444444' },
    { id: 'c5', name: 'Gray Wool Beanie', img: 'https://images.unsplash.com/photo-1521369909029-2afed882baee?w=400&h=500&fit=crop', color: '#333333' },
    { id: 'c6', name: 'Navy NY Cap', img: 'https://images.unsplash.com/photo-1556306535-38fe4adcd531?w=400&h=500&fit=crop', color: '#1565c0' },
    { id: 'c7', name: 'Canvas Bucket Hat', img: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400&h=500&fit=crop', color: '#eeeeee' },
    { id: 'c8', name: 'Tweed Flat Cap', img: 'https://images.unsplash.com/photo-1595642527925-4d41cb781653?w=400&h=500&fit=crop', color: '#444444' },
    { id: 'c9', name: 'White Sports Cap', img: 'https://images.unsplash.com/photo-1534215754734-18e55d13e346?w=400&h=500&fit=crop', color: '#ffffff' },
    { id: 'c10', name: 'Green Fedora Hat', img: 'https://images.unsplash.com/photo-1551330452-885718992ee7?w=400&h=500&fit=crop', color: '#2e8b57' },
  ],
  goggles: [
    { id: 'g1', name: 'Jet Black Sunglasses', img: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400&h=500&fit=crop', color: '#333333' },
    { id: 'g2', name: 'Classic Tortoise Shades', img: 'https://images.unsplash.com/photo-1511499767350-a1590fdb7ca7?w=400&h=500&fit=crop', color: '#5a3e28' },
    { id: 'g3', name: 'Gold Frame Aviators', img: 'https://images.unsplash.com/photo-1577803645773-f96470509666?w=400&h=500&fit=crop', color: '#dddddd' },
    { id: 'g4', name: 'Retro Wayfarers', img: 'https://images.unsplash.com/photo-1509695507497-903c140c43b0?w=400&h=500&fit=crop', color: '#000000' },
    { id: 'g5', name: 'Minimalist Round Glasses', img: 'https://images.unsplash.com/photo-1510273010677-183d46dca615?w=400&h=500&fit=crop', color: '#333333' },
    { id: 'g6', name: 'Matte Modern Frames', img: 'https://images.unsplash.com/photo-1473496169904-658ba7c44d8a?w=400&h=500&fit=crop', color: '#000000' },
    { id: 'g7', name: 'Vintage Cat-Eye Shades', img: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400&h=500&fit=crop', color: '#f5f5f5' },
    { id: 'g8', name: 'Performance Sports Shades', img: 'https://images.unsplash.com/photo-1508296670304-453a1fe0d283?w=400&h=500&fit=crop', color: '#222222' },
    { id: 'g9', name: 'Clubmaster Browlines', img: 'https://images.unsplash.com/photo-1591076482161-42ce6da69f67?w=400&h=500&fit=crop', color: '#000000' },
    { id: 'g10', name: 'Clear Blue Light Frames', img: 'https://images.unsplash.com/photo-1574258495973-f010dfbb5371?w=400&h=500&fit=crop', color: '#add8e6' },
  ],
};

export type CatKey = keyof typeof CLOTHING;

export const CATEGORIES = [
  { key: 'topwear' as CatKey, label: 'Tops', icon: '👕', img: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=200&h=200&fit=crop' },
  { key: 'bottomwear' as CatKey, label: 'Bottoms', icon: '👖', img: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=200&h=200&fit=crop' },
  { key: 'footwear' as CatKey, label: 'Footwear', icon: '👟', img: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200&h=200&fit=crop' },
  { key: 'cap' as CatKey, label: 'Caps', icon: '🧢', img: 'https://images.unsplash.com/photo-1572307480813-ceb0e59d8325?w=200&h=200&fit=crop' },
];

export interface BodyScales {
  torsoWidth: number;
  shoulderWidth: number;
  legLength: number;
  hipWidth: number;
  overall: number;
}

export function calcBodyScales(height: number, weight: number): BodyScales {
  const bmi = weight / Math.pow(height / 100, 2);
  const heightRatio = height / 175;
  let torsoWidth = 1, shoulderWidth = 1, hipWidth = 1;
  if (bmi < 18.5) { torsoWidth = 0.85; shoulderWidth = 0.88; hipWidth = 0.85; }
  else if (bmi < 25) { torsoWidth = 1; shoulderWidth = 1; hipWidth = 1; }
  else if (bmi < 30) { torsoWidth = 1.12; shoulderWidth = 1.1; hipWidth = 1.15; }
  else { torsoWidth = 1.25; shoulderWidth = 1.18; hipWidth = 1.28; }
  return { torsoWidth, shoulderWidth, legLength: 0.85 + heightRatio * 0.15, hipWidth, overall: 0.95 + heightRatio * 0.05 };
}

export const ZONE_CONFIG: Record<string, { label: string; top: string; left: string; width: string; height: string }> = {
  cap:        { label: 'Head',  top: '0%',  left: '25%', width: '50%', height: '12%' },
  goggles:    { label: 'Eyes',  top: '9%',  left: '28%', width: '44%', height: '6%'  },
  topwear:    { label: 'Torso', top: '16%', left: '12%', width: '76%', height: '30%' },
  bottomwear: { label: 'Legs',  top: '46%', left: '18%', width: '64%', height: '36%' },
  footwear:   { label: 'Feet',  top: '82%', left: '22%', width: '56%', height: '14%' },
};

export const OVERLAY_POS: Record<string, { top: string; left: string; width: string; height: string; clip?: string }> = {
  cap:        { top: '0%',    left: '32%', width: '36%', height: '10%' },
  goggles:    { top: '6%',   left: '35%', width: '30%', height: '5%'  },
  topwear:    { top: '15.5%', left: '16%', width: '68%', height: '30%', clip: 'polygon(18% 0%, 82% 0%, 90% 100%, 10% 100%)' },
  bottomwear: { top: '44%',  left: '24%', width: '52%', height: '36%', clip: 'polygon(0% 0%, 100% 0%, 90% 48%, 75% 100%, 60% 100%, 52% 48%, 48% 48%, 40% 100%, 25% 100%, 10% 48%)' },
  footwear:   { top: '82%',  left: '28%', width: '44%', height: '12%' },
};
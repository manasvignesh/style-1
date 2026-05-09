import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

export async function tryOnOutfit(personImage: string, garmentImage: string) {
  const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;
  
  if (!REPLICATE_API_TOKEN) {
    throw new Error('REPLICATE_API_TOKEN is not configured');
  }

  // Using Fashn.ai model on Replicate (or similar)
  // For this example, we'll use a standard try-on model available on Replicate
  const response = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      'Authorization': `Token ${REPLICATE_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      version: "c8718e0b0e3526df6a782846985a6a6f6f966144e7c7a5259e89c3b8f5a6b0b2", // Example: IDM-VTON or Fashn.ai if version known
      input: {
        person_image: personImage,
        garment_image: garmentImage,
        category: "upper_body", // This would need to be dynamic
      },
    }),
  });

  const prediction = await response.json();
  return prediction;
}

export async function getPrediction(id: string) {
  const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;
  const response = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
    headers: {
      'Authorization': `Token ${REPLICATE_API_TOKEN}`,
    },
  });
  return await response.json();
}

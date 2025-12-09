/**
 * Vision API Service using Groq
 * Handles image recognition using Llama 3.2 Vision model
 * Supports multilingual responses (English, Hindi, Kannada)
 */

import Groq from 'groq-sdk';
import { Language, getAILanguageInstruction } from '@/services/translations';

export interface VisionResponse {
  description: string;
  error?: string;
}

export interface CurrencyItem {
  denomination: number;
  currency: string;
  type: 'note' | 'coin';
}

export interface CurrencyResponse {
  detected: boolean;
  items?: CurrencyItem[];
  total?: number;
  currency?: string;
  denomination?: number; // For backward compatibility
  description: string;
  error?: string;
}

// Client cache
let groqClient: Groq | null = null;

/**
 * Get or create the Groq client
 */
function getClient(apiKey: string): Groq {
  if (!groqClient) {
    groqClient = new Groq({ apiKey });
  }
  return groqClient;
}

/**
 * Convert image URI to base64 data URL
 */
async function imageToBase64DataUrl(imageUri: string): Promise<string> {
  try {
    const response = await fetch(imageUri);
    const blob = await response.blob();
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        resolve(base64); // Return full data URL for Groq
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error converting image to base64:', error);
    throw error;
  }
}

/**
 * Describe an image for sight-impaired users
 */
export async function describeImage(
  imageUri: string,
  apiKey: string,
  additionalContext?: string,
  language: Language = 'en'
): Promise<VisionResponse> {
  try {
    const client = getClient(apiKey);
    const base64DataUrl = await imageToBase64DataUrl(imageUri);
    
    const langInstruction = getAILanguageInstruction(language);
    
    const prompt = additionalContext
      ? `${langInstruction} You already described this image. Answer ONLY the question directly and concisely. Question: "${additionalContext}"`
      : `${langInstruction} You are an assistant for a sight-impaired person. Describe this image, focusing on: 
        1. Main objects and positions
        2. People and actions
        3. Visible text
        4. Hazards or important details
        Keep it clear and under 80 words.`;

    const completion = await client.chat.completions.create({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt,
            },
            {
              type: 'image_url',
              image_url: {
                url: base64DataUrl,
              },
            },
          ],
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const description = completion.choices[0]?.message?.content || 
      'I could not generate a description for this image.';
    
    return { description };
  } catch (error) {
    console.error('Vision API error:', error);
    return {
      description: 'Sorry, there was an error analyzing the image.',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Detect currency in an image
 */
export async function detectCurrency(
  imageUri: string,
  apiKey: string
): Promise<CurrencyResponse> {
  try {
    const client = getClient(apiKey);
    const base64DataUrl = await imageToBase64DataUrl(imageUri);
    
    const prompt = `Identify all money (notes and coins) in this image.

RESPOND ONLY WITH JSON, NO OTHER TEXT OR REASONING.

JSON format:
{"detected": true, "items": [{"denomination": 100, "type": "note"}, {"denomination": 5, "type": "coin"}], "total": 105, "currency": "INR"}

If no money found:
{"detected": false, "total": 0}

IMPORTANT: Output ONLY the JSON object, nothing else.`;

    const completion = await client.chat.completions.create({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt,
            },
            {
              type: 'image_url',
              image_url: {
                url: base64DataUrl,
              },
            },
          ],
        },
      ],
      temperature: 0.3,
      max_tokens: 300,
    });

    const responseText = completion.choices[0]?.message?.content || '';
    
    // Try to parse JSON from response
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          detected: parsed.detected || false,
          items: parsed.items,
          total: parsed.total,
          denomination: parsed.total || parsed.denomination,
          currency: parsed.currency,
          description: parsed.description || 'Currency analysis complete',
        };
      }
    } catch {
      // If JSON parsing fails, return the raw description
      return {
        detected: false,
        description: responseText || 'Could not identify currency',
      };
    }

    return {
      detected: false,
      description: 'Could not identify currency in the image',
    };
  } catch (error) {
    console.error('Currency detection error:', error);
    return {
      detected: false,
      description: 'Sorry, there was an error detecting currency.',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Chat with context about a previously described image
 */
export async function chatAboutImage(
  imageUri: string,
  question: string,
  apiKey: string,
  language: Language = 'en'
): Promise<VisionResponse> {
  return describeImage(imageUri, apiKey, question, language);
}

export default {
  describeImage,
  detectCurrency,
  chatAboutImage,
};
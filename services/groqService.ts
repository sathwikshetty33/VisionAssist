/**
 * Groq AI Service
 * Handles text-based AI tasks using Groq's fast inference API
 * Uses llama-3.3-70b-versatile model for best quality
 */

import Groq from 'groq-sdk';

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

export interface GroqResponse {
  text: string;
  error?: string;
}

/**
 * Generate text response using Groq
 */
export async function generateText(
  prompt: string,
  apiKey: string,
  systemPrompt?: string
): Promise<GroqResponse> {
  try {
    const client = getClient(apiKey);
    
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];
    
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    
    messages.push({ role: 'user', content: prompt });
    
    const completion = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages,
      temperature: 0.7,
      max_tokens: 1024,
    });
    
    const text = completion.choices[0]?.message?.content || 'No response generated.';
    
    return { text };
  } catch (error) {
    console.error('Groq API error:', error);
    return {
      text: 'Sorry, there was an error processing your request.',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Chat conversation with Groq
 */
export async function chat(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  apiKey: string,
  systemPrompt?: string
): Promise<GroqResponse> {
  try {
    const client = getClient(apiKey);
    
    const allMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];
    
    if (systemPrompt) {
      allMessages.push({ role: 'system', content: systemPrompt });
    }
    
    allMessages.push(...messages);
    
    const completion = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: allMessages,
      temperature: 0.7,
      max_tokens: 1024,
    });
    
    const text = completion.choices[0]?.message?.content || 'No response generated.';
    
    return { text };
  } catch (error) {
    console.error('Groq chat error:', error);
    return {
      text: 'Sorry, there was an error processing your message.',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Quick question/answer for accessibility
 */
export async function askQuestion(
  question: string,
  apiKey: string
): Promise<GroqResponse> {
  const systemPrompt = `You are a helpful voice assistant for sight-impaired users. 
Keep your responses clear, concise, and easy to understand when read aloud.
Avoid using visual formatting like bullet points or numbered lists unless specifically asked.
Speak naturally as if having a conversation.`;

  return generateText(question, apiKey, systemPrompt);
}

/**
 * Summarize text for accessibility
 */
export async function summarizeText(
  text: string,
  apiKey: string
): Promise<GroqResponse> {
  const prompt = `Please summarize the following text in a clear and concise way that's easy to understand when read aloud:\n\n${text}`;
  
  const systemPrompt = `You are a helpful assistant that summarizes text for sight-impaired users.
Keep summaries brief but comprehensive. Use natural spoken language.`;

  return generateText(prompt, apiKey, systemPrompt);
}

export default {
  generateText,
  chat,
  askQuestion,
  summarizeText,
};

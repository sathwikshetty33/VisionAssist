/**
 * Voice Assistant Hook
 * Handles text-to-speech output with accent support
 */

import { useCallback, useState } from 'react';
import * as Speech from 'expo-speech';

export interface VoiceOptions {
  language?: string;
  pitch?: number;
  rate?: number;
  voice?: string;
}

// Supported voice configurations
export const VoiceAccents = {
  'en-US': { name: 'English (US)', language: 'en-US' },
  'en-GB': { name: 'English (UK)', language: 'en-GB' },
  'en-IN': { name: 'English (India)', language: 'en-IN' },
  'hi-IN': { name: 'Hindi', language: 'hi-IN' },
  'es-ES': { name: 'Spanish', language: 'es-ES' },
};

export function useVoiceAssistant() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState('en-US');
  const [speechRate, setSpeechRate] = useState(0.9); // Slightly slower for clarity
  const [speechPitch, setSpeechPitch] = useState(1.0);

  /**
   * Speak text with current settings
   */
  const speak = useCallback(async (text: string, options?: VoiceOptions) => {
    try {
      // Stop any current speech
      await Speech.stop();
      
      setIsSpeaking(true);
      
      await Speech.speak(text, {
        language: options?.language || currentLanguage,
        pitch: options?.pitch || speechPitch,
        rate: options?.rate || speechRate,
        voice: options?.voice,
        onStart: () => setIsSpeaking(true),
        onDone: () => setIsSpeaking(false),
        onStopped: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false),
      });
    } catch (error) {
      console.error('Speech error:', error);
      setIsSpeaking(false);
    }
  }, [currentLanguage, speechPitch, speechRate]);

  /**
   * Stop current speech
   */
  const stop = useCallback(async () => {
    try {
      await Speech.stop();
      setIsSpeaking(false);
    } catch (error) {
      console.error('Stop speech error:', error);
    }
  }, []);

  /**
   * Check if speech is available
   */
  const isAvailable = useCallback(async () => {
    try {
      return await Speech.isSpeakingAsync();
    } catch {
      return false;
    }
  }, []);

  /**
   * Get available voices for a language
   */
  const getVoices = useCallback(async () => {
    try {
      return await Speech.getAvailableVoicesAsync();
    } catch {
      return [];
    }
  }, []);

  /**
   * Announce for accessibility (important announcements)
   */
  const announce = useCallback(async (text: string) => {
    await speak(text, { rate: 1.0 }); // Normal rate for announcements
  }, [speak]);

  /**
   * Read description (slightly slower for comprehension)
   */
  const readDescription = useCallback(async (text: string) => {
    await speak(text, { rate: 0.85 });
  }, [speak]);

  /**
   * Emergency announcement (clear and loud)
   */
  const emergencyAnnounce = useCallback(async (text: string) => {
    await speak(text, { rate: 0.8, pitch: 1.1 });
  }, [speak]);

  /**
   * Quick feedback (faster for confirmations)
   */
  const quickFeedback = useCallback(async (text: string) => {
    await speak(text, { rate: 1.2 });
  }, [speak]);

  return {
    speak,
    stop,
    isSpeaking,
    isAvailable,
    getVoices,
    announce,
    readDescription,
    emergencyAnnounce,
    quickFeedback,
    currentLanguage,
    setCurrentLanguage,
    speechRate,
    setSpeechRate,
    speechPitch,
    setSpeechPitch,
  };
}

export default useVoiceAssistant;

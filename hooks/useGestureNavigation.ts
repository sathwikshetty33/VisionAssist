/**
 * Gesture Navigation Hook
 * Detects multi-tap gestures for quick navigation
 * Double tap: Camera/Chat, Triple tap: SOS, Quadruple tap: Currency
 */

import { useRouter } from 'expo-router';
import { useCallback, useRef } from 'react';
import { useHaptics } from './useHaptics';
import { useVoiceAssistant } from './useVoiceAssistant';

const TAP_TIMEOUT = 1200; // ms to wait for additional taps
const MIN_TAPS_FOR_ACTION = 2;
const MAX_TAPS_FOR_ACTION = 4;

interface GestureConfig {
  enabled?: boolean;
  onDoubleTap?: () => void;
  onTripleTap?: () => void;
  onQuadrupleTap?: () => void;
}

export function useGestureNavigation(config: GestureConfig = {}) {
  const { enabled = true } = config;
  const router = useRouter();
  const haptics = useHaptics();
  const voice = useVoiceAssistant();
  
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<number | null>(null);
  const lastTapTimeRef = useRef(0);

  const executeAction = useCallback((tapCount: number) => {
    switch (tapCount) {
      case 2:
        // Double tap - Camera/Chat
        if (config.onDoubleTap) {
          config.onDoubleTap();
        } else {
          haptics.mediumImpact();
          voice.quickFeedback('Opening camera chat');
          router.push('/chat');
        }
        break;
      case 3:
        // Triple tap - SOS
        if (config.onTripleTap) {
          config.onTripleTap();
        } else {
          haptics.heavyImpact();
          voice.quickFeedback('Opening emergency');
          router.push('/sos');
        }
        break;
      case 4:
        // Quadruple tap - Currency
        if (config.onQuadrupleTap) {
          config.onQuadrupleTap();
        } else {
          haptics.mediumImpact();
          voice.quickFeedback('Opening currency scanner');
          router.push('/currency');
        }
        break;
      default:
        break;
    }
  }, [config, haptics, voice, router]);

  const handleTap = useCallback(() => {
    if (!enabled) return;

    const now = Date.now();
    const timeSinceLastTap = now - lastTapTimeRef.current;
    lastTapTimeRef.current = now;

    // If too much time passed, reset count
    if (timeSinceLastTap > TAP_TIMEOUT) {
      tapCountRef.current = 0;
    }

    tapCountRef.current += 1;
    
    // Give subtle feedback on first tap
    if (tapCountRef.current === 1) {
      haptics.selection();
    }

    // Clear existing timer
    if (tapTimerRef.current) {
      clearTimeout(tapTimerRef.current);
    }

    // If max taps reached, execute immediately
    if (tapCountRef.current >= MAX_TAPS_FOR_ACTION) {
      executeAction(tapCountRef.current);
      tapCountRef.current = 0;
      return;
    }

    // Wait for more taps
    tapTimerRef.current = setTimeout(() => {
      if (tapCountRef.current >= MIN_TAPS_FOR_ACTION) {
        executeAction(tapCountRef.current);
      }
      tapCountRef.current = 0;
    }, TAP_TIMEOUT);
  }, [enabled, haptics, executeAction]);

  const resetTaps = useCallback(() => {
    tapCountRef.current = 0;
    if (tapTimerRef.current) {
      clearTimeout(tapTimerRef.current);
      tapTimerRef.current = null;
    }
  }, []);

  return {
    handleTap,
    resetTaps,
    getTapCount: () => tapCountRef.current,
  };
}

export default useGestureNavigation;

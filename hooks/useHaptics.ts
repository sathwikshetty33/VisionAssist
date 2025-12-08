/**
 * Haptic feedback patterns for accessibility
 * Provides distinct vibration feedback for different actions
 */

import * as Haptics from 'expo-haptics';
import { Platform, Vibration } from 'react-native';

// Custom vibration patterns (Android only for complex patterns)
export const HapticPatterns = {
  // Single pulses for currency denominations
  currency10: [0, 100],
  currency20: [0, 100, 100, 100],
  currency50: [0, 100, 100, 100, 100, 100, 100, 100, 100, 100],
  currency100: [0, 200],
  currency200: [0, 200, 100, 200],
  currency500: [0, 300, 100, 300, 100, 300],
  currency2000: [0, 500, 100, 500],
  
  // Action feedback
  buttonPress: [0, 50],
  success: [0, 100, 50, 100],
  error: [0, 200, 100, 200, 100, 200],
  warning: [0, 150, 100, 150],
  
  // Navigation
  tabSwitch: [0, 30],
  screenChange: [0, 50, 50, 50],
  
  // SOS emergency pattern (SOS in Morse code: ... --- ...)
  sos: [
    0,
    100, 100, // S: .
    100, 100, // .
    100, 300, // .
    300, 100, // O: -
    300, 100, // -
    300, 300, // -
    100, 100, // S: .
    100, 100, // .
    100, 0,   // .
  ],
  
  // Confirmation patterns
  confirmed: [0, 50, 30, 100],
  cancelled: [0, 30, 20, 30],
};

/**
 * Custom hook for haptic feedback
 */
export function useHaptics() {
  /**
   * Light impact - for selections and minor interactions
   */
  const lightImpact = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.log('Haptic feedback not available');
    }
  };

  /**
   * Medium impact - for button presses and navigation
   */
  const mediumImpact = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.log('Haptic feedback not available');
    }
  };

  /**
   * Heavy impact - for important actions
   */
  const heavyImpact = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (error) {
      console.log('Haptic feedback not available');
    }
  };

  /**
   * Selection feedback - for scrolling, selecting items
   */
  const selection = async () => {
    try {
      await Haptics.selectionAsync();
    } catch (error) {
      console.log('Haptic feedback not available');
    }
  };

  /**
   * Success notification
   */
  const success = async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.log('Haptic feedback not available');
    }
  };

  /**
   * Warning notification
   */
  const warning = async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch (error) {
      console.log('Haptic feedback not available');
    }
  };

  /**
   * Error notification
   */
  const error = async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch (error) {
      console.log('Haptic feedback not available');
    }
  };

  /**
   * Custom vibration pattern (Android has full support, iOS limited)
   */
  const vibrate = (pattern: number[]) => {
    if (Platform.OS === 'android') {
      Vibration.vibrate(pattern);
    } else {
      // iOS only supports single vibration
      Vibration.vibrate();
    }
  };

  /**
   * SOS emergency vibration
   */
  const sosVibration = () => {
    vibrate(HapticPatterns.sos);
  };

  /**
   * Currency denomination feedback
   */
  const currencyFeedback = (denomination: number) => {
    switch (denomination) {
      case 10:
        vibrate(HapticPatterns.currency10);
        break;
      case 20:
        vibrate(HapticPatterns.currency20);
        break;
      case 50:
        vibrate(HapticPatterns.currency50);
        break;
      case 100:
        vibrate(HapticPatterns.currency100);
        break;
      case 200:
        vibrate(HapticPatterns.currency200);
        break;
      case 500:
        vibrate(HapticPatterns.currency500);
        break;
      case 2000:
        vibrate(HapticPatterns.currency2000);
        break;
      default:
        mediumImpact();
    }
  };

  /**
   * Stop any ongoing vibration
   */
  const cancel = () => {
    Vibration.cancel();
  };

  return {
    lightImpact,
    mediumImpact,
    heavyImpact,
    selection,
    success,
    warning,
    error,
    vibrate,
    sosVibration,
    currencyFeedback,
    cancel,
  };
}

export default useHaptics;

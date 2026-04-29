/**
 * Currency Detection Screen
 * Detects and announces currency denomination
 * Tap anywhere to scan - full screen camera
 */

import FontAwesome from '@expo/vector-icons/FontAwesome';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Colors, { FontSizes, Spacing } from '@/constants/Colors';
import { useLanguage } from '@/contexts/LanguageContext';
import { useHaptics } from '@/hooks/useHaptics';
import { useVoiceAssistant } from '@/hooks/useVoiceAssistant';
import { CurrencyItem, detectCurrency } from '@/services/geminiVision';

const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY || '';

export default function CurrencyScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'light' ? 'light' : 'dark'];
  const router = useRouter();
  
  const [permission, requestPermission] = useCameraPermissions();
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<{
    detected?: boolean;
    items?: CurrencyItem[];
    total?: number;
    denomination?: number;
    currency?: string;
    description: string;
  } | null>(null);
  
  const cameraRef = useRef<CameraView>(null);
  const haptics = useHaptics();
  const voice = useVoiceAssistant();
  const { t, voiceCode } = useLanguage();
  
  // Double tap to exit tracking
  const lastTapRef = useRef(0);
  const TAP_TIMEOUT = 1200;

  // Sync voice language
  useEffect(() => {
    voice.setCurrentLanguage(voiceCode);
  }, [voiceCode]);

  useEffect(() => {
    voice.announce(t('currencyScanner'));
  }, []);

  const tapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleScreenTap = useCallback(() => {
    const now = Date.now();
    const timeSinceLastTap = now - lastTapRef.current;
    lastTapRef.current = now;

    // Clear any pending single tap action
    if (tapTimeoutRef.current) {
      clearTimeout(tapTimeoutRef.current);
      tapTimeoutRef.current = null;
    }

    // Double tap detection - go back
    if (timeSinceLastTap < TAP_TIMEOUT) {
      // Clear any pending single tap
      if (tapTimeoutRef.current) {
        clearTimeout(tapTimeoutRef.current);
        tapTimeoutRef.current = null;
      }
      haptics.mediumImpact();
      voice.quickFeedback(t('goingBack'));
      router.back();
      return;
    }

    // Delay single tap to allow for double tap detection
    tapTimeoutRef.current = setTimeout(() => {
      if (!isProcessing) {
        handleScan();
      }
    }, TAP_TIMEOUT);
  }, [isProcessing, router, haptics, voice]);

  const handleScan = async () => {
    if (!cameraRef.current || isProcessing) return;

    haptics.mediumImpact();
    setIsProcessing(true);
    voice.quickFeedback(t('scanning'));

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      });

      if (photo?.uri) {
        const result = await detectCurrency(photo.uri, GROQ_API_KEY);
        
        setLastResult(result);
        
        if (result.detected && (result.total || result.denomination)) {
          const amount = result.total || result.denomination || 0;
          haptics.currencyFeedback(amount);
          
          const currencyName = result.currency === 'INR' ? t('rupees') : 
                               result.currency === 'USD' ? t('dollars') : 
                               result.currency || '';
          
          // Announce total and list items
          if (result.items && result.items.length > 1) {
            const itemList = result.items
              .map(i => i.denomination)
              .join(' + ');
            voice.announce(`${t('total')} ${amount} ${currencyName}. ${itemList}`);
          } else {
            voice.announce(`${amount} ${currencyName}`);
          }
        } else {
          haptics.warning();
          voice.announce(result.description || 'No currency detected. Tap to try again.');
        }
      }
    } catch (err) {
      haptics.error();
      voice.announce('Could not scan. Tap to try again.');
      console.error('Scan error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!permission) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.permissionContainer}>
          <FontAwesome name="money" size={80} color={colors.textMuted} />
          <Text style={[styles.permissionText, { color: colors.text }]}>
            Camera access is needed to detect currency
          </Text>
          <TouchableOpacity
            style={[styles.permissionButton, { backgroundColor: colors.primary }]}
            onPress={requestPermission}
            accessibilityLabel="Grant camera permission"
            accessibilityRole="button"
          >
            <Text style={[styles.permissionButtonText, { color: colors.background }]}>
              Enable Camera
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Pressable 
        style={styles.fullScreen} 
        onPress={handleScreenTap}
        disabled={isProcessing}
      >
        {/* Full screen camera */}
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing="back"
        />
        
        {/* Overlay */}
        <View style={styles.overlay}>
          {isProcessing ? (
            <View style={styles.processingContainer}>
              <ActivityIndicator size="large" color={colors.secondary} />
              <Text style={[styles.processingText, { color: colors.text }]}>
                Scanning...
              </Text>
            </View>
          ) : lastResult ? (
            // Show result
            <View style={[styles.resultContainer, { 
              backgroundColor: lastResult.detected ? colors.success + 'DD' : colors.surface + 'DD'
            }]}>
              <FontAwesome 
                name={lastResult.detected ? 'check-circle' : 'question-circle'} 
                size={50} 
                color={lastResult.detected ? colors.background : colors.textMuted} 
              />
              <Text style={[styles.resultAmount, { 
                color: lastResult.detected ? colors.background : colors.text 
              }]}>
                {lastResult.detected 
                  ? `Total: ${lastResult.total || lastResult.denomination} ${lastResult.currency || ''}`
                  : 'Not Detected'}
              </Text>
              {lastResult.items && lastResult.items.length > 1 && (
                <Text style={[styles.resultItems, { color: colors.background }]}>
                  {lastResult.items.map(i => `${i.denomination} ${i.type}`).join(' + ')}
                </Text>
              )}
              <Text style={[styles.resultHint, { 
                color: lastResult.detected ? colors.background : colors.textSecondary 
              }]}>
                Tap to scan again
              </Text>
            </View>
          ) : (
            // Initial state - instructions
            <View style={styles.instructionContainer}>
              <FontAwesome name="money" size={60} color={colors.secondary} />
              <Text style={[styles.instructionText, { color: colors.text }]}>
                Tap anywhere to scan
              </Text>
              <Text style={[styles.hintText, { color: colors.textMuted }]}>
                Hold currency note in view
              </Text>
              <Text style={[styles.hintText, { color: colors.textMuted }]}>
                Double tap to go back
              </Text>
            </View>
          )}
        </View>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fullScreen: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingContainer: {
    alignItems: 'center',
    padding: Spacing.xl,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: Spacing.lg,
  },
  processingText: {
    fontSize: FontSizes.large,
    marginTop: Spacing.md,
  },
  instructionContainer: {
    alignItems: 'center',
    padding: Spacing.xl,
  },
  instructionText: {
    fontSize: FontSizes.xlarge,
    fontWeight: 'bold',
    marginTop: Spacing.lg,
    textAlign: 'center',
  },
  hintText: {
    fontSize: FontSizes.medium,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  resultContainer: {
    alignItems: 'center',
    padding: Spacing.xl,
    borderRadius: Spacing.lg,
    minWidth: 250,
  },
  resultAmount: {
    fontSize: FontSizes.xxlarge,
    fontWeight: 'bold',
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  resultHint: {
    fontSize: FontSizes.medium,
    marginTop: Spacing.md,
  },
  resultItems: {
    fontSize: FontSizes.medium,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
    gap: Spacing.lg,
  },
  permissionText: {
    fontSize: FontSizes.large,
    textAlign: 'center',
  },
  permissionButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderRadius: Spacing.md,
  },
  permissionButtonText: {
    fontSize: FontSizes.large,
    fontWeight: 'bold',
  },
});

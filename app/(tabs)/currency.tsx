/**
 * Currency Detection Screen
 * Detects and announces currency denomination
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  useColorScheme,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import Colors, { FontSizes, Spacing, TouchTargets } from '@/constants/Colors';
import { useHaptics } from '@/hooks/useHaptics';
import { useVoiceAssistant } from '@/hooks/useVoiceAssistant';
import { detectCurrency } from '@/services/geminiVision';

// Read API key from environment variable (now using Groq for vision)
const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY || '';

export default function CurrencyScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'light' ? 'light' : 'dark'];
  
  const [permission, requestPermission] = useCameraPermissions();
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<{
    detected?: boolean;
    denomination?: number;
    currency?: string;
    description: string;
  } | null>(null);
  
  const cameraRef = useRef<CameraView>(null);
  const haptics = useHaptics();
  const voice = useVoiceAssistant();

  useEffect(() => {
    voice.announce('Currency detection screen. Hold a currency note in front of the camera and tap the scan button.');
  }, []);

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

  const handleScan = async () => {
    if (!cameraRef.current || isProcessing) return;

    haptics.mediumImpact();
    setIsProcessing(true);
    voice.quickFeedback('Scanning currency');

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      });

      if (photo?.uri) {
        const result = await detectCurrency(photo.uri, GROQ_API_KEY);
        
        setLastResult(result);
        
        if (result.detected && result.denomination) {
          // Provide haptic feedback for denomination
          haptics.currencyFeedback(result.denomination);
          
          // Announce the currency
          const currencyName = result.currency === 'INR' ? 'rupees' : 
                               result.currency === 'USD' ? 'dollars' : 
                               result.currency || 'units';
          voice.announce(`This is a ${result.denomination} ${currencyName} note`);
        } else {
          haptics.warning();
          voice.announce(result.description || 'No currency detected. Please try again.');
        }
      }
    } catch (error) {
      haptics.error();
      voice.announce('Sorry, could not scan the currency. Please try again.');
      console.error('Scan error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const repeatAnnouncement = () => {
    if (lastResult) {
      haptics.lightImpact();
      if (lastResult.denomination) {
        haptics.currencyFeedback(lastResult.denomination);
        const currencyName = lastResult.currency === 'INR' ? 'rupees' : 
                             lastResult.currency === 'USD' ? 'dollars' : 
                             lastResult.currency || 'units';
        voice.announce(`This is a ${lastResult.denomination} ${currencyName} note`);
      } else {
        voice.announce(lastResult.description);
      }
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Instructions */}
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <Text style={[styles.headerText, { color: colors.text }]}>
          Currency Detection
        </Text>
        <Text style={[styles.instructionText, { color: colors.textSecondary }]}>
          Hold currency note flat and centered
        </Text>
      </View>

      {/* Camera View */}
      <View style={styles.cameraContainer}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing="back"
        >
          {/* Scanning Guide Overlay */}
          <View style={styles.guideOverlay}>
            <View style={[styles.guideFrame, { borderColor: colors.primary }]} />
          </View>
          
          {isProcessing && (
            <View style={styles.processingOverlay}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.processingText, { color: colors.text }]}>
                Detecting...
              </Text>
            </View>
          )}
        </CameraView>
      </View>

      {/* Result Display */}
      {lastResult && (
        <View style={[styles.resultContainer, { 
          backgroundColor: lastResult.detected ? colors.success + '20' : colors.surface 
        }]}>
          <FontAwesome 
            name={lastResult.detected ? 'check-circle' : 'question-circle'} 
            size={40} 
            color={lastResult.detected ? colors.success : colors.textMuted} 
          />
          <View style={styles.resultTextContainer}>
            <Text style={[styles.resultAmount, { color: colors.text }]}>
              {lastResult.detected 
                ? `${lastResult.denomination} ${lastResult.currency || ''}`
                : 'Not Detected'}
            </Text>
            <Text style={[styles.resultDescription, { color: colors.textSecondary }]}>
              {lastResult.description}
            </Text>
          </View>
        </View>
      )}

      {/* Controls */}
      <View style={[styles.controls, { backgroundColor: colors.surface }]}>
        {/* Repeat Button */}
        <TouchableOpacity
          style={[styles.controlButton, { backgroundColor: colors.surfaceElevated }]}
          onPress={repeatAnnouncement}
          disabled={!lastResult}
          accessibilityLabel="Repeat last result"
          accessibilityRole="button"
        >
          <FontAwesome 
            name="volume-up" 
            size={28} 
            color={lastResult ? colors.text : colors.textMuted} 
          />
        </TouchableOpacity>

        {/* Scan Button */}
        <TouchableOpacity
          style={[styles.scanButton, { backgroundColor: colors.secondary }]}
          onPress={handleScan}
          disabled={isProcessing}
          accessibilityLabel="Scan currency"
          accessibilityHint="Double tap to scan the currency note"
          accessibilityRole="button"
        >
          <FontAwesome name="money" size={40} color={colors.background} />
          <Text style={[styles.scanButtonText, { color: colors.background }]}>
            SCAN
          </Text>
        </TouchableOpacity>

        {/* Help Button */}
        <TouchableOpacity
          style={[styles.controlButton, { backgroundColor: colors.surfaceElevated }]}
          onPress={() => voice.announce('Hold your currency note flat in front of the camera, centered in the frame, then tap the scan button.')}
          accessibilityLabel="Help"
          accessibilityRole="button"
        >
          <FontAwesome name="question" size={28} color={colors.text} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: Spacing.md,
    alignItems: 'center',
  },
  headerText: {
    fontSize: FontSizes.xlarge,
    fontWeight: 'bold',
  },
  instructionText: {
    fontSize: FontSizes.medium,
    marginTop: Spacing.xs,
  },
  cameraContainer: {
    flex: 1,
    margin: Spacing.md,
    borderRadius: Spacing.md,
    overflow: 'hidden',
  },
  camera: {
    flex: 1,
  },
  guideOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guideFrame: {
    width: '80%',
    height: '60%',
    borderWidth: 3,
    borderRadius: Spacing.md,
    borderStyle: 'dashed',
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingText: {
    fontSize: FontSizes.large,
    marginTop: Spacing.md,
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
  resultContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    borderRadius: Spacing.md,
    gap: Spacing.md,
  },
  resultTextContainer: {
    flex: 1,
  },
  resultAmount: {
    fontSize: FontSizes.xlarge,
    fontWeight: 'bold',
  },
  resultDescription: {
    fontSize: FontSizes.medium,
    marginTop: Spacing.xs,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
  },
  controlButton: {
    width: TouchTargets.medium,
    height: TouchTargets.medium,
    borderRadius: TouchTargets.medium / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanButton: {
    width: TouchTargets.large + 20,
    height: TouchTargets.large,
    borderRadius: Spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  scanButtonText: {
    fontSize: FontSizes.large,
    fontWeight: 'bold',
  },
});

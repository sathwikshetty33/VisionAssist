/**
 * Camera Screen - Image Recognition
 * Captures images and describes them using Gemini Vision API
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  useColorScheme,
  ActivityIndicator,
  TextInput,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import Colors, { FontSizes, Spacing, TouchTargets } from '@/constants/Colors';
import { useHaptics } from '@/hooks/useHaptics';
import { useVoiceAssistant } from '@/hooks/useVoiceAssistant';
import { describeImage, chatAboutImage } from '@/services/geminiVision';

// Read API key from environment variable (now using Groq for vision)
const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY || '';

export default function CameraScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'light' ? 'light' : 'dark'];
  
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastDescription, setLastDescription] = useState<string | null>(null);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [followUpQuestion, setFollowUpQuestion] = useState('');
  
  const cameraRef = useRef<CameraView>(null);
  const haptics = useHaptics();
  const voice = useVoiceAssistant();

  useEffect(() => {
    voice.announce('Camera screen. Triple tap the capture button to take a photo and hear a description.');
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
          <FontAwesome name="camera" size={80} color={colors.textMuted} />
          <Text style={[styles.permissionText, { color: colors.text }]}>
            Camera access is needed to describe your surroundings
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

  const handleCapture = async () => {
    if (!cameraRef.current || isProcessing) return;

    haptics.mediumImpact();
    setIsProcessing(true);
    voice.quickFeedback('Capturing image');

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        base64: false,
      });

      if (photo?.uri) {
        setCurrentImage(photo.uri);
        voice.announce('Analyzing image, please wait');
        
        const result = await describeImage(photo.uri, GROQ_API_KEY);
        
        setLastDescription(result.description);
        haptics.success();
        voice.readDescription(result.description);
      }
    } catch (error) {
      haptics.error();
      voice.announce('Sorry, could not capture or analyze the image');
      console.error('Capture error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFollowUp = async () => {
    if (!currentImage || !followUpQuestion.trim() || isProcessing) return;

    haptics.lightImpact();
    setIsProcessing(true);
    voice.quickFeedback('Thinking');

    try {
      const result = await chatAboutImage(currentImage, followUpQuestion, GROQ_API_KEY);
      setLastDescription(result.description);
      haptics.success();
      voice.readDescription(result.description);
      setFollowUpQuestion('');
    } catch (error) {
      haptics.error();
      voice.announce('Sorry, could not process your question');
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleCamera = () => {
    haptics.lightImpact();
    setFacing(current => (current === 'back' ? 'front' : 'back'));
    voice.quickFeedback(facing === 'back' ? 'Front camera' : 'Back camera');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Camera View */}
      <View style={styles.cameraContainer}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing={facing}
        >
          {isProcessing && (
            <View style={styles.processingOverlay}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.processingText, { color: colors.text }]}>
                Analyzing...
              </Text>
            </View>
          )}
        </CameraView>
      </View>

      {/* Controls */}
      <View style={[styles.controls, { backgroundColor: colors.surface }]}>
        {/* Flip Camera */}
        <TouchableOpacity
          style={[styles.controlButton, { backgroundColor: colors.surfaceElevated }]}
          onPress={toggleCamera}
          accessibilityLabel="Flip camera"
          accessibilityRole="button"
        >
          <FontAwesome name="refresh" size={28} color={colors.text} />
        </TouchableOpacity>

        {/* Capture Button */}
        <TouchableOpacity
          style={[styles.captureButton, { backgroundColor: colors.primary }]}
          onPress={handleCapture}
          disabled={isProcessing}
          accessibilityLabel="Capture and describe image"
          accessibilityHint="Triple tap to take a photo and hear a description"
          accessibilityRole="button"
        >
          <FontAwesome name="camera" size={40} color={colors.background} />
        </TouchableOpacity>

        {/* Repeat Description */}
        <TouchableOpacity
          style={[styles.controlButton, { backgroundColor: colors.surfaceElevated }]}
          onPress={() => lastDescription && voice.readDescription(lastDescription)}
          disabled={!lastDescription}
          accessibilityLabel="Repeat last description"
          accessibilityRole="button"
        >
          <FontAwesome 
            name="volume-up" 
            size={28} 
            color={lastDescription ? colors.text : colors.textMuted} 
          />
        </TouchableOpacity>
      </View>

      {/* Description & Follow-up */}
      {lastDescription && (
        <ScrollView style={[styles.descriptionContainer, { backgroundColor: colors.surface }]}>
          <Text style={[styles.descriptionText, { color: colors.text }]}>
            {lastDescription}
          </Text>
          
          <View style={styles.followUpContainer}>
            <TextInput
              style={[styles.followUpInput, { 
                backgroundColor: colors.surfaceElevated,
                color: colors.text,
                borderColor: colors.border,
              }]}
              placeholder="Ask a follow-up question..."
              placeholderTextColor={colors.textMuted}
              value={followUpQuestion}
              onChangeText={setFollowUpQuestion}
              onSubmitEditing={handleFollowUp}
              accessibilityLabel="Follow-up question input"
            />
            <TouchableOpacity
              style={[styles.followUpButton, { backgroundColor: colors.primary }]}
              onPress={handleFollowUp}
              disabled={!followUpQuestion.trim() || isProcessing}
              accessibilityLabel="Ask follow-up question"
              accessibilityRole="button"
            >
              <FontAwesome name="arrow-right" size={20} color={colors.background} />
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  cameraContainer: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: Spacing.md,
    margin: Spacing.md,
  },
  camera: {
    flex: 1,
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
  captureButton: {
    width: TouchTargets.large,
    height: TouchTargets.large,
    borderRadius: TouchTargets.large / 2,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  descriptionContainer: {
    maxHeight: 200,
    padding: Spacing.md,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    borderRadius: Spacing.md,
  },
  descriptionText: {
    fontSize: FontSizes.medium,
    lineHeight: 28,
  },
  followUpContainer: {
    flexDirection: 'row',
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  followUpInput: {
    flex: 1,
    fontSize: FontSizes.medium,
    padding: Spacing.md,
    borderRadius: Spacing.sm,
    borderWidth: 1,
  },
  followUpButton: {
    width: TouchTargets.minimum,
    height: TouchTargets.minimum,
    borderRadius: Spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

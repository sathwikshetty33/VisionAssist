/**
 * Chat Screen - Conversational Camera Chat
 * Takes a photo, describes it, then uses voice for conversation
 * Uses Groq Whisper API for speech-to-text (works in Expo Go!)
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  useColorScheme,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { Audio } from 'expo-av';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import Colors, { FontSizes, Spacing } from '@/constants/Colors';
import { useHaptics } from '@/hooks/useHaptics';
import { useVoiceAssistant } from '@/hooks/useVoiceAssistant';
import { describeImage, chatAboutImage } from '@/services/geminiVision';
import { useLanguage } from '@/contexts/LanguageContext';

const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY || '';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'light' ? 'light' : 'dark'];
  const router = useRouter();
  
  const [permission, requestPermission] = useCameraPermissions();
  const [facing] = useState<CameraType>('back');
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasPhoto, setHasPhoto] = useState(false);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [audioPermission, setAudioPermission] = useState(false);
  
  const cameraRef = useRef<CameraView>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const recordingLockRef = useRef(false); // Prevent race conditions
  const haptics = useHaptics();
  const voice = useVoiceAssistant();
  const { language, whisperCode, voiceCode, t } = useLanguage();
  
  // Double tap to exit tracking
  const lastTapRef = useRef(0);
  const TAP_TIMEOUT = 400;

  // Request audio permission on mount
  useEffect(() => {
    (async () => {
      const { status } = await Audio.requestPermissionsAsync();
      setAudioPermission(status === 'granted');
      
      // Configure audio mode for recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
    })();
  }, []);

  // Sync voice language with context
  useEffect(() => {
    voice.setCurrentLanguage(voiceCode);
  }, [voiceCode]);

  useEffect(() => {
    voice.announce(t('chatMode'));
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const handleScreenTap = useCallback(() => {
    const now = Date.now();
    const timeSinceLastTap = now - lastTapRef.current;
    lastTapRef.current = now;

    // Double tap detection
    if (timeSinceLastTap < TAP_TIMEOUT) {
      haptics.mediumImpact();
      voice.quickFeedback(t('exitingChat'));
      router.back();
      return;
    }

    // Single tap - capture photo if not already done
    if (!hasPhoto && !isProcessing) {
      captureAndDescribe();
    }
  }, [hasPhoto, isProcessing, router, haptics, voice, t]);

  const captureAndDescribe = async () => {
    if (!cameraRef.current || isProcessing) return;

    haptics.mediumImpact();
    setIsProcessing(true);
    voice.quickFeedback(t('capturing'));

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        base64: false,
      });

      if (photo?.uri) {
        setCurrentImage(photo.uri);
        setHasPhoto(true);
        voice.announce(t('analyzing'));
        
        const result = await describeImage(photo.uri, GROQ_API_KEY, undefined, language);
        
        const assistantMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: result.description,
        };
        
        setMessages([assistantMessage]);
        haptics.success();
        voice.readDescription(result.description);
        
        // Prompt for questions after a delay
        setTimeout(() => {
          voice.announce(t('holdMicToAsk'));
        }, result.description.length * 40);
      }
    } catch (err) {
      haptics.error();
      voice.announce(t('captureError'));
      console.error('Capture error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const startRecording = async () => {
    // Guard against multiple recording attempts using lock
    if (recordingLockRef.current || isRecording || isProcessing) {
      console.log('Recording already in progress or busy, ignoring');
      return;
    }
    
    recordingLockRef.current = true;
    
    if (!audioPermission) {
      voice.announce(t('microphone'));
      recordingLockRef.current = false;
      return;
    }

    try {
      // Clean up any existing recording first
      if (recordingRef.current) {
        try {
          await recordingRef.current.stopAndUnloadAsync();
        } catch {
          // Ignore errors from stopping
        }
        recordingRef.current = null;
      }

      haptics.mediumImpact();
      setIsRecording(true);
      voice.quickFeedback(t('listening'));

      // Ensure audio mode is set correctly
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
    } catch (err) {
      console.error('Failed to start recording:', err);
      setIsRecording(false);
      recordingLockRef.current = false;
      voice.announce(t('recordingFailed'));
    }
  };

  const stopRecording = async () => {
    if (!recordingRef.current) {
      recordingLockRef.current = false;
      return;
    }

    try {
      setIsRecording(false);
      recordingLockRef.current = false;
      haptics.lightImpact();
      
      try {
        await recordingRef.current.stopAndUnloadAsync();
        const uri = recordingRef.current.getURI();
        recordingRef.current = null;

        if (uri) {
          await transcribeAndAsk(uri);
        }
      } catch {
        // Silently ignore errors from stopping recording too quickly
        recordingRef.current = null;
      }
    } catch {
      // Silently ignore
      recordingRef.current = null;
    }
  };

  const transcribeAndAsk = async (audioUri: string) => {
    setIsProcessing(true);
    voice.quickFeedback(t('processing'));

    try {
      // Create form data with audio file
      const formData = new FormData();
      formData.append('file', {
        uri: audioUri,
        type: 'audio/m4a',
        name: 'audio.m4a',
      } as any);
      formData.append('model', 'whisper-large-v3');
      formData.append('language', whisperCode);

      // Send to Groq Whisper API
      const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Whisper API error: ${response.status}`);
      }

      const data = await response.json();
      const transcript = data.text?.trim();

      if (transcript) {
        await handleFollowUp(transcript);
      } else {
        voice.announce('Could not understand. Please try again.');
      }
    } catch (err) {
      console.error('Transcription error:', err);
      voice.announce('Could not process speech. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFollowUp = async (question: string) => {
    if (!currentImage || !question.trim() || isProcessing) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: question,
    };
    setMessages(prev => [...prev, userMessage]);

    haptics.lightImpact();
    setIsProcessing(true);
    voice.quickFeedback(t('thinking'));

    try {
      const result = await chatAboutImage(currentImage, question, GROQ_API_KEY, language);
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.description,
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      haptics.success();
      voice.readDescription(result.description);
    } catch (err) {
      haptics.error();
      voice.announce('Sorry, could not process your question');
      console.error('Follow up error:', err);
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
        <Pressable style={styles.fullScreen} onPress={handleScreenTap}>
          <View style={styles.permissionContainer}>
            <FontAwesome name="camera" size={80} color={colors.textMuted} />
            <Text style={[styles.permissionText, { color: colors.text }]}>
              Camera access is needed for chat
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
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Pressable 
        style={styles.fullScreen} 
        onPress={handleScreenTap}
        onPressIn={hasPhoto ? startRecording : undefined}
        onPressOut={hasPhoto ? stopRecording : undefined}
        disabled={isProcessing}
      >
        {!hasPhoto ? (
          // Camera View
          <View style={styles.cameraContainer}>
            <CameraView
              ref={cameraRef}
              style={styles.camera}
              facing={facing}
            />
            <View style={styles.overlay}>
              {isProcessing ? (
                <View style={styles.processingContainer}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={[styles.processingText, { color: colors.text }]}>
                    Analyzing...
                  </Text>
                </View>
              ) : (
                <View style={styles.instructionContainer}>
                  <FontAwesome name="hand-pointer-o" size={60} color={colors.primary} />
                  <Text style={[styles.instructionText, { color: colors.text }]}>
                    Tap anywhere to capture
                  </Text>
                  <Text style={[styles.hintText, { color: colors.textMuted }]}>
                    Double tap to exit
                  </Text>
                </View>
              )}
            </View>
          </View>
        ) : (
          // Chat View
          <View style={styles.chatContainer}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: colors.surface }]}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => router.back()}
                accessibilityLabel="Go back"
              >
                <FontAwesome name="arrow-left" size={24} color={colors.text} />
              </TouchableOpacity>
              <Text style={[styles.headerText, { color: colors.text }]}>
                Photo Chat
              </Text>
              <TouchableOpacity
                style={styles.newPhotoButton}
                onPress={() => {
                  setHasPhoto(false);
                  setCurrentImage(null);
                  setMessages([]);
                }}
                accessibilityLabel="Take new photo"
              >
                <FontAwesome name="refresh" size={24} color={colors.primary} />
              </TouchableOpacity>
            </View>

            {/* Messages */}
            <ScrollView 
              ref={scrollViewRef}
              style={styles.messagesContainer}
              contentContainerStyle={styles.messagesContent}
            >
              {messages.map(message => (
                <View
                  key={message.id}
                  style={[
                    styles.messageBubble,
                    message.role === 'user' 
                      ? [styles.userMessage, { backgroundColor: colors.primary }]
                      : [styles.assistantMessage, { backgroundColor: colors.surface }]
                  ]}
                >
                  <Text style={[
                    styles.messageText,
                    { color: message.role === 'user' ? colors.background : colors.text }
                  ]}>
                    {message.content}
                  </Text>
                </View>
              ))}
              
              {isProcessing && (
                <View style={[styles.messageBubble, styles.assistantMessage, { backgroundColor: colors.surface }]}>
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
              )}
            </ScrollView>

            {/* Hold anywhere hint */}
            <View style={[styles.holdHintContainer, { backgroundColor: isRecording ? colors.emergency : colors.surface }]}>
              <FontAwesome 
                name="microphone" 
                size={20} 
                color={isRecording ? colors.background : colors.textMuted} 
              />
              <Text style={[styles.holdHintText, { color: isRecording ? colors.background : colors.textMuted }]}>
                {isRecording ? '🔴 Listening... Release to send' : 'Hold anywhere to speak • Double tap to exit'}
              </Text>
            </View>
          </View>
        )}
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
  cameraContainer: {
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
  chatContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.lg,
  },
  backButton: {
    padding: Spacing.sm,
  },
  headerText: {
    fontSize: FontSizes.large,
    fontWeight: 'bold',
  },
  newPhotoButton: {
    padding: Spacing.sm,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  messageBubble: {
    padding: Spacing.md,
    borderRadius: Spacing.md,
    maxWidth: '85%',
  },
  userMessage: {
    alignSelf: 'flex-end',
  },
  assistantMessage: {
    alignSelf: 'flex-start',
  },
  messageText: {
    fontSize: FontSizes.medium,
    lineHeight: 24,
  },
  voiceInputContainer: {
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.md,
  },
  micButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  micHintText: {
    fontSize: FontSizes.small,
    textAlign: 'center',
  },
  holdHintContainer: {
    flexDirection: 'row',
    padding: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  holdHintText: {
    fontSize: FontSizes.small,
    textAlign: 'center',
  },
});

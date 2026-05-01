/**
 * SOS Emergency Screen
 * Large accessible emergency button with voice activation
 * Voice-to-SMS: Record audio, transcribe with Whisper, send via SMS
 */

import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useIsFocused } from '@react-navigation/native';
import { Audio } from 'expo-av';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Linking,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    useColorScheme,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Colors, { FontSizes, Spacing, TouchTargets } from '@/constants/Colors';
import { useLanguage } from '@/contexts/LanguageContext';
import { useEmergencyContact } from '@/hooks/useEmergencyContact';
import { useHaptics } from '@/hooks/useHaptics';
import { useVoiceAssistant } from '@/hooks/useVoiceAssistant';

const COUNTDOWN_SECONDS = 5;
const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY || '';

export default function SOSScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'light' ? 'light' : 'dark'];
  const router = useRouter();
  
  const haptics = useHaptics();
  const voice = useVoiceAssistant();
  const emergency = useEmergencyContact();
  const { t, voiceCode, whisperCode } = useLanguage();
  
  const [isActivated, setIsActivated] = useState(false);
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [isSending, setIsSending] = useState(false);
  const [hasAudioPermission, setHasAudioPermission] = useState(false);
  const [hasAutoStartedRecording, setHasAutoStartedRecording] = useState(false);
  const autoStartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSendTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Contact modal
  const [showContactModal, setShowContactModal] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  
  // Voice message
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const recordingLockRef = useRef(false); // Prevent race conditions
  
  const isFocused = useIsFocused();
  
  // Double tap to exit
  const lastTapRef = useRef(0);
  const TAP_TIMEOUT = 1200;

  // Request audio permission on mount
  useEffect(() => {
    (async () => {
      const { status } = await Audio.requestPermissionsAsync();
      setHasAudioPermission(status === 'granted');
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
    })();
  }, []);

  // Sync voice language
  useEffect(() => {
    voice.setCurrentLanguage(voiceCode);
  }, [voiceCode]);

  // Announce screen on mount
  useEffect(() => {
    voice.announce(t('sosScreen'));
  }, []);

  // Countdown timer
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    
    if (isActivated && countdown > 0) {
      haptics.heavyImpact();
      voice.quickFeedback(countdown.toString());
      
      timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
    } else if (isActivated && countdown === 0) {
      triggerEmergency();
    }
    
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isActivated, countdown]);

  const triggerEmergency = async () => {
    setIsSending(true);
    haptics.sosVibration();
    
    voice.emergencyAnnounce('Sending emergency alert now.');
    
    const smsSent = await emergency.sendSOSMessage();
    const callMade = await emergency.callEmergencyContact();
    
    if (smsSent || callMade) {
      voice.announce(t('emergencyAlert') + '. Help is on the way.');
      haptics.success();
    } else {
      voice.announce('Could not send. ' + t('addContact'));
      haptics.error();
    }
    
    setIsSending(false);
    setIsActivated(false);
    setCountdown(COUNTDOWN_SECONDS);
  };

  const handleSOSPress = useCallback(() => {
    if (isActivated) return;
    
    haptics.heavyImpact();
    setIsActivated(true);
    voice.emergencyAnnounce(`${t('emergencyAlert')} ${COUNTDOWN_SECONDS} ${t('seconds')}`);
  }, [isActivated]);

  const handleCancel = useCallback(() => {
    setIsActivated(false);
    setCountdown(COUNTDOWN_SECONDS);
    haptics.cancel();
    haptics.mediumImpact();
    voice.quickFeedback(t('cancelled'));
  }, []);

  const handleAddContact = () => {
    if (!newContactPhone.trim()) {
      voice.announce('Please enter a phone number');
      return;
    }
    
    emergency.addContact({
      name: newContactName.trim() || 'Emergency Contact',
      phoneNumber: newContactPhone.trim(),
    });
    
    voice.quickFeedback(t('addContact'));
    haptics.success();
    setShowContactModal(false);
    setNewContactName('');
    setNewContactPhone('');
  };

  const startRecording = useCallback(async () => {
    // Guard against multiple recording attempts
    if (recordingLockRef.current || isRecording || isTranscribing) {
      console.log('Recording already in progress, ignoring');
      return;
    }
    
    recordingLockRef.current = true;
    
    try {
      if (recordingRef.current) {
        try {
          await recordingRef.current.stopAndUnloadAsync();
        } catch {
          // Ignore
        }
        recordingRef.current = null;
      }

      haptics.mediumImpact();
      setIsRecording(true);
      voice.quickFeedback(t('recording'));

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
  }, [isRecording, isTranscribing, t, voice, haptics]);

  useEffect(() => {
    if (!isFocused) {
      return;
    }

    if (!hasAudioPermission || hasAutoStartedRecording || isRecording || isTranscribing) {
      return;
    }

    setHasAutoStartedRecording(true);
    startRecording();
  }, [hasAudioPermission, hasAutoStartedRecording, isRecording, isTranscribing, isFocused, startRecording]);

  useEffect(() => {
    if (isFocused) {
      setHasAutoStartedRecording(false);
    }
  }, [isFocused]);

  const stopRecording = async () => {
    if (pendingSendTimerRef.current) {
      clearTimeout(pendingSendTimerRef.current);
      pendingSendTimerRef.current = null;
    }

    if (!recordingRef.current) {
      recordingLockRef.current = false;
      setIsRecording(false);
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
          await transcribeAndSend(uri);
        }
      } catch (stopErr) {
        // Silently ignore errors from stopping recording too quickly
        // (happens when user taps instead of holds)
        recordingRef.current = null;
      }
    } catch (err) {
      // Silently ignore - don't announce errors to user
      recordingRef.current = null;
    }
  };

  const stopRecordingWithoutSending = async () => {
    if (pendingSendTimerRef.current) {
      clearTimeout(pendingSendTimerRef.current);
      pendingSendTimerRef.current = null;
    }

    if (!recordingRef.current) {
      recordingLockRef.current = false;
      setIsRecording(false);
      return;
    }

    try {
      setIsRecording(false);
      recordingLockRef.current = false;
      haptics.lightImpact();
      await recordingRef.current.stopAndUnloadAsync();
      recordingRef.current = null;
    } catch {
      recordingRef.current = null;
    }
  };

  const handlePress = useCallback(() => {
    const now = Date.now();
    const timeSinceLastTap = now - lastTapRef.current;
    const isDoubleTap = timeSinceLastTap < TAP_TIMEOUT;
    lastTapRef.current = now;
    const recordingActive = isRecording || !!recordingRef.current;

    if (isDoubleTap) {
      if (pendingSendTimerRef.current) {
        clearTimeout(pendingSendTimerRef.current);
        pendingSendTimerRef.current = null;
      }

      if (recordingActive) {
        stopRecordingWithoutSending();
      }

      haptics.mediumImpact();
      voice.quickFeedback(t('goingBack'));
      router.replace('/');
      return;
    }

    if (recordingActive) {
      if (pendingSendTimerRef.current) {
        clearTimeout(pendingSendTimerRef.current);
      }

      pendingSendTimerRef.current = setTimeout(async () => {
        pendingSendTimerRef.current = null;
        if (recordingRef.current) {
          haptics.mediumImpact();
          voice.quickFeedback(t('sending'));
          await stopRecording();
        }
      }, TAP_TIMEOUT);
    }
  }, [isRecording, router, haptics, voice, t, stopRecordingWithoutSending]);

  useEffect(() => {
    return () => {
      if (pendingSendTimerRef.current) {
        clearTimeout(pendingSendTimerRef.current);
        pendingSendTimerRef.current = null;
      }
    };
  }, []);

  const transcribeAndSend = async (audioUri: string) => {
    if (emergency.contacts.length === 0) {
      voice.announce('Please add an emergency contact first');
      return;
    }

    setIsTranscribing(true);
    voice.quickFeedback('Processing');

    try {
      if (!GROQ_API_KEY) {
        throw new Error('Missing Groq API key');
      }

      // Create form data with audio file
      const formData = new FormData();
      formData.append('file', {
        uri: audioUri,
        type: 'audio/m4a',
        name: 'audio.m4a',
      } as any);
      formData.append('model', 'whisper-large-v3');
      formData.append('language', 'en');

      // Send to Groq Whisper API
      const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const status = response.status;
        if (status === 401 || status === 403) {
          throw new Error('Whisper API unauthorized: invalid or missing Groq API key');
        }
        throw new Error(`Whisper API error: ${status}`);
      }

      const data = await response.json();
      const transcript = data.text?.trim();

      if (transcript) {
        // Send SMS via phone's messaging app
        const contact = emergency.contacts[0];
        const smsUrl = `sms:${contact.phoneNumber}?body=${encodeURIComponent(transcript)}`;
        
        const canOpen = await Linking.canOpenURL(smsUrl);
        if (canOpen) {
          await Linking.openURL(smsUrl);
          voice.announce(`Opening message app with: ${transcript}`);
          haptics.success();
        } else {
          voice.announce('Could not open messaging app');
          haptics.error();
        }
      } else {
        voice.announce('Could not understand. Please try again.');
      }
    } catch (err) {
      console.error('Transcription error:', err);
      if (err instanceof Error && err.message.includes('Groq API key')) {
        voice.announce('Whisper API key missing or invalid. Please add a valid Groq key.');
      } else if (err instanceof Error && err.message.includes('unauthorized')) {
        voice.announce('Whisper API unauthorized. Check your Groq API key.');
      } else {
        voice.announce('Could not process voice message. Please try again.');
      }
    } finally {
      setIsTranscribing(false);
    }
  };

  return (
    <Pressable
      style={[styles.container, { backgroundColor: colors.background }]}
      onPress={handlePress}
      disabled={isActivated || isTranscribing}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text
            style={[styles.headerText, { color: colors.text }]}
            accessibilityRole="header"
          >
            Emergency SOS
          </Text>
          <Text style={[styles.subHeaderText, { color: colors.textSecondary }]}>
            {emergency.contacts.length} emergency contacts
          </Text>
        </View>

        {/* Main SOS Button */}
        <View style={styles.buttonContainer}>
          {!isActivated ? (
            <TouchableOpacity
              style={[styles.sosButton, { backgroundColor: colors.sosBackground }]}
              onPress={handleSOSPress}
              activeOpacity={0.8}
              disabled={isRecording || isActivated || isTranscribing}
              accessibilityLabel="Emergency SOS button"
              accessibilityHint="Double tap to start emergency countdown"
              accessibilityRole="button"
            >
              <FontAwesome name="exclamation-triangle" size={80} color={colors.sosText} />
              <Text style={[styles.sosButtonText, { color: colors.sosText }]}>
                SOS
              </Text>
              <Text style={[styles.sosButtonSubtext, { color: colors.sosText }]}>
                TAP FOR HELP
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={[styles.countdownContainer, { backgroundColor: colors.sosBackground }]}>
              <Text style={[styles.countdownText, { color: colors.sosText }]}>
                {countdown}
              </Text>
              <Text style={[styles.countdownLabel, { color: colors.sosText }]}>
                {isSending ? 'SENDING...' : 'SECONDS'}
              </Text>
              
              {!isSending && (
                <TouchableOpacity
                  style={[styles.cancelButton, { backgroundColor: colors.surface }]}
                  onPress={handleCancel}
                  accessibilityLabel="Cancel emergency"
                  accessibilityRole="button"
                >
                  <Text style={[styles.cancelButtonText, { color: colors.text }]}>
                    CANCEL
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Recording/Transcribing indicator */}
        {(isRecording || isTranscribing) && (
          <View style={[styles.recordingIndicator, { backgroundColor: colors.emergency }]}> 
            <FontAwesome name="microphone" size={20} color={colors.background} />
            <Text style={[styles.recordingText, { color: colors.background }]}> 
              {isRecording
                ? '🔴 Recording active. Tap once to send, double tap to go home.'
                : 'Processing...'}
            </Text>
          </View>
        )}

        {/* Hint */}
        {!isActivated && !isRecording && !isTranscribing && (
          <View style={styles.hintContainer}>
            <Text style={[styles.hintText, { color: colors.textMuted }]}> 
              Tap once to send after recording starts, double tap to go home
            </Text>
          </View>
        )}

        {/* Contact Management */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.addContactButton, { backgroundColor: colors.surfaceElevated }]}
          onPress={() => setShowContactModal(true)}
          accessibilityLabel="Add emergency contact"
          accessibilityRole="button"
        >
          <FontAwesome name="plus" size={24} color={colors.primary} />
          <Text style={[styles.addContactText, { color: colors.text }]}>
            Add Contact
          </Text>
        </TouchableOpacity>

        {/* Contact list */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.contactList}>
          {emergency.contacts.map((contact) => (
            <View
              key={contact.id}
              style={[styles.contactItem, { backgroundColor: colors.surface }]}
            >
              <FontAwesome name="user" size={16} color={colors.primary} />
              <Text style={[styles.contactText, { color: colors.text }]} numberOfLines={1}>
                {contact.phoneNumber}
              </Text>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Add Contact Modal */}
      <Modal
        visible={showContactModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowContactModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Add Emergency Contact
            </Text>
            
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
              placeholder="Name (optional)"
              placeholderTextColor={colors.textMuted}
              value={newContactName}
              onChangeText={setNewContactName}
            />
            
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
              placeholder="Phone Number"
              placeholderTextColor={colors.textMuted}
              value={newContactPhone}
              onChangeText={setNewContactPhone}
              keyboardType="phone-pad"
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.textMuted }]}
                onPress={() => {
                  setShowContactModal(false);
                  setNewContactName('');
                  setNewContactPhone('');
                }}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.primary }]}
                onPress={handleAddContact}
              >
                <Text style={styles.modalButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mainArea: {
    flex: 1,
  },
  header: {
    padding: Spacing.lg,
    alignItems: 'center',
  },
  headerText: {
    fontSize: FontSizes.xlarge,
    fontWeight: 'bold',
  },
  subHeaderText: {
    fontSize: FontSizes.medium,
    marginTop: Spacing.xs,
  },
  buttonContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  sosButton: {
    width: TouchTargets.sos,
    height: TouchTargets.sos,
    borderRadius: TouchTargets.sos / 2,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#FF0000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  sosButtonText: {
    fontSize: FontSizes.giant,
    fontWeight: 'bold',
    marginTop: Spacing.sm,
  },
  sosButtonSubtext: {
    fontSize: FontSizes.medium,
    fontWeight: '600',
  },
  countdownContainer: {
    width: TouchTargets.sos,
    height: TouchTargets.sos,
    borderRadius: TouchTargets.sos / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countdownText: {
    fontSize: 120,
    fontWeight: 'bold',
  },
  countdownLabel: {
    fontSize: FontSizes.large,
    fontWeight: '600',
  },
  cancelButton: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Spacing.md,
  },
  cancelButtonText: {
    fontSize: FontSizes.large,
    fontWeight: 'bold',
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  recordingText: {
    fontSize: FontSizes.medium,
    fontWeight: '600',
  },
  hintContainer: {
    alignItems: 'center',
    padding: Spacing.md,
  },
  hintText: {
    fontSize: FontSizes.small,
    textAlign: 'center',
  },
  footer: {
    padding: Spacing.md,
  },
  addContactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    borderRadius: Spacing.md,
    gap: Spacing.sm,
  },
  addContactText: {
    fontSize: FontSizes.medium,
    fontWeight: '600',
  },
  contactList: {
    marginTop: Spacing.sm,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: Spacing.sm,
    marginRight: Spacing.sm,
    gap: Spacing.xs,
  },
  contactText: {
    fontSize: FontSizes.small,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalContent: {
    width: '100%',
    borderRadius: Spacing.lg,
    padding: Spacing.xl,
  },
  modalTitle: {
    fontSize: FontSizes.xlarge,
    fontWeight: 'bold',
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  input: {
    borderRadius: Spacing.md,
    padding: Spacing.md,
    fontSize: FontSizes.medium,
    marginBottom: Spacing.md,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  modalButton: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: Spacing.md,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: FontSizes.medium,
    fontWeight: 'bold',
  },
});

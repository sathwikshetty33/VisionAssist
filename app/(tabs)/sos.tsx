/**
 * SOS Emergency Screen
 * Large accessible emergency button with voice activation
 * Voice-to-SMS: Record audio, transcribe with Whisper, send via SMS
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Modal,
  useColorScheme,
  Linking,
  ScrollView,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import Colors, { FontSizes, Spacing, TouchTargets } from '@/constants/Colors';
import { useHaptics } from '@/hooks/useHaptics';
import { useVoiceAssistant } from '@/hooks/useVoiceAssistant';
import { useEmergencyContact } from '@/hooks/useEmergencyContact';

const COUNTDOWN_SECONDS = 5;
const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY || '';

export default function SOSScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'light' ? 'light' : 'dark'];
  
  const haptics = useHaptics();
  const voice = useVoiceAssistant();
  const emergency = useEmergencyContact();
  
  const [isActivated, setIsActivated] = useState(false);
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [isSending, setIsSending] = useState(false);
  
  // Contact modal
  const [showContactModal, setShowContactModal] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  
  // Voice message
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);

  // Request audio permission on mount
  useEffect(() => {
    (async () => {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
    })();
  }, []);

  // Announce screen on mount
  useEffect(() => {
    voice.announce('SOS Emergency screen. Tap SOS for help. Hold anywhere to record voice message.');
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
      voice.announce('Emergency alert sent. Help is on the way.');
      haptics.success();
    } else {
      voice.announce('Could not send alert. Please add emergency contacts.');
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
    voice.emergencyAnnounce(`Emergency alert in ${COUNTDOWN_SECONDS} seconds. Tap cancel to stop.`);
  }, [isActivated]);

  const handleCancel = useCallback(() => {
    setIsActivated(false);
    setCountdown(COUNTDOWN_SECONDS);
    haptics.cancel();
    haptics.mediumImpact();
    voice.quickFeedback('Cancelled');
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
    
    voice.quickFeedback('Contact added');
    haptics.success();
    setShowContactModal(false);
    setNewContactName('');
    setNewContactPhone('');
  };

  const startRecording = async () => {
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
      voice.quickFeedback('Recording');

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
      voice.announce('Could not start recording');
    }
  };

  const stopRecording = async () => {
    if (!recordingRef.current) return;

    try {
      setIsRecording(false);
      haptics.lightImpact();
      
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (uri) {
        await transcribeAndSend(uri);
      }
    } catch (err) {
      console.error('Failed to stop recording:', err);
      voice.announce('Recording failed');
    }
  };

  const transcribeAndSend = async (audioUri: string) => {
    if (emergency.contacts.length === 0) {
      voice.announce('Please add an emergency contact first');
      return;
    }

    setIsTranscribing(true);
    voice.quickFeedback('Processing');

    try {
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
        throw new Error(`Whisper API error: ${response.status}`);
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
      voice.announce('Could not process voice message. Please try again.');
    } finally {
      setIsTranscribing(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Pressable 
        style={styles.mainArea}
        onPressIn={startRecording}
        onPressOut={stopRecording}
        disabled={isActivated || isTranscribing}
      >
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
              {isRecording ? '🔴 Recording... Release to send' : 'Processing...'}
            </Text>
          </View>
        )}

        {/* Hint */}
        {!isActivated && !isRecording && !isTranscribing && (
          <View style={styles.hintContainer}>
            <Text style={[styles.hintText, { color: colors.textMuted }]}>
              Hold anywhere to record voice message
            </Text>
          </View>
        )}
      </Pressable>

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

/**
 * SOS Emergency Screen
 * Large accessible emergency button with voice activation
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Alert,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import Colors, { FontSizes, Spacing, TouchTargets } from '@/constants/Colors';
import { useHaptics } from '@/hooks/useHaptics';
import { useVoiceAssistant } from '@/hooks/useVoiceAssistant';
import { useEmergencyContact } from '@/hooks/useEmergencyContact';

const COUNTDOWN_SECONDS = 5;

export default function SOSScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'light' ? 'light' : 'dark'];
  
  const haptics = useHaptics();
  const voice = useVoiceAssistant();
  const emergency = useEmergencyContact();
  
  const [isActivated, setIsActivated] = useState(false);
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [isSending, setIsSending] = useState(false);

  // Announce screen on mount
  useEffect(() => {
    voice.announce('SOS Emergency screen. Press the large button to activate emergency alert.');
  }, []);

  // Countdown timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
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
    
    // Send SMS and make call
    const smsSent = await emergency.sendSOSMessage();
    const callMade = await emergency.callEmergencyContact();
    
    if (smsSent || callMade) {
      voice.announce('Emergency alert sent. Help is on the way.');
      haptics.success();
    } else {
      voice.announce('Could not send alert. Please add emergency contacts in settings.');
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
    Alert.prompt(
      'Add Emergency Contact',
      'Enter phone number:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add',
          onPress: async (phoneNumber: string | undefined) => {
            if (phoneNumber) {
              await emergency.addContact({
                name: 'Emergency Contact',
                phoneNumber,
              });
              voice.quickFeedback('Contact added');
              haptics.success();
            }
          },
        },
      ],
      'plain-text'
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text
          style={[styles.headerText, { color: colors.text }]}
          accessibilityRole="header"
        >
          Emergency SOS
        </Text>
        <Text style={[styles.subHeaderText, { color: colors.textSecondary }]}>
          {emergency.contacts.length} emergency contacts set
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

      {/* Contact Management */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.addContactButton, { backgroundColor: colors.surfaceElevated }]}
          onPress={handleAddContact}
          accessibilityLabel="Add emergency contact"
          accessibilityRole="button"
        >
          <FontAwesome name="plus" size={24} color={colors.primary} />
          <Text style={[styles.addContactText, { color: colors.text }]}>
            Add Emergency Contact
          </Text>
        </TouchableOpacity>
        
        {/* Contact list */}
        {emergency.contacts.map((contact) => (
          <View
            key={contact.id}
            style={[styles.contactItem, { backgroundColor: colors.surface }]}
          >
            <FontAwesome name="user" size={20} color={colors.primary} />
            <Text style={[styles.contactText, { color: colors.text }]}>
              {contact.name}: {contact.phoneNumber}
            </Text>
          </View>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
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
  footer: {
    padding: Spacing.lg,
  },
  addContactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
    borderRadius: Spacing.md,
    gap: Spacing.md,
  },
  addContactText: {
    fontSize: FontSizes.medium,
    fontWeight: '600',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Spacing.sm,
    marginTop: Spacing.sm,
    gap: Spacing.md,
  },
  contactText: {
    fontSize: FontSizes.medium,
  },
});

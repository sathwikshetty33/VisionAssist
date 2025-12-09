/**
 * Home Screen - Voice Assistant
 * Main hub for voice-controlled interactions
 */

import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  useColorScheme,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import Colors, { FontSizes, Spacing, TouchTargets } from '@/constants/Colors';
import { useHaptics } from '@/hooks/useHaptics';
import { useVoiceAssistant } from '@/hooks/useVoiceAssistant';
import { useGestureNavigation } from '@/hooks/useGestureNavigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { LANGUAGES, Language } from '@/services/translations';

interface QuickAction {
  id: string;
  icon: React.ComponentProps<typeof FontAwesome>['name'];
  label: string;
  hint: string;
  route: string;
  color: string;
}

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'light' ? 'light' : 'dark'];
  const router = useRouter();
  
  const haptics = useHaptics();
  const voice = useVoiceAssistant();
  const gesture = useGestureNavigation();
  const { language, setLanguage, t, voiceCode, languageName } = useLanguage();

  const quickActions: QuickAction[] = [
    {
      id: 'camera',
      icon: 'camera',
      label: 'Describe Scene',
      hint: 'Take a photo and hear what\'s around you',
      route: '/camera',
      color: colors.primary,
    },
    {
      id: 'currency',
      icon: 'money',
      label: 'Scan Currency',
      hint: 'Identify currency notes',
      route: '/currency',
      color: colors.secondary,
    },
    {
      id: 'sos',
      icon: 'exclamation-triangle',
      label: 'Emergency SOS',
      hint: 'Send emergency alert',
      route: '/sos',
      color: colors.emergency,
    },
  ];

  // Sync voice language with context on mount and when it changes
  useEffect(() => {
    voice.setCurrentLanguage(LANGUAGES[language].voiceCode);
  }, [language]);

  useEffect(() => {
    // Welcome message on app load (delay to let language sync)
    const timer = setTimeout(() => {
      voice.announce(t('welcome') + '. ' + t('doubleTapChat') + ', ' + t('tripleTapSOS') + ', ' + t('quadTapCurrency'));
    }, 800);
    return () => clearTimeout(timer);
  }, [language]);

  const handleQuickAction = (action: QuickAction) => {
    haptics.mediumImpact();
    voice.quickFeedback(t(action.id === 'camera' ? 'describeScene' : action.id === 'currency' ? 'scanCurrency' : 'emergencySOS'));
    router.push(action.route as any);
  };

  const handleLanguageChange = (lang: Language) => {
    haptics.selection();
    setLanguage(lang);
    voice.setCurrentLanguage(LANGUAGES[lang].voiceCode);
    voice.quickFeedback(LANGUAGES[lang].nativeName);
  };

  const speakHelp = () => {
    haptics.lightImpact();
    voice.announce(
      'Vision Assist has four main features. ' +
      'First, Describe Scene takes a photo and tells you what\'s in it. ' +
      'Second, Scan Currency identifies money notes. ' +
      'Third, Emergency SOS sends alerts to your contacts. ' +
      'Fourth, you can change my voice accent in settings below.'
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Pressable style={styles.gestureArea} onPress={gesture.handleTap}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
          <Text 
            style={[styles.title, { color: colors.text }]}
            accessibilityRole="header"
          >
            Vision Assist
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Your AI-powered visual assistant
          </Text>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Quick Actions
          </Text>
          
          {quickActions.map((action) => (
            <TouchableOpacity
              key={action.id}
              style={[styles.actionButton, { 
                backgroundColor: colors.surface,
                borderLeftColor: action.color,
              }]}
              onPress={() => handleQuickAction(action)}
              accessibilityLabel={action.label}
              accessibilityHint={action.hint}
              accessibilityRole="button"
            >
              <View style={[styles.actionIconContainer, { backgroundColor: action.color + '20' }]}>
                <FontAwesome name={action.icon} size={32} color={action.color} />
              </View>
              <View style={styles.actionTextContainer}>
                <Text style={[styles.actionLabel, { color: colors.text }]}>
                  {action.label}
                </Text>
                <Text style={[styles.actionHint, { color: colors.textSecondary }]}>
                  {action.hint}
                </Text>
              </View>
              <FontAwesome name="chevron-right" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Language Settings */}
        <View style={styles.settingsContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Language / भाषा / ಭಾಷೆ
          </Text>
          
          <View style={styles.languageGrid}>
            {(['en', 'hi', 'kn'] as Language[]).map((lang) => (
              <TouchableOpacity
                key={lang}
                style={[
                  styles.languageButton,
                  { 
                    backgroundColor: language === lang ? colors.primary : colors.surface,
                    borderColor: language === lang ? colors.primary : colors.border,
                  }
                ]}
                onPress={() => handleLanguageChange(lang)}
                accessibilityLabel={`Select ${LANGUAGES[lang].name} language`}
                accessibilityRole="button"
              >
                <Text style={[
                  styles.languageButtonText,
                  { color: language === lang ? colors.background : colors.text }
                ]}>
                  {LANGUAGES[lang].nativeName}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Help Button */}
        <TouchableOpacity
          style={[styles.helpButton, { backgroundColor: colors.surfaceElevated }]}
          onPress={speakHelp}
          accessibilityLabel="Help"
          accessibilityHint="Hear instructions for using this app"
          accessibilityRole="button"
        >
          <FontAwesome name="question-circle" size={28} color={colors.primary} />
          <Text style={[styles.helpButtonText, { color: colors.text }]}>
            Hear App Instructions
          </Text>
        </TouchableOpacity>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textMuted }]}>
            2 taps: Chat • 3 taps: SOS • 4 taps: Currency
          </Text>
          <Text style={[styles.footerText, { color: colors.textMuted }]}>
            TalkBack/VoiceOver recommended
          </Text>
        </View>
        </ScrollView>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gestureArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
    paddingTop: Spacing.md,
  },
  title: {
    fontSize: FontSizes.xxlarge,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: FontSizes.medium,
    marginTop: Spacing.xs,
  },
  sectionTitle: {
    fontSize: FontSizes.large,
    fontWeight: '600',
    marginBottom: Spacing.md,
  },
  actionsContainer: {
    marginBottom: Spacing.xl,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: Spacing.md,
    marginBottom: Spacing.md,
    borderLeftWidth: 4,
    minHeight: TouchTargets.large,
  },
  actionIconContainer: {
    width: TouchTargets.medium,
    height: TouchTargets.medium,
    borderRadius: TouchTargets.medium / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionTextContainer: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  actionLabel: {
    fontSize: FontSizes.large,
    fontWeight: '600',
  },
  actionHint: {
    fontSize: FontSizes.medium,
    marginTop: Spacing.xs,
  },
  settingsContainer: {
    marginBottom: Spacing.xl,
  },
  languageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  languageButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Spacing.md,
    borderWidth: 2,
    minHeight: TouchTargets.minimum,
    justifyContent: 'center',
  },
  languageButtonText: {
    fontSize: FontSizes.large,
    fontWeight: '600',
  },
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
    borderRadius: Spacing.md,
    gap: Spacing.md,
    minHeight: TouchTargets.large,
  },
  helpButtonText: {
    fontSize: FontSizes.large,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    marginTop: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
  footerText: {
    fontSize: FontSizes.small,
    marginTop: Spacing.xs,
  },
});

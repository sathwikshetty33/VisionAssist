import React from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';
import { useColorScheme } from 'react-native';

import Colors from '@/constants/Colors';

// Accessible tab bar icon with larger size
function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={32} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'light' ? 'light' : 'dark'];

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.tabIconDefault,
        tabBarStyle: {
          backgroundColor: colors.tabBarBackground,
          borderTopColor: colors.border,
          height: 90,
          paddingBottom: 25,
          paddingTop: 10,
        },
        tabBarLabelStyle: {
          fontSize: 14,
          fontWeight: '600',
        },
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontSize: 24,
          fontWeight: 'bold',
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Assistant',
          tabBarIcon: ({ color }) => <TabBarIcon name="microphone" color={color} />,
          tabBarAccessibilityLabel: 'Voice Assistant. Double tap to open.',
        }}
      />
      <Tabs.Screen
        name="camera"
        options={{
          title: 'Camera',
          tabBarIcon: ({ color }) => <TabBarIcon name="camera" color={color} />,
          tabBarAccessibilityLabel: 'Image Recognition Camera. Double tap to open.',
        }}
      />
      <Tabs.Screen
        name="currency"
        options={{
          title: 'Currency',
          tabBarIcon: ({ color }) => <TabBarIcon name="money" color={color} />,
          tabBarAccessibilityLabel: 'Currency Detection. Double tap to open.',
        }}
      />
      <Tabs.Screen
        name="sos"
        options={{
          title: 'SOS',
          tabBarIcon: ({ color }) => <TabBarIcon name="exclamation-triangle" color={color} />,
          tabBarAccessibilityLabel: 'Emergency SOS. Double tap to open.',
          tabBarLabelStyle: {
            fontSize: 16,
            fontWeight: 'bold',
            color: colors.emergency,
          },
        }}
      />
    </Tabs>
  );
}

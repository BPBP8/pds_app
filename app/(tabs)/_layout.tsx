import { Tabs, router } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet, View, TouchableOpacity } from 'react-native';
import { BlurView } from 'expo-blur';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';



export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#FF2D55', // Vibrant Pink Active Color
        tabBarInactiveTintColor: '#A0A0A5',
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: 'bold',
          marginTop: -2,
        },
        tabBarStyle: {
          backgroundColor: '#0F0F12',
          borderTopWidth: 1,
          borderTopColor: '#1C1C20',
          elevation: 0,
          height: 85,
          paddingBottom: 25,
          paddingTop: 10,
        },
        tabBarBackground: () => 
          Platform.OS === 'ios' ? (
            <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
          ) : null,
      }}>
      <Tabs.Screen
        name="inspire"
        options={{
          title: '灵感',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="sparkles" color={color} />,
        }}
      />
      
      {/* Hide the un-designed new-post feature from the tab bar */}
      <Tabs.Screen
        name="new-post"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="guides"
        options={{
          title: '攻略',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="book.fill" color={color} />,
        }}
      />
      
      <Tabs.Screen
        name="locations"
        options={{
          title: '机位',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="location.fill" color={color} />,
        }}
      />

      {/* Hide tutorials from tab bar - accessed via Inspire tab */}
      <Tabs.Screen
        name="tutorials"
        options={{
          href: null,
        }}
      />

      {/* Hide questions from tab bar - accessed via Guides tab */}
      <Tabs.Screen
        name="questions"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: '我的',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}


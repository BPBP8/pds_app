import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';



export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#FF5A3C',
        tabBarInactiveTintColor: '#A2A2A7',
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#EFEFF1',
          elevation: 0,
          height: 78,
          paddingBottom: 16,
          paddingTop: 12,
        },
        tabBarBackground: () => 
          Platform.OS === 'ios' ? (
            <BlurView intensity={85} tint="light" style={StyleSheet.absoluteFill} />
          ) : null,
      }}>
      <Tabs.Screen
        name="shoot"
        options={{
          title: '拍点啥',
          tabBarAccessibilityLabel: '拍点啥，浏览拍摄灵感',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="sparkles" color={color} />,
        }}
      />

      <Tabs.Screen name="inspire" options={{ href: null }} />
      
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
          title: '用啥拍',
          tabBarAccessibilityLabel: '用啥拍，查看设备推荐',
          tabBarIcon: ({ color }) => <IconSymbol size={27} name="camera.fill" color={color} />,
        }}
      />
      
      <Tabs.Screen
        name="locations"
        options={{
          title: '怎么拍',
          tabBarAccessibilityLabel: '怎么拍，查看拍摄方法',
          tabBarIcon: ({ color }) => <IconSymbol size={27} name="book.fill" color={color} />,
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
          tabBarAccessibilityLabel: '我的个人中心',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}


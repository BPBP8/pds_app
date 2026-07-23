import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { Platform, View, StyleSheet } from 'react-native';

import { SavedShotsProvider } from '@/src/saved-shots-context';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const content = (
    <SavedShotsProvider>
      <ThemeProvider value={DarkTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style="light" />
      </ThemeProvider>
    </SavedShotsProvider>
  );

  if (Platform.OS === 'web') {
    return (
      <View style={styles.webContainer}>
        <View style={styles.phoneWrapper}>
          <View style={styles.notch} />
          <View style={styles.phoneContent}>
            {content}
          </View>
        </View>
      </View>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  webContainer: {
    flex: 1,
    backgroundColor: '#000', // Dark outer background for web
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  phoneWrapper: {
    width: '100%',
    maxWidth: 390,
    height: '100%',
    maxHeight: 844,
    backgroundColor: '#0F0F12',
    borderRadius: 40,
    borderWidth: 8,
    borderColor: '#222',
    overflow: 'hidden',
    shadowColor: '#FF2D55',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 30,
    position: 'relative',
  },
  notch: {
    position: 'absolute',
    top: -2,
    left: '50%',
    transform: [{ translateX: -75 }],
    width: 150,
    height: 30,
    backgroundColor: '#222',
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    zIndex: 1000,
  },
  phoneContent: {
    flex: 1,
    borderRadius: 38,
    overflow: 'hidden',
    paddingTop: 40,
  }
});

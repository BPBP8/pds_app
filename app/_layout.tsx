import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { Platform, View, StyleSheet } from 'react-native';

import { SavedShotsProvider } from '@/src/saved-shots-context';
import { AuthProvider } from '@/src/auth-context';
import { AppPreferencesProvider } from '@/src/app-preferences-context';
import { OnboardingTourProvider } from '@/src/onboarding-tour-context';
import { OnboardingTourOverlay } from '@/components/onboarding-tour-overlay';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const content = (
    <AuthProvider>
      <AppPreferencesProvider>
        <SavedShotsProvider>
          <OnboardingTourProvider>
            <ThemeProvider value={DefaultTheme}>
              <View style={styles.appRoot}>
                <Stack>
                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                  <Stack.Screen name="modal" options={{ presentation: 'modal', headerShown: false }} />
                  <Stack.Screen name="auth" options={{ presentation: 'modal', headerShown: false }} />
                </Stack>
                <StatusBar style="dark" />
                <OnboardingTourOverlay />
              </View>
            </ThemeProvider>
          </OnboardingTourProvider>
        </SavedShotsProvider>
      </AppPreferencesProvider>
    </AuthProvider>
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
  appRoot: {
    flex: 1,
  },
  webContainer: {
    flex: 1,
    backgroundColor: '#DDD8CF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  phoneWrapper: {
    width: '100%',
    maxWidth: 410,
    height: '100%',
    maxHeight: 844,
    backgroundColor: '#FFFFFF',
    borderRadius: 36,
    borderWidth: 6,
    borderColor: '#252525',
    overflow: 'hidden',
    shadowColor: '#1C1C1E',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 34,
    position: 'relative',
  },
  notch: {
    position: 'absolute',
    top: -6,
    left: '50%',
    transform: [{ translateX: -75 }],
    width: 150,
    height: 30,
    backgroundColor: '#252525',
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    zIndex: 1000,
  },
  phoneContent: {
    flex: 1,
    borderRadius: 30,
    overflow: 'hidden',
    paddingTop: 22,
  }
});

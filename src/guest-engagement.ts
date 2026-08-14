import AsyncStorage from '@react-native-async-storage/async-storage';

const GUEST_BROWSE_KEY = 'pds:guest-browse-count:v1';
const LOGIN_THRESHOLD = 8;

/**
 * Counts deliberate work-detail opens for signed-out visitors. Once someone has
 * explored enough work to show clear intent, the requested detail is resumed
 * after sign-in instead of losing their place.
 */
export async function shouldRequestLoginForBrowse() {
  try {
    const stored = await AsyncStorage.getItem(GUEST_BROWSE_KEY);
    const current = Number.parseInt(stored ?? '0', 10);
    const next = Number.isFinite(current) ? Math.min(current + 1, LOGIN_THRESHOLD) : 1;
    await AsyncStorage.setItem(GUEST_BROWSE_KEY, String(next));
    return next >= LOGIN_THRESHOLD;
  } catch {
    // A local storage failure should never stop normal browsing.
    return false;
  }
}

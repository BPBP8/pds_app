import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

export type DeviceKind = 'phone' | 'camera' | 'action' | 'drone';

export type DeviceOption = {
  id: string;
  name: string;
  shortName: string;
  description: string;
  kind: DeviceKind;
};

export type Coordinates = {
  latitude: number;
  longitude: number;
};

export type OnboardingStep =
  | 'choose-category'
  | 'open-shot'
  | 'review-plan'
  | 'save-shot'
  | 'open-saved'
  | 'done';

export const DEVICE_OPTIONS: readonly DeviceOption[] = [
  {
    id: 'this-phone',
    name: '这台手机',
    shortName: '本机手机',
    description: '优先推荐手机主摄、长焦与夜景模式能完成的作品',
    kind: 'phone',
  },
  {
    id: 'pro-phone',
    name: '带长焦的手机',
    shortName: '长焦手机',
    description: '适合人像、建筑细节和不打扰主体的远距离拍摄',
    kind: 'phone',
  },
  {
    id: 'mirrorless',
    name: '微单 / 单反',
    shortName: '相机',
    description: '优先展示可换镜头、长曝光和高速追焦方案',
    kind: 'camera',
  },
  {
    id: 'action-camera',
    name: '运动相机',
    shortName: '运动相机',
    description: '适合第一视角、超广角和运动场景',
    kind: 'action',
  },
  {
    id: 'drone',
    name: '无人机',
    shortName: '无人机',
    description: '只推荐明确适合航拍表达的场景；飞行前需自行核实规定',
    kind: 'drone',
  },
] as const;

type LocationState = 'idle' | 'requesting' | 'ready' | 'denied' | 'error';

type AppPreferencesValue = {
  city: '北京';
  device: DeviceOption;
  deviceId: string;
  hydrated: boolean;
  onboardingStep: OnboardingStep;
  onboardingPostId?: string;
  coordinates?: Coordinates;
  locationState: LocationState;
  setDeviceId: (id: string) => Promise<void>;
  setOnboardingStep: (step: OnboardingStep, postId?: string | null) => Promise<void>;
  restartOnboarding: () => Promise<void>;
  finishOnboarding: () => Promise<void>;
  requestLocation: () => Promise<void>;
};

const DEVICE_KEY = 'pds:device:v1';
const ONBOARDING_KEY = 'pds:onboarding:v2';
const ONBOARDING_STEPS: readonly OnboardingStep[] = [
  'choose-category',
  'open-shot',
  'review-plan',
  'save-shot',
  'open-saved',
  'done',
];

const AppPreferencesContext = createContext<AppPreferencesValue | null>(null);

export function AppPreferencesProvider({ children }: { children: React.ReactNode }) {
  const [deviceId, setDeviceIdState] = useState('this-phone');
  const [hydrated, setHydrated] = useState(false);
  const [onboardingStep, setOnboardingStepState] =
    useState<OnboardingStep>('choose-category');
  const [onboardingPostId, setOnboardingPostId] = useState<string>();
  const [coordinates, setCoordinates] = useState<Coordinates>();
  const [locationState, setLocationState] = useState<LocationState>('idle');
  const onboardingStepRef = useRef<OnboardingStep>('choose-category');
  const onboardingPostIdRef = useRef<string | undefined>(undefined);
  const onboardingWriteQueue = useRef(Promise.resolve());

  useEffect(() => {
    let active = true;

    void Promise.all([AsyncStorage.getItem(DEVICE_KEY), AsyncStorage.getItem(ONBOARDING_KEY)])
      .then(([storedDeviceId, storedOnboarding]) => {
        if (!active) return;
        if (storedDeviceId && DEVICE_OPTIONS.some((option) => option.id === storedDeviceId)) {
          setDeviceIdState(storedDeviceId);
        }
        if (storedOnboarding) {
          try {
            const parsed = JSON.parse(storedOnboarding) as {
              step?: OnboardingStep;
              postId?: string;
            };
            if (parsed.step && ONBOARDING_STEPS.includes(parsed.step)) {
              onboardingStepRef.current = parsed.step;
              onboardingPostIdRef.current =
                typeof parsed.postId === 'string' ? parsed.postId : undefined;
              setOnboardingStepState(parsed.step);
              setOnboardingPostId(onboardingPostIdRef.current);
            }
          } catch {
            if (ONBOARDING_STEPS.includes(storedOnboarding as OnboardingStep)) {
              onboardingStepRef.current = storedOnboarding as OnboardingStep;
              setOnboardingStepState(onboardingStepRef.current);
            }
          }
        }
      })
      .finally(() => {
        if (active) setHydrated(true);
      });

    return () => {
      active = false;
    };
  }, []);

  const setDeviceId = useCallback(async (id: string) => {
    if (!DEVICE_OPTIONS.some((option) => option.id === id)) return;
    setDeviceIdState(id);
    await AsyncStorage.setItem(DEVICE_KEY, id);
  }, []);

  const setOnboardingStep = useCallback(async (
    step: OnboardingStep,
    postId?: string | null,
  ) => {
    const nextPostId =
      postId === null ? undefined : postId ?? onboardingPostIdRef.current;
    onboardingStepRef.current = step;
    onboardingPostIdRef.current = nextPostId;
    setOnboardingStepState(step);
    setOnboardingPostId(nextPostId);
    const payload = JSON.stringify({ step, postId: nextPostId });
    onboardingWriteQueue.current = onboardingWriteQueue.current
      .catch(() => undefined)
      .then(() => AsyncStorage.setItem(ONBOARDING_KEY, payload));
    await onboardingWriteQueue.current;
  }, []);

  const restartOnboarding = useCallback(
    () => setOnboardingStep('choose-category', null),
    [setOnboardingStep],
  );

  const finishOnboarding = useCallback(
    () => setOnboardingStep('done', null),
    [setOnboardingStep],
  );

  const requestLocation = useCallback(async () => {
    if (locationState === 'requesting') return;
    setLocationState('requesting');

    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        setLocationState('denied');
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setCoordinates({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
      setLocationState('ready');
    } catch {
      setLocationState('error');
    }
  }, [locationState]);

  const device =
    DEVICE_OPTIONS.find((option) => option.id === deviceId) ?? DEVICE_OPTIONS[0];

  const value = useMemo<AppPreferencesValue>(
    () => ({
      city: '北京',
      device,
      deviceId,
      hydrated,
      onboardingStep,
      onboardingPostId,
      coordinates,
      locationState,
      setDeviceId,
      setOnboardingStep,
      restartOnboarding,
      finishOnboarding,
      requestLocation,
    }),
    [
      coordinates,
      device,
      deviceId,
      finishOnboarding,
      hydrated,
      locationState,
      onboardingPostId,
      onboardingStep,
      requestLocation,
      restartOnboarding,
      setDeviceId,
      setOnboardingStep,
    ],
  );

  return (
    <AppPreferencesContext.Provider value={value}>
      {children}
    </AppPreferencesContext.Provider>
  );
}

export function useAppPreferences() {
  const value = useContext(AppPreferencesContext);
  if (!value) {
    throw new Error('useAppPreferences must be used inside AppPreferencesProvider');
  }
  return value;
}

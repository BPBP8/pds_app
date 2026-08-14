import { type Href, usePathname, useRouter } from 'expo-router';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { LayoutChangeEvent, View } from 'react-native';

export type TourTargetId =
  | 'shoot-category'
  | 'shoot-featured-post'
  | 'shot-method'
  | 'shot-save'
  | 'profile-saved';

export type TourStepIndex = 0 | 1 | 2 | 3 | 4;

export type TourStep = {
  id: string;
  targetId: TourTargetId;
  title: string;
  description: string;
  route: '/shoot' | '/profile' | `/shot/${string}`;
  padding?: number;
  radius?: number;
};

type TargetRegistration = {
  node: View;
  prepare?: () => void | Promise<void>;
  token: symbol;
};

type TourTargetOptions = {
  /**
   * Use this to bring a target into view before it is measured, for example by
   * calling scrollTo on the page's ScrollView.
   */
  prepare?: () => void | Promise<void>;
  onLayout?: (event: LayoutChangeEvent) => void;
};

export type TourTargetProps = {
  ref: (node: View | null) => void;
  collapsable: false;
  onLayout: (event: LayoutChangeEvent) => void;
};

type StartTourOptions = {
  postId?: string;
  originHref?: string;
};

type OnboardingTourContextValue = {
  active: boolean;
  stepIndex: TourStepIndex;
  postId: string;
  categoryOverride: string | null;
  temporarySaved: boolean;
  currentStep: TourStep;
  steps: readonly TourStep[];
  transitioning: boolean;
  exitConfirmationVisible: boolean;
  completionToastVisible: boolean;
  targetVersion: number;
  startTour: (options?: StartTourOptions | string) => void;
  next: () => void;
  previous: () => void;
  requestSkip: () => void;
  continueTour: () => void;
  exitTour: () => void;
  completeTour: () => void;
  registerTarget: (
    id: TourTargetId,
    token: symbol,
    node: View | null,
    prepare?: () => void | Promise<void>
  ) => void;
  notifyTargetLayout: () => void;
  getTarget: (id: TourTargetId) => TargetRegistration | undefined;
};

const DEFAULT_POST_ID = 'beijing-forbidden-city-rain';
const DEFAULT_ORIGIN = '/shoot';
const TRANSITION_MS = 150;
const TOAST_MS = 1800;
const TARGET_CLEANUP_DELAY_MS = 50;

const OnboardingTourContext = createContext<OnboardingTourContextValue | null>(null);

function buildSteps(postId: string): readonly TourStep[] {
  return [
    {
      id: 'choose-category',
      targetId: 'shoot-category',
      title: '选择拍摄主题',
      description: '先选一个感兴趣的主题，首页会展示相关拍摄灵感。',
      route: '/shoot',
      padding: 6,
      radius: 16,
    },
    {
      id: 'open-work',
      targetId: 'shoot-featured-post',
      title: '打开一张作品',
      description: '进入作品，查看它的地点、设备、参数和完整拍法。',
      route: '/shoot',
      padding: 6,
      radius: 18,
    },
    {
      id: 'review-method',
      targetId: 'shot-method',
      title: '查看拍摄方法',
      description: '按步骤了解机位、构图和现场拍摄方法。',
      route: `/shot/${postId}`,
      padding: 8,
      radius: 18,
    },
    {
      id: 'save-work',
      targetId: 'shot-save',
      title: '加入想拍清单',
      description: '保存这张照片，需要时可以快速找回。',
      route: `/shot/${postId}`,
      padding: 6,
      radius: 16,
    },
    {
      id: 'find-saved',
      targetId: 'profile-saved',
      title: '查看想拍清单',
      description: '灵感都保存在这里，准备拍摄时随时回来查看。',
      route: '/profile',
      padding: 6,
      radius: 18,
    },
  ];
}

function toHref(value: string): Href {
  return value as Href;
}

export function OnboardingTourProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const originHrefRef = useRef(DEFAULT_ORIGIN);
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const targetsRef = useRef(new Map<TourTargetId, TargetRegistration>());
  const targetCleanupTimersRef = useRef(
    new Map<TourTargetId, ReturnType<typeof setTimeout>>()
  );

  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState<TourStepIndex>(0);
  const [postId, setPostId] = useState(DEFAULT_POST_ID);
  const [categoryOverride, setCategoryOverride] = useState<string | null>(null);
  const [temporarySaved, setTemporarySaved] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [exitConfirmationVisible, setExitConfirmationVisible] = useState(false);
  const [completionToastVisible, setCompletionToastVisible] = useState(false);
  const [targetVersion, setTargetVersion] = useState(0);

  const steps = useMemo(() => buildSteps(postId), [postId]);
  const currentStep = steps[stepIndex];

  const clearTransitionTimer = useCallback(() => {
    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }
  }, []);

  const finishTransitionSoon = useCallback(() => {
    clearTransitionTimer();
    transitionTimerRef.current = setTimeout(() => {
      setTransitioning(false);
      transitionTimerRef.current = null;
    }, TRANSITION_MS);
  }, [clearTransitionTimer]);

  const replaceRoute = useCallback(
    (route: string) => {
      setTransitioning(true);
      router.replace(toHref(route));
      finishTransitionSoon();
    },
    [finishTransitionSoon, router]
  );

  const resetSessionState = useCallback(() => {
    setStepIndex(0);
    setCategoryOverride(null);
    setTemporarySaved(false);
    setExitConfirmationVisible(false);
    setTransitioning(false);
  }, []);

  const returnToOrigin = useCallback(() => {
    router.replace(toHref(originHrefRef.current || DEFAULT_ORIGIN));
  }, [router]);

  const startTour = useCallback(
    (options?: StartTourOptions | string) => {
      const normalized = typeof options === 'string' ? { postId: options } : options;
      clearTransitionTimer();

      originHrefRef.current = normalized?.originHref || pathname || DEFAULT_ORIGIN;
      setPostId(normalized?.postId || DEFAULT_POST_ID);
      setStepIndex(0);
      setCategoryOverride(null);
      setTemporarySaved(false);
      setExitConfirmationVisible(false);
      setCompletionToastVisible(false);
      setActive(true);

      if (pathname !== '/shoot') {
        replaceRoute('/shoot');
      } else {
        setTransitioning(false);
      }
    },
    [clearTransitionTimer, pathname, replaceRoute]
  );

  const completeTour = useCallback(() => {
    clearTransitionTimer();
    setActive(false);
    resetSessionState();
    returnToOrigin();

    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setCompletionToastVisible(true);
    toastTimerRef.current = setTimeout(() => {
      setCompletionToastVisible(false);
      toastTimerRef.current = null;
    }, TOAST_MS);
  }, [clearTransitionTimer, resetSessionState, returnToOrigin]);

  const next = useCallback(() => {
    if (!active || transitioning || exitConfirmationVisible) {
      return;
    }

    switch (stepIndex) {
      case 0:
        setCategoryOverride('旅行');
        setStepIndex(1);
        break;
      case 1:
        setStepIndex(2);
        replaceRoute(`/shot/${postId}`);
        break;
      case 2:
        setTemporarySaved(true);
        setStepIndex(3);
        break;
      case 3:
        setStepIndex(4);
        replaceRoute('/profile');
        break;
      case 4:
        completeTour();
        break;
    }
  }, [
    active,
    completeTour,
    exitConfirmationVisible,
    postId,
    replaceRoute,
    stepIndex,
    transitioning,
  ]);

  const previous = useCallback(() => {
    if (!active || transitioning || exitConfirmationVisible || stepIndex === 0) {
      return;
    }

    switch (stepIndex) {
      case 1:
        setCategoryOverride(null);
        setStepIndex(0);
        break;
      case 2:
        setStepIndex(1);
        replaceRoute('/shoot');
        break;
      case 3:
        setTemporarySaved(false);
        setStepIndex(2);
        break;
      case 4:
        setStepIndex(3);
        replaceRoute(`/shot/${postId}`);
        break;
    }
  }, [
    active,
    exitConfirmationVisible,
    postId,
    replaceRoute,
    stepIndex,
    transitioning,
  ]);

  const requestSkip = useCallback(() => {
    if (active && !transitioning) {
      setExitConfirmationVisible(true);
    }
  }, [active, transitioning]);

  const continueTour = useCallback(() => {
    setExitConfirmationVisible(false);
  }, []);

  const exitTour = useCallback(() => {
    clearTransitionTimer();
    setActive(false);
    resetSessionState();
    returnToOrigin();
  }, [clearTransitionTimer, resetSessionState, returnToOrigin]);

  const registerTarget = useCallback(
    (
      id: TourTargetId,
      token: symbol,
      node: View | null,
      prepare?: () => void | Promise<void>
    ) => {
      const current = targetsRef.current.get(id);

      if (node) {
        const cleanupTimer = targetCleanupTimersRef.current.get(id);
        if (cleanupTimer) {
          clearTimeout(cleanupTimer);
          targetCleanupTimersRef.current.delete(id);
        }
        targetsRef.current.set(id, { node, prepare, token });
        // Callback refs can receive a replacement host node when a virtualized
        // header re-renders. The target is still the same registration, so
        // notifying the provider again would create a render/ref feedback loop.
        if (!current || current.token !== token) {
          setTargetVersion((version) => version + 1);
        }
        return;
      }

      if (!current || current.token !== token) {
        return;
      }

      const pendingCleanup = targetCleanupTimersRef.current.get(id);
      if (pendingCleanup) {
        clearTimeout(pendingCleanup);
      }

      // Callback refs can briefly detach and reattach during a virtualized
      // header render. Give the same registration a short grace period, then
      // remove it if it did not return so cross-page measurement never keeps an
      // unmounted native host node.
      const cleanupTimer = setTimeout(() => {
        targetCleanupTimersRef.current.delete(id);
        const latest = targetsRef.current.get(id);
        if (!latest || latest.token !== token) {
          return;
        }
        targetsRef.current.delete(id);
        setTargetVersion((version) => version + 1);
      }, TARGET_CLEANUP_DELAY_MS);
      targetCleanupTimersRef.current.set(id, cleanupTimer);
    },
    []
  );

  const notifyTargetLayout = useCallback(() => {
    setTargetVersion((version) => version + 1);
  }, []);

  const getTarget = useCallback((id: TourTargetId) => targetsRef.current.get(id), []);

  useEffect(
    () => () => {
      clearTransitionTimer();
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
      for (const timer of targetCleanupTimersRef.current.values()) {
        clearTimeout(timer);
      }
      targetCleanupTimersRef.current.clear();
      targetsRef.current.clear();
    },
    [clearTransitionTimer]
  );

  const value = useMemo<OnboardingTourContextValue>(
    () => ({
      active,
      stepIndex,
      postId,
      categoryOverride,
      temporarySaved,
      currentStep,
      steps,
      transitioning,
      exitConfirmationVisible,
      completionToastVisible,
      targetVersion,
      startTour,
      next,
      previous,
      requestSkip,
      continueTour,
      exitTour,
      completeTour,
      registerTarget,
      notifyTargetLayout,
      getTarget,
    }),
    [
      active,
      categoryOverride,
      completeTour,
      completionToastVisible,
      continueTour,
      currentStep,
      exitConfirmationVisible,
      exitTour,
      getTarget,
      next,
      notifyTargetLayout,
      postId,
      previous,
      registerTarget,
      requestSkip,
      startTour,
      stepIndex,
      steps,
      targetVersion,
      temporarySaved,
      transitioning,
    ]
  );

  return (
    <OnboardingTourContext.Provider value={value}>
      {children}
    </OnboardingTourContext.Provider>
  );
}

export function useOnboardingTour() {
  const context = useContext(OnboardingTourContext);
  if (!context) {
    throw new Error('useOnboardingTour must be used inside OnboardingTourProvider');
  }
  return context;
}

export function useTourTarget(
  id: TourTargetId,
  options: TourTargetOptions = {}
): TourTargetProps {
  const { registerTarget, notifyTargetLayout } = useOnboardingTour();
  const tokenRef = useRef(Symbol(id));
  const prepareRef = useRef(options.prepare);
  const onLayoutRef = useRef(options.onLayout);
  const lastLayoutRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);

  prepareRef.current = options.prepare;
  onLayoutRef.current = options.onLayout;

  const ref = useCallback(
    (node: View | null) => {
      registerTarget(
        id,
        tokenRef.current,
        node,
        node ? () => prepareRef.current?.() : undefined
      );
    },
    [id, registerTarget]
  );

  const onLayout = useCallback(
    (event: LayoutChangeEvent) => {
      onLayoutRef.current?.(event);
      const next = event.nativeEvent.layout;
      const previous = lastLayoutRef.current;
      lastLayoutRef.current = next;
      if (
        !previous
        || Math.abs(previous.x - next.x) > 0.5
        || Math.abs(previous.y - next.y) > 0.5
        || Math.abs(previous.width - next.width) > 0.5
        || Math.abs(previous.height - next.height) > 0.5
      ) {
        notifyTargetLayout();
      }
    },
    [notifyTargetLayout]
  );

  useEffect(
    () => () => {
      registerTarget(id, tokenRef.current, null);
    },
    [id, registerTarget]
  );

  return useMemo(
    () => ({
      ref,
      collapsable: false as const,
      onLayout,
    }),
    [onLayout, ref]
  );
}

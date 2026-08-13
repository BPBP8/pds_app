import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  BackHandler,
  Easing,
  InteractionManager,
  type LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useOnboardingTour } from '@/src/onboarding-tour-context';

type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type Placement = 'above' | 'below' | 'detached';

const MASK_COLOR = 'rgba(0, 0, 0, 0.62)';
const BRAND_COLOR = '#D85331';
const SCREEN_GUTTER = 16;
const TARGET_GAP = 12;
const CARD_MAX_WIDTH = 340;
const DEFAULT_CARD_HEIGHT = 190;
const MAX_MEASURE_ATTEMPTS = 18;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

function measureInWindow(node: View): Promise<Rect | null> {
  return new Promise((resolve) => {
    if (typeof node.measureInWindow !== 'function') {
      resolve(null);
      return;
    }

    node.measureInWindow((x, y, width, height) => {
      if (
        !Number.isFinite(x) ||
        !Number.isFinite(y) ||
        !Number.isFinite(width) ||
        !Number.isFinite(height) ||
        width <= 0 ||
        height <= 0
      ) {
        resolve(null);
        return;
      }
      resolve({ x, y, width, height });
    });
  });
}

export function OnboardingTourOverlay() {
  const {
    active,
    stepIndex,
    currentStep,
    transitioning,
    exitConfirmationVisible,
    completionToastVisible,
    targetVersion,
    next,
    previous,
    requestSkip,
    continueTour,
    exitTour,
    getTarget,
  } = useOnboardingTour();
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  const overlayRef = useRef<View>(null);
  const fade = useRef(new Animated.Value(0)).current;
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const measureRunRef = useRef(0);

  const [overlayRect, setOverlayRect] = useState<Rect>({
    x: 0,
    y: 0,
    width: window.width,
    height: window.height,
  });
  const overlayRectRef = useRef(overlayRect);
  overlayRectRef.current = overlayRect;
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const [cardHeight, setCardHeight] = useState(DEFAULT_CARD_HEIGHT);

  const clearRetry = useCallback(() => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!active) {
      clearRetry();
      setTargetRect(null);
      fade.setValue(0);
      return;
    }

    const runId = ++measureRunRef.current;
    let cancelled = false;
    let interaction: ReturnType<typeof InteractionManager.runAfterInteractions> | undefined;
    let firstFrame: number | undefined;
    let secondFrame: number | undefined;

    clearRetry();
    setTargetRect(null);
    fade.stopAnimation();
    fade.setValue(0);

    const tryMeasure = async (attempt: number) => {
      if (cancelled || runId !== measureRunRef.current) {
        return;
      }

      const registration = getTarget(currentStep.targetId);
      if (!registration) {
        scheduleRetry(attempt);
        return;
      }

      if (attempt === 0) {
        try {
          await registration.prepare?.();
        } catch {
          // A failed optional scroll preparation should not break the tutorial.
        }
      }

      interaction = InteractionManager.runAfterInteractions(() => {
        firstFrame = requestAnimationFrame(() => {
          secondFrame = requestAnimationFrame(async () => {
            if (cancelled || runId !== measureRunRef.current) {
              return;
            }

            const overlayNode = overlayRef.current;
            const latestTarget = getTarget(currentStep.targetId)?.node;
            if (!overlayNode || !latestTarget) {
              scheduleRetry(attempt);
              return;
            }

            const [measuredOverlay, measuredTarget] = await Promise.all([
              measureInWindow(overlayNode),
              measureInWindow(latestTarget),
            ]);

            if (!measuredTarget || cancelled || runId !== measureRunRef.current) {
              scheduleRetry(attempt);
              return;
            }

            const container = measuredOverlay ?? overlayRectRef.current;
            const padding = currentStep.padding ?? 6;
            const localLeft = measuredTarget.x - container.x - padding;
            const localTop = measuredTarget.y - container.y - padding;
            const localRight =
              measuredTarget.x - container.x + measuredTarget.width + padding;
            const localBottom =
              measuredTarget.y - container.y + measuredTarget.height + padding;

            const x = clamp(localLeft, 0, container.width);
            const y = clamp(localTop, 0, container.height);
            const right = clamp(localRight, 0, container.width);
            const bottom = clamp(localBottom, 0, container.height);

            if (right - x < 2 || bottom - y < 2) {
              scheduleRetry(attempt);
              return;
            }

            setOverlayRect(container);
            setTargetRect({
              x,
              y,
              width: right - x,
              height: bottom - y,
            });
            Animated.timing(fade, {
              toValue: 1,
              duration: 140,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }).start();
          });
        });
      });
    };

    const scheduleRetry = (attempt: number) => {
      if (cancelled || attempt >= MAX_MEASURE_ATTEMPTS) {
        return;
      }
      retryTimerRef.current = setTimeout(() => {
        void tryMeasure(attempt + 1);
      }, 80);
    };

    void tryMeasure(0);

    return () => {
      cancelled = true;
      clearRetry();
      interaction?.cancel();
      if (firstFrame !== undefined) {
        cancelAnimationFrame(firstFrame);
      }
      if (secondFrame !== undefined) {
        cancelAnimationFrame(secondFrame);
      }
    };
    // targetVersion deliberately retriggers measurement after target layout changes.
  }, [
    active,
    clearRetry,
    currentStep,
    fade,
    getTarget,
    overlayRect.height,
    overlayRect.width,
    targetVersion,
    window.height,
    window.width,
  ]);

  useEffect(() => {
    if (!active) {
      return;
    }

    AccessibilityInfo.announceForAccessibility(
      `${currentStep.title}。${currentStep.description}。第 ${stepIndex + 1} 步，共 5 步`
    );
  }, [active, currentStep.description, currentStep.title, stepIndex]);

  useEffect(() => {
    if (!active) {
      return;
    }

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (exitConfirmationVisible) {
        continueTour();
      } else {
        requestSkip();
      }
      return true;
    });
    return () => subscription.remove();
  }, [active, continueTour, exitConfirmationVisible, requestSkip]);

  const onOverlayLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setOverlayRect((current) => {
      if (current.width === width && current.height === height) {
        return current;
      }
      return { ...current, width, height };
    });
  };

  const hole = targetRect;
  const cardWidth = Math.min(CARD_MAX_WIDTH, Math.max(0, overlayRect.width - 32));
  const safeTop = insets.top + SCREEN_GUTTER;
  const safeBottom = overlayRect.height - insets.bottom - SCREEN_GUTTER;

  const cardPlacement = useMemo(() => {
    if (!hole) {
      return {
        placement: 'detached' as Placement,
        left: SCREEN_GUTTER,
        top: clamp(
          (overlayRect.height - cardHeight) / 2,
          safeTop,
          safeBottom - cardHeight
        ),
        arrowLeft: cardWidth / 2,
      };
    }

    const left = clamp(
      hole.x + hole.width / 2 - cardWidth / 2,
      SCREEN_GUTTER,
      overlayRect.width - cardWidth - SCREEN_GUTTER
    );
    const belowTop = hole.y + hole.height + TARGET_GAP;
    const aboveTop = hole.y - TARGET_GAP - cardHeight;
    const fitsBelow = belowTop + cardHeight <= safeBottom;
    const fitsAbove = aboveTop >= safeTop;

    let placement: Placement;
    let top: number;
    if (fitsBelow) {
      placement = 'below';
      top = belowTop;
    } else if (fitsAbove) {
      placement = 'above';
      top = aboveTop;
    } else {
      placement = 'detached';
      const aboveSpace = hole.y - safeTop;
      const belowSpace = safeBottom - (hole.y + hole.height);
      top =
        aboveSpace >= belowSpace
          ? safeTop
          : clamp(safeBottom - cardHeight, safeTop, safeBottom - cardHeight);
    }

    return {
      placement,
      left,
      top,
      arrowLeft: clamp(hole.x + hole.width / 2 - left, 24, cardWidth - 24),
    };
  }, [
    cardHeight,
    cardWidth,
    hole,
    overlayRect.height,
    overlayRect.width,
    safeBottom,
    safeTop,
  ]);

  if (!active && !completionToastVisible) {
    return null;
  }

  return (
    <>
      {active ? (
        <Animated.View
          ref={overlayRef}
          onLayout={onOverlayLayout}
          pointerEvents="box-none"
          accessibilityViewIsModal
          accessibilityLiveRegion="polite"
          onAccessibilityEscape={requestSkip}
          style={[styles.overlay, { opacity: fade }]}>
          {hole ? (
            <>
              <MaskPiece style={{ left: 0, top: 0, right: 0, height: hole.y }} />
              <MaskPiece
                style={{
                  left: 0,
                  top: hole.y + hole.height,
                  right: 0,
                  bottom: 0,
                }}
              />
              <MaskPiece
                style={{
                  left: 0,
                  top: hole.y,
                  width: hole.x,
                  height: hole.height,
                }}
              />
              <MaskPiece
                style={{
                  left: hole.x + hole.width,
                  top: hole.y,
                  right: 0,
                  height: hole.height,
                }}
              />
              <Pressable
                accessible={false}
                onPress={() => undefined}
                style={[
                  styles.highlight,
                  {
                    left: hole.x,
                    top: hole.y,
                    width: hole.width,
                    height: hole.height,
                    borderRadius: currentStep.radius ?? 16,
                  },
                ]}
              />
            </>
          ) : (
            <MaskPiece style={StyleSheet.absoluteFillObject} />
          )}

          <View
            accessibilityRole="alert"
            onLayout={(event) => {
              const nextHeight = event.nativeEvent.layout.height;
              if (Math.abs(nextHeight - cardHeight) > 1) {
                setCardHeight(nextHeight);
              }
            }}
            style={[
              styles.card,
              {
                left: cardPlacement.left,
                top: cardPlacement.top,
                width: cardWidth,
                maxHeight: Math.max(160, safeBottom - safeTop),
              },
            ]}>
            {cardPlacement.placement !== 'detached' ? (
              <View
                pointerEvents="none"
                style={[
                  styles.arrow,
                  cardPlacement.placement === 'below'
                    ? styles.arrowTop
                    : styles.arrowBottom,
                  { left: cardPlacement.arrowLeft - 8 },
                ]}
              />
            ) : null}

            <View style={styles.cardHeader}>
              <Text style={styles.eyebrow}>新手教程</Text>
              <Text style={styles.progress}>{stepIndex + 1}/5</Text>
            </View>
            <Text style={styles.title}>{currentStep.title}</Text>
            <Text style={styles.description}>{currentStep.description}</Text>

            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="跳过新手教程"
                hitSlop={8}
                onPress={requestSkip}
                style={styles.textButton}>
                <Text style={styles.mutedButtonText}>跳过</Text>
              </Pressable>

              <View style={styles.rightActions}>
                {stepIndex > 0 ? (
                  <Pressable
                    accessibilityRole="button"
                    disabled={transitioning}
                    hitSlop={8}
                    onPress={previous}
                    style={styles.textButton}>
                    <Text style={styles.secondaryButtonText}>上一步</Text>
                  </Pressable>
                ) : null}
                <Pressable
                  accessibilityRole="button"
                  disabled={transitioning || !hole}
                  onPress={next}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    (transitioning || !hole) && styles.primaryButtonDisabled,
                    pressed && !transitioning && hole && styles.primaryButtonPressed,
                  ]}>
                  <Text style={styles.primaryButtonText}>
                    {stepIndex === 4 ? '完成' : '下一步'}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>

          {exitConfirmationVisible ? (
            <View
              accessibilityRole="alert"
              accessibilityViewIsModal
              style={styles.confirmationLayer}>
              <Pressable
                accessibilityLabel="继续学习"
                onPress={continueTour}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.confirmationCard}>
                <Text style={styles.confirmationTitle}>确定退出新手教程吗？</Text>
                <Text style={styles.confirmationDescription}>
                  退出后，下次会从第一步重新开始。
                </Text>
                <View style={styles.confirmationActions}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={exitTour}
                    style={styles.exitButton}>
                    <Text style={styles.exitButtonText}>退出教程</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={continueTour}
                    style={styles.continueButton}>
                    <Text style={styles.continueButtonText}>继续学习</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          ) : null}
        </Animated.View>
      ) : null}

      {completionToastVisible ? (
        <View
          accessibilityRole="alert"
          accessibilityLiveRegion="assertive"
          pointerEvents="none"
          style={[styles.toast, { bottom: insets.bottom + 76 }]}>
          <Text style={styles.toastText}>新手教程已完成</Text>
        </View>
      ) : null}
    </>
  );
}

function MaskPiece({ style }: { style: object }) {
  return <Pressable accessible={false} onPress={() => undefined} style={[styles.mask, style]} />;
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10000,
    elevation: 10000,
  },
  mask: {
    position: 'absolute',
    backgroundColor: MASK_COLOR,
  },
  highlight: {
    position: 'absolute',
    borderWidth: 3,
    borderColor: BRAND_COLOR,
    shadowColor: BRAND_COLOR,
    shadowOpacity: 0.5,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },
  card: {
    position: 'absolute',
    padding: 18,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 18,
  },
  arrow: {
    position: 'absolute',
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  arrowTop: {
    top: -8,
    borderBottomWidth: 8,
    borderBottomColor: '#FFFFFF',
  },
  arrowBottom: {
    bottom: -8,
    borderTopWidth: 8,
    borderTopColor: '#FFFFFF',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  eyebrow: {
    color: BRAND_COLOR,
    fontSize: 12,
    fontWeight: '700',
  },
  progress: {
    color: '#8C837E',
    fontSize: 12,
    fontWeight: '600',
  },
  title: {
    color: '#201D1B',
    fontSize: 19,
    fontWeight: '800',
    lineHeight: 26,
  },
  description: {
    marginTop: 7,
    color: '#665E59',
    fontSize: 14,
    lineHeight: 21,
  },
  actions: {
    minHeight: 44,
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  textButton: {
    minWidth: 44,
    minHeight: 44,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mutedButtonText: {
    color: '#98908B',
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#6E6661',
    fontSize: 14,
    fontWeight: '700',
  },
  primaryButton: {
    minWidth: 82,
    minHeight: 44,
    paddingHorizontal: 18,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BRAND_COLOR,
  },
  primaryButtonPressed: {
    opacity: 0.84,
    transform: [{ scale: 0.98 }],
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  confirmationLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.38)',
    zIndex: 20,
    elevation: 20,
  },
  confirmationCard: {
    width: '100%',
    maxWidth: 340,
    padding: 20,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOpacity: 0.2,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 22,
  },
  confirmationTitle: {
    color: '#201D1B',
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 25,
  },
  confirmationDescription: {
    marginTop: 8,
    color: '#746C67',
    fontSize: 14,
    lineHeight: 21,
  },
  confirmationActions: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  exitButton: {
    minHeight: 44,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exitButtonText: {
    color: '#9B5750',
    fontSize: 14,
    fontWeight: '700',
  },
  continueButton: {
    minHeight: 44,
    paddingHorizontal: 18,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BRAND_COLOR,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  toast: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 11000,
    elevation: 11000,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 22,
    backgroundColor: 'rgba(32, 29, 27, 0.92)',
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});

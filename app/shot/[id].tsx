import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAppPreferences } from '@/src/app-preferences-context';
import { useAuth } from '@/src/auth-context';
import { formatDistance } from '@/src/distance';
import { useOnboardingTour, useTourTarget } from '@/src/onboarding-tour-context';
import { useSavedShots } from '@/src/saved-shots-context';
import { SEED_POST_BY_ID } from '../../src/data/seed-posts';

export default function ShotDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string | string[] }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const { user } = useAuth();
  const { coordinates, device } = useAppPreferences();
  const {
    active: tourActive,
    postId: tourPostId,
    stepIndex,
    temporarySaved,
  } = useOnboardingTour();
  const methodTourTarget = useTourTarget('shot-method');
  const saveTourTarget = useTourTarget('shot-save');
  const [saving, setSaving] = useState(false);
  const [methodSectionY, setMethodSectionY] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const { hydrated, isSaved, syncError, toggle } = useSavedShots();
  const postId = Array.isArray(id) ? id[0] : id;
  const post = postId ? SEED_POST_BY_ID[postId] : undefined;
  const saved = postId ? isSaved(postId) : false;
  const displaySaved =
    tourActive && tourPostId === postId && temporarySaved ? true : saved;
  const distance = post ? formatDistance(coordinates, post.location.coordinates) : undefined;
  const heroHeight = Math.min(screenWidth * 0.9, 410);

  const toggleSaved = async () => {
    if (!post || !hydrated || saving || tourActive) return;
    if (!user) {
      router.push({
        pathname: '/auth' as never,
        params: { returnTo: `/shot/${post.id}` },
      });
      return;
    }
    setSaving(true);
    try {
      await toggle(post.id);
    } catch {
      Alert.alert('同步失败', '想拍清单没有改变，请检查网络后重试。');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!tourActive || stepIndex !== 2 || tourPostId !== postId || methodSectionY <= 0) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        y: Math.max(heroHeight + methodSectionY - 170, 0),
        animated: false,
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [heroHeight, methodSectionY, postId, stepIndex, tourActive, tourPostId]);

  if (!post) {
    return (
      <View style={styles.missing}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={styles.missingTitle}>这条拍摄灵感暂时找不到</Text>
        <TouchableOpacity style={styles.missingButton} onPress={() => router.back()}>
          <Text style={styles.missingButtonText}>返回</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 140 + insets.bottom }}
      >
        <View>
          <Image
            source={post.image.source}
            style={[styles.hero, { height: heroHeight }]}
            resizeMode="cover"
            accessibilityLabel={post.image.alt}
          />
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>{post.category}</Text>
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.creditRow}>
            <View style={styles.creditAvatar}>
              <Text style={styles.creditAvatarText}>{post.credit.creator.slice(0, 1)}</Text>
            </View>
            <View style={styles.creditCopy}>
              <Text style={styles.creditEyebrow}>灵感样片 · {post.credit.source}</Text>
              <Text style={styles.creditName}>{post.credit.creator}</Text>
            </View>
          </View>

          <Text style={styles.title}>{post.title}</Text>
          <Text style={styles.hook}>{post.hook}</Text>

          <View style={styles.signatureBar}>
            <View style={styles.signatureItem}>
              <IconSymbol name="location.fill" size={15} color="#D85331" />
              <Text style={styles.signatureText}>{distance ? `距你 ${distance}` : post.location.shortLabel}</Text>
            </View>
            <View style={styles.signatureDivider} />
            <View style={styles.signatureItem}>
              <IconSymbol name="clock.fill" size={15} color="#D85331" />
              <Text numberOfLines={1} style={styles.signatureText}>{post.time.shootingWindow}</Text>
            </View>
            <View style={styles.signatureDivider} />
            <View style={styles.signatureItem}>
              <IconSymbol name="iphone" size={15} color="#D85331" />
              <Text style={styles.signatureText}>
                {post.deviceKinds.includes(device.kind) ? `${device.shortName}可拍` : '方法可参考'}
              </Text>
            </View>
          </View>

          <View style={styles.quickGrid}>
            <InfoCard label="地点" value={post.location.label} note={post.location.sourceLabel} />
            <InfoCard label="时间" value={post.time.label} note={post.time.sourceLabel} />
            <InfoCard label="难度" value={post.recreation.difficulty} note={post.recreation.duration} />
            <InfoCard
              label="设备"
              value={post.gear.camera}
              note={post.gear.lens || post.gear.sourceLabel}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionEyebrow}>用啥拍</Text>
            <Text style={styles.sectionTitle}>{post.gear.camera}</Text>
            {post.gear.lens ? <Text style={styles.bodyText}>{post.gear.lens}</Text> : null}
            <Text style={styles.sourceNote}>{post.gear.sourceLabel}</Text>
            {post.gear.note ? <Text style={styles.bodyText}>{post.gear.note}</Text> : null}
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeadingRow}>
              <View>
                <Text style={styles.sectionEyebrow}>参数</Text>
                <Text style={styles.sectionTitle}>{post.parameters.sourceLabel}</Text>
              </View>
              <View
                style={[
                  styles.sourceBadge,
                  post.parameters.sourceLabel === '原始拍摄信息' && styles.sourceBadgeVerified,
                ]}
              >
                <Text
                  style={[
                    styles.sourceBadgeText,
                    post.parameters.sourceLabel === '原始拍摄信息' &&
                      styles.sourceBadgeTextVerified,
                  ]}
                >
                  {post.parameters.sourceLabel === '原始拍摄信息' ? '已核验' : '建议值'}
                </Text>
              </View>
            </View>
            <View style={styles.parameterGrid}>
              {post.parameters.items.map((item) => (
                <View key={item.label} style={styles.parameterItem}>
                  <Text style={styles.parameterLabel}>{item.label}</Text>
                  <Text style={styles.parameterValue}>{item.value}</Text>
                </View>
              ))}
            </View>
          </View>

          <View
            ref={methodTourTarget.ref}
            collapsable={methodTourTarget.collapsable}
            style={styles.section}
            onLayout={(event) => {
              setMethodSectionY(event.nativeEvent.layout.y);
              methodTourTarget.onLayout(event);
            }}
          >
            <Text style={styles.sectionEyebrow}>怎么拍</Text>
            <Text style={styles.sectionTitle}>照着这 {post.recreation.steps.length} 步做</Text>
            <View style={styles.steps}>
              {post.recreation.steps.map((step, index) => (
                <View key={step} style={styles.stepRow}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.stepText}>{step}</Text>
                </View>
              ))}
            </View>
          </View>

          {post.accessNote ? (
            <View style={styles.accessPanel}>
              <View style={styles.accessIcon}>
                <IconSymbol name="location.circle.fill" size={20} color="#D85331" />
              </View>
              <View style={styles.accessCopy}>
                <Text style={styles.accessTitle}>到现场前看一眼</Text>
                <Text style={styles.accessText}>{post.accessNote}</Text>
              </View>
            </View>
          ) : null}

          <TouchableOpacity style={styles.questionButton} onPress={() => router.push('/ask-question')}>
            <View>
              <Text style={styles.questionEyebrow}>还有具体问题？</Text>
              <Text style={styles.questionTitle}>去公开问答里问拍法</Text>
            </View>
            <IconSymbol name="chevron.right" size={20} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.creditPanel}>
            <Text style={styles.sectionEyebrow}>图片来源与许可</Text>
            <Text style={styles.creditPanelTitle}>
              {post.credit.creator} · {post.credit.source}
            </Text>
            <Text style={styles.creditPanelText}>
              {post.credit.license}。素材参数与推荐复刻参数已在页面中分别标注。
            </Text>
            <View style={styles.creditLinks}>
              <TouchableOpacity onPress={() => void Linking.openURL(post.credit.sourceUrl)}>
                <Text style={styles.linkText}>查看原图</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => void Linking.openURL(post.credit.licenseUrl)}>
                <Text style={styles.linkText}>查看许可</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      <TouchableOpacity
        style={[styles.backButton, { top: insets.top + 10 }]}
        onPress={() => router.back()}
        accessibilityLabel="返回"
      >
        <IconSymbol name="chevron.left" size={24} color="#1D1D1F" />
      </TouchableOpacity>

      <View
        ref={saveTourTarget.ref}
        collapsable={saveTourTarget.collapsable}
        onLayout={saveTourTarget.onLayout}
        style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 14) }]}
      >
        <TouchableOpacity
          style={[
            styles.saveButton,
            displaySaved && styles.saveButtonSaved,
            (!hydrated || saving) && styles.saveButtonDisabled,
          ]}
          onPress={() => void toggleSaved()}
          disabled={!hydrated || saving || tourActive}
        >
          <IconSymbol
            name={displaySaved ? 'bookmark.fill' : 'bookmark'}
            size={20}
            color={displaySaved ? '#FF5A3C' : '#FFFFFF'}
          />
          <Text style={[styles.saveButtonText, displaySaved && styles.saveButtonTextSaved]}>
            {!hydrated
              ? syncError ? '想拍清单同步异常' : '正在读取想拍清单'
              : displaySaved
                ? '已加入想拍清单'
                : '加入想拍清单'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function InfoCard({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <View style={styles.infoCard}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text numberOfLines={2} style={styles.infoValue}>{value}</Text>
      <Text numberOfLines={1} style={styles.infoNote}>{note}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  hero: { width: '100%', backgroundColor: '#ECECEA' },
  heroBadge: {
    position: 'absolute',
    left: 18,
    bottom: 18,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.93)',
  },
  heroBadgeText: { color: '#202022', fontSize: 12, fontWeight: '800' },
  backButton: {
    position: 'absolute',
    left: 14,
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.93)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  content: { padding: 20 },
  creditRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  creditAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFE6DC',
  },
  creditAvatarText: { color: '#B44629', fontSize: 16, fontWeight: '900' },
  creditCopy: { marginLeft: 11 },
  creditEyebrow: { color: '#8A8A8F', fontSize: 10, fontWeight: '700' },
  creditName: { color: '#222224', fontSize: 14, fontWeight: '800', marginTop: 2 },
  title: { color: '#18181A', fontSize: 29, lineHeight: 35, fontWeight: '900', letterSpacing: -0.8 },
  hook: { color: '#626267', fontSize: 16, lineHeight: 25, marginTop: 10 },
  signatureBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: '#FFF0E9',
    borderWidth: 1,
    borderColor: '#F2D1C3',
  },
  signatureItem: { flex: 1, minWidth: 0, alignItems: 'center', gap: 4 },
  signatureDivider: { width: 1, height: 27, backgroundColor: '#E8C8BB' },
  signatureText: { color: '#7D5549', fontSize: 9, fontWeight: '900', textAlign: 'center' },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 24 },
  infoCard: {
    width: '48%',
    minHeight: 112,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#F5F5F3',
  },
  infoLabel: { color: '#96969B', fontSize: 10, fontWeight: '800', marginBottom: 8 },
  infoValue: { color: '#222224', fontSize: 15, lineHeight: 20, fontWeight: '800' },
  infoNote: { color: '#8A8A8F', fontSize: 10, marginTop: 6 },
  section: {
    marginTop: 30,
    paddingTop: 26,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E4E4E1',
  },
  sectionHeadingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionEyebrow: {
    color: '#FF5A3C',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginBottom: 7,
  },
  sectionTitle: { color: '#202022', fontSize: 21, fontWeight: '900' },
  bodyText: { color: '#66666B', fontSize: 14, lineHeight: 22, marginTop: 8 },
  sourceNote: { color: '#99999E', fontSize: 11, marginTop: 8 },
  sourceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#FFF0EA',
  },
  sourceBadgeVerified: { backgroundColor: '#E8F6ED' },
  sourceBadgeText: { color: '#C84E30', fontSize: 10, fontWeight: '800' },
  sourceBadgeTextVerified: { color: '#29754B' },
  parameterGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 18 },
  parameterItem: { width: '50%', marginBottom: 18 },
  parameterLabel: { color: '#98989D', fontSize: 10, fontWeight: '700' },
  parameterValue: { color: '#202022', fontSize: 16, fontWeight: '900', marginTop: 4 },
  steps: { marginTop: 18, gap: 14 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start' },
  stepNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#202022',
  },
  stepNumberText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
  stepText: { flex: 1, color: '#3C3C40', fontSize: 15, lineHeight: 23, marginLeft: 12 },
  accessPanel: {
    flexDirection: 'row',
    marginTop: 28,
    padding: 16,
    borderRadius: 18,
    backgroundColor: '#FFF5EF',
    borderWidth: 1,
    borderColor: '#F2DDD3',
  },
  accessIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFE4D8',
  },
  accessCopy: { flex: 1, marginLeft: 11 },
  accessTitle: { color: '#4C3B36', fontSize: 12, fontWeight: '900' },
  accessText: { color: '#81736E', fontSize: 11, lineHeight: 18, marginTop: 4 },
  questionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    padding: 17,
    borderRadius: 18,
    backgroundColor: '#252527',
  },
  questionEyebrow: { color: '#F3A98C', fontSize: 9, fontWeight: '900' },
  questionTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '900', marginTop: 4 },
  creditPanel: { marginTop: 30, padding: 18, borderRadius: 18, backgroundColor: '#F5F5F3' },
  creditPanelTitle: { color: '#232325', fontSize: 15, fontWeight: '800' },
  creditPanelText: { color: '#76767B', fontSize: 12, lineHeight: 19, marginTop: 8 },
  creditLinks: { flexDirection: 'row', gap: 22, marginTop: 14 },
  linkText: { color: '#C84E30', fontSize: 12, fontWeight: '800' },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 18,
    paddingTop: 12,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E2DF',
  },
  saveButton: {
    height: 52,
    borderRadius: 18,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF5A3C',
  },
  saveButtonSaved: { backgroundColor: '#FFF0EA', borderWidth: 1, borderColor: '#FFD2C5' },
  saveButtonDisabled: { opacity: 0.65 },
  saveButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
  saveButtonTextSaved: { color: '#C84E30' },
  missing: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#FFFFFF',
  },
  missingTitle: { color: '#66666B', fontSize: 16, marginBottom: 18 },
  missingButton: { paddingHorizontal: 22, paddingVertical: 12, borderRadius: 14, backgroundColor: '#202022' },
  missingButtonText: { color: '#FFFFFF', fontWeight: '800' },
});

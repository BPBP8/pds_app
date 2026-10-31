import { Asset } from 'expo-asset';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Image, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAppPreferences, type DeviceKind } from '@/src/app-preferences-context';
import { useAuth } from '@/src/auth-context';
import { SEED_POST_BY_ID } from '@/src/data/seed-posts';
import { COMPOSITIONS, getPoseTips, getShootingSetup, navigationUrl, recommendedComposition, type Composition, type LightCondition } from '@/src/photography';
import { useSavedShots } from '@/src/saved-shots-context';

const STAGES = ['先站对位置', '构图与动作', '设置并拍摄'];

export default function ShootingGuideScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const post = SEED_POST_BY_ID[id];
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { coordinates, device } = useAppPreferences();
  const { hydrated, isSaved, toggle } = useSavedShots();
  const [stage, setStage] = useState(0);
  const [composition, setComposition] = useState<Composition>(recommendedComposition(id));
  const [guideVisible, setGuideVisible] = useState(true);
  const [light, setLight] = useState<LightCondition>('normal');
  const [kind, setKind] = useState<DeviceKind>(device.kind);
  const [ownPhoto, setOwnPhoto] = useState<string | null>(null);
  const [ownPhotoAspect, setOwnPhotoAspect] = useState(1);
  const sampleAsset = post ? Asset.fromModule(post.image.source as number) : null;
  const photoAspect = ownPhoto ? ownPhotoAspect : (sampleAsset?.width ?? 4) / (sampleAsset?.height ?? 3);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');
  useEffect(() => { setStage(0); setComposition(recommendedComposition(id)); setOwnPhoto(null); setFeedback(''); }, [id]);
  const setup = useMemo(() => post ? getShootingSetup(post, kind, light) : [], [kind, light, post]);
  const activeComposition = COMPOSITIONS.find(item => item.id === composition)!;

  if (!post) return <View style={styles.missing}><Text>暂时找不到这个拍摄方案。</Text><TouchableOpacity onPress={() => router.back()}><Text style={styles.link}>返回上一页</Text></TouchableOpacity></View>;

  const pickPhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: false, quality: 0.85 });
      if (!result.canceled && result.assets[0]) { const photo = result.assets[0]; setOwnPhoto(photo.uri); setOwnPhotoAspect(photo.width / photo.height || 1); }
    } catch { setFeedback('暂时无法打开照片，请检查相册权限后重试。'); }
  };
  const savePlan = async () => {
    if (!user) { router.push({ pathname: '/auth' as never, params: { returnTo: '/shooting/' + id } }); return; }
    if (!hydrated || saving) return;
    setSaving(true);
    try { await toggle(id); } catch { setFeedback('收藏没有同步成功，请检查网络后重试。'); } finally { setSaving(false); }
  };
  const publish = () => {
    if (user) router.push({ pathname: '/modal' as never, params: { sourceId: id } });
    else router.push({ pathname: '/auth' as never, params: { returnTo: '/modal', sourceId: id } });
  };

  return <View style={styles.page}>
    <Stack.Screen options={{ headerShown: false }} />
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 28 }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} accessibilityLabel="返回拍摄方案" style={styles.back}><IconSymbol name="chevron.left" size={20} color="#332C2A" /></TouchableOpacity>
        <View style={{ flex: 1 }}><Text style={styles.eyebrow}>怎么拍 · 拍摄助手</Text><Text style={styles.heading}>{post.location.shortLabel}</Text></View>
        <TouchableOpacity onPress={() => void savePlan()} style={styles.save}><Text style={styles.saveText}>{saving ? '同步中…' : isSaved(id) ? '已收藏' : '收藏机位'}</Text></TouchableOpacity>
      </View>
      {feedback ? <Text accessibilityRole="alert" style={styles.intro}>{feedback}</Text> : null}
      <Text style={styles.intro}>把拍法拆成现场能照着做的三步。先看样片，再试自己的取景。</Text>
      <View style={styles.stepper}>{STAGES.map((title, index) => <TouchableOpacity key={title} onPress={() => setStage(index)} style={[styles.step, stage === index && styles.stepActive]} accessibilityRole="tab" accessibilityState={{ selected: stage === index }}>
        <Text style={[styles.stepNumber, stage === index && styles.stepNumberActive]}>{index + 1}</Text><Text style={[styles.stepTitle, stage === index && styles.stepTitleActive]}>{title}</Text>
      </TouchableOpacity>)}</View>

      <View style={styles.previewWrap}>
        <View style={[styles.preview, { aspectRatio: photoAspect }]}>
          <Image source={ownPhoto ? { uri: ownPhoto } : post.image.source} style={{ position: 'absolute', width: '100%', height: '100%' }} resizeMode="contain" accessibilityLabel={ownPhoto ? '我选择的取景照片' : post.image.alt} />
          <View style={styles.imageLabel}><Text style={styles.imageLabelText}>{ownPhoto ? '我的取景 · 仅在本机预览' : '参考样片'}</Text></View>
          {guideVisible ? <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            {composition === 'thirds' ? <><View style={[styles.lineV, { left: '33.33%' }]} /><View style={[styles.lineV, { left: '66.66%' }]} /><View style={[styles.lineH, { top: '33.33%' }]} /><View style={[styles.lineH, { top: '66.66%' }]} /></> : null}
            {composition === 'symmetry' ? <><View style={[styles.lineV, { left: '50%' }]} /><View style={[styles.lineH, { top: '50%' }]} /><View style={styles.centerTarget} /></> : null}
            {composition === 'frame' ? <View style={styles.frame} /> : null}
            {composition === 'leading' ? <><View style={[styles.diagonal, { transform: [{ rotate: '30deg' }], left: '29%' }]} /><View style={[styles.diagonal, { transform: [{ rotate: '-30deg' }], left: '70%' }]} /></> : null}
          </View> : null}
        </View>
        <View style={styles.previewActions}>
          <TouchableOpacity onPress={() => setGuideVisible(value => !value)} style={styles.subtleButton}><Text style={styles.subtleText}>{guideVisible ? '隐藏辅助线' : '显示辅助线'}</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => void pickPhoto()} style={styles.subtleButton}><Text style={styles.subtleText}>用我的照片试构图</Text></TouchableOpacity>
          {ownPhoto ? <TouchableOpacity onPress={() => setOwnPhoto(null)} style={styles.subtleButton}><Text style={styles.subtleText}>看回样片</Text></TouchableOpacity> : null}
        </View>
        {ownPhoto ? <View style={styles.comparison}><Image source={post.image.source} style={styles.comparisonImage} /><Text style={styles.comparisonText}>对照样片观察主体位置、背景留白和地平线，试着调整你的取景。</Text></View> : null}
      </View>

      {stage === 0 ? <View style={styles.card}>
        <Text style={styles.cardEyebrow}>第一步 / 到哪里、什么时候拍</Text><Text style={styles.cardTitle}>{post.title}</Text>
        <View style={styles.infoRow}><Text style={styles.infoLabel}>机位</Text><Text style={styles.infoValue}>{post.location.label}</Text></View>
        <View style={styles.infoRow}><Text style={styles.infoLabel}>光线</Text><Text style={styles.infoValue}>{post.time.shootingWindow}</Text></View>
        <View style={styles.infoRow}><Text style={styles.infoLabel}>用时</Text><Text style={styles.infoValue}>{post.recreation.duration} · {post.recreation.difficulty}</Text></View>
        <Text style={styles.body}>{post.accessNote ?? '到现场后先找不妨碍通行的位置，观察光线和背景，再决定站位。'}</Text>
        <TouchableOpacity onPress={() => void Linking.openURL(navigationUrl(post, coordinates))} style={styles.secondary}><IconSymbol name="location.fill" size={17} color="#C14D30" /><Text style={styles.secondaryText}>在地图中查看与导航</Text></TouchableOpacity>
      </View> : null}

      {stage === 1 ? <View style={styles.card}>
        <Text style={styles.cardEyebrow}>第二步 / 把主体放对位置</Text><Text style={styles.cardTitle}>先选构图，再处理人物或主体</Text>
        <View style={styles.chips}>{COMPOSITIONS.map(item => <TouchableOpacity key={item.id} onPress={() => { setComposition(item.id); setGuideVisible(true); }} style={[styles.chip, composition === item.id && styles.chipActive]}><Text style={[styles.chipText, composition === item.id && styles.chipTextActive]}>{item.title}</Text></TouchableOpacity>)}</View>
        <Text style={styles.tip}>{activeComposition.instruction}</Text>
        <Text style={styles.smallTitle}>{post.category === '美食' || post.category === '宠物' ? '主体怎么安排' : '想把人也拍进去？'}</Text>
        {getPoseTips(post).map((tip, index) => <View key={tip} style={styles.bulletRow}><Text style={styles.bullet}>{index + 1}</Text><Text style={styles.bulletText}>{tip}</Text></View>)}
      </View> : null}

      {stage === 2 ? <View style={styles.card}>
        <Text style={styles.cardEyebrow}>第三步 / 参数起点与现场操作</Text><Text style={styles.cardTitle}>先拍清楚，再调整明暗</Text>
        <View style={styles.chips}>{([{ id: 'phone', title: '手机' }, { id: 'camera', title: '相机' }] as const).map(item => <TouchableOpacity key={item.id} onPress={() => setKind(item.id)} style={[styles.chip, kind === item.id && styles.chipActive]}><Text style={[styles.chipText, kind === item.id && styles.chipTextActive]}>{item.title}</Text></TouchableOpacity>)}</View>
        <Text style={styles.smallTitle}>现场光线</Text><View style={styles.chips}>{([{ id: 'bright', title: '偏亮' }, { id: 'normal', title: '正常' }, { id: 'dark', title: '偏暗' }] as const).map(item => <TouchableOpacity key={item.id} onPress={() => setLight(item.id)} style={[styles.chip, light === item.id && styles.chipActive]}><Text style={[styles.chipText, light === item.id && styles.chipTextActive]}>{item.title}</Text></TouchableOpacity>)}</View>
        <View style={styles.settings}>{setup.map(item => <View key={item.label} style={styles.setting}><Text style={styles.settingLabel}>{item.label}</Text><Text style={styles.settingValue}>{item.value}</Text></View>)}</View>
        <Text style={styles.caption}>参考设置需要按现场光线微调。样片的原始拍摄信息可在作品详情中查看。</Text>
        <Text style={styles.smallTitle}>照着这几步拍一张</Text>{post.recreation.steps.map((step, index) => <View key={step} style={styles.bulletRow}><Text style={styles.bullet}>{index + 1}</Text><Text style={styles.bulletText}>{step}</Text></View>)}
        <TouchableOpacity onPress={publish} style={styles.primary}><Text style={styles.primaryText}>拍好了，发布我的作品</Text><IconSymbol name="arrow.right" size={18} color="#FFF" /></TouchableOpacity>
      </View> : null}

      <View style={styles.footer}>
        {stage > 0 ? <TouchableOpacity onPress={() => setStage(value => value - 1)} style={styles.previous}><Text style={styles.previousText}>上一步</Text></TouchableOpacity> : null}
        <TouchableOpacity onPress={() => stage < 2 ? setStage(value => value + 1) : router.push({ pathname: '/shot/[id]', params: { id } })} style={[styles.primary, { flex: 1, marginTop: 0 }]}><Text style={styles.primaryText}>{stage < 2 ? '下一步 · ' + STAGES[stage + 1] : '返回完整拍摄方案'}</Text><IconSymbol name="chevron.right" size={17} color="#FFF" /></TouchableOpacity>
      </View>
    </ScrollView>
  </View>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F7F4EF' }, missing: { padding: 28 }, link: { color: '#C14D30', marginTop: 16 },
  header: { paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 12 }, back: { padding: 10, backgroundColor: '#FFF', borderRadius: 20 }, eyebrow: { color: '#A36D58', fontSize: 11, fontWeight: '700' }, heading: { color: '#2D2926', fontSize: 25, fontWeight: '800', marginTop: 3 }, save: { padding: 10, borderRadius: 12, borderWidth: 1, borderColor: '#DACBBB', backgroundColor: '#FFFCF8' }, saveText: { color: '#AC4D33', fontSize: 12, fontWeight: '700' }, intro: { marginHorizontal: 20, marginTop: 14, color: '#827970', fontSize: 13, lineHeight: 21 },
  stepper: { flexDirection: 'row', marginHorizontal: 16, marginVertical: 16, gap: 6 }, step: { flex: 1, paddingVertical: 10, paddingHorizontal: 7, borderRadius: 12, backgroundColor: '#EBE5DE', flexDirection: 'row', alignItems: 'center', gap: 5 }, stepActive: { backgroundColor: '#D85331' }, stepNumber: { color: '#9B8B7E', fontSize: 12, fontWeight: '800' }, stepNumberActive: { color: '#FFD6C8' }, stepTitle: { fontSize: 11, color: '#817569', fontWeight: '700' }, stepTitleActive: { color: '#FFF' },
  previewWrap: { marginHorizontal: 16 }, preview: { width: '100%', borderRadius: 18, overflow: 'hidden', backgroundColor: '#D9CFC2' }, imageLabel: { position: 'absolute', top: 12, left: 12, backgroundColor: '#211D19A6', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 }, imageLabelText: { color: '#FFF', fontSize: 11 }, lineV: { position: 'absolute', top: 0, bottom: 0, borderLeftWidth: 1, borderColor: '#FFFFFFD9' }, lineH: { position: 'absolute', left: 0, right: 0, borderTopWidth: 1, borderColor: '#FFFFFFD9' }, centerTarget: { position: 'absolute', top: '44%', left: '44%', width: '12%', height: '12%', borderWidth: 1, borderColor: '#FFF' }, frame: { position: 'absolute', top: '13%', bottom: '13%', left: '15%', right: '15%', borderWidth: 2, borderColor: '#FFFFFFE6', borderRadius: 6 }, diagonal: { position: 'absolute', top: '45%', height: '85%', borderLeftWidth: 2, borderColor: '#FFFFFFDD' }, previewActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }, subtleButton: { paddingVertical: 9, paddingHorizontal: 12, borderRadius: 10, backgroundColor: '#FFF' }, subtleText: { fontSize: 12, color: '#9E4C33', fontWeight: '600' }, comparison: { flexDirection: 'row', marginTop: 12, gap: 12, alignItems: 'center', backgroundColor: '#FFF', borderRadius: 12, padding: 10 }, comparisonImage: { width: 70, height: 80, borderRadius: 8 }, comparisonText: { flex: 1, fontSize: 12, lineHeight: 20, color: '#7D7166' },
  card: { padding: 18, margin: 16, marginBottom: 0, borderRadius: 18, backgroundColor: '#FFFDFC', borderWidth: 1, borderColor: '#E9E0D6' }, cardEyebrow: { fontSize: 11, color: '#BD6C4F', fontWeight: '800', marginBottom: 8 }, cardTitle: { fontSize: 20, color: '#342B25', fontWeight: '800', lineHeight: 28, marginBottom: 16 }, infoRow: { flexDirection: 'row', paddingVertical: 9, gap: 14, borderBottomWidth: 1, borderColor: '#F0EBE5' }, infoLabel: { width: 38, fontSize: 12, color: '#A28F7C' }, infoValue: { flex: 1, fontSize: 13, lineHeight: 21, color: '#544638' }, body: { fontSize: 13, lineHeight: 22, color: '#8B7867', marginTop: 14 }, secondary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#F9EDE4', padding: 14, borderRadius: 12, marginTop: 15 }, secondaryText: { color: '#AC4D33', fontSize: 13, fontWeight: '700' }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 }, chip: { borderWidth: 1, borderColor: '#DED4C8', paddingVertical: 9, paddingHorizontal: 13, borderRadius: 20 }, chipActive: { backgroundColor: '#FCE6D7', borderColor: '#D85331' }, chipText: { color: '#8B7C6D', fontSize: 12 }, chipTextActive: { color: '#AF462B', fontWeight: '700' }, tip: { padding: 14, borderRadius: 12, backgroundColor: '#F3EEE6', color: '#796148', fontSize: 13, lineHeight: 23 }, smallTitle: { color: '#534433', fontSize: 14, fontWeight: '800', marginTop: 16, marginBottom: 10 }, bulletRow: { flexDirection: 'row', gap: 10, marginBottom: 13 }, bullet: { width: 21, height: 21, borderRadius: 11, backgroundColor: '#F5E5D6', textAlign: 'center', lineHeight: 21, color: '#B46A41', fontSize: 11, fontWeight: '800' }, bulletText: { flex: 1, fontSize: 13, color: '#786657', lineHeight: 22 }, settings: { gap: 8 }, setting: { borderRadius: 12, padding: 13, backgroundColor: '#F6F1EA' }, settingLabel: { fontSize: 10, color: '#A68F76', marginBottom: 5 }, settingValue: { fontSize: 14, fontWeight: '700', color: '#59432D', lineHeight: 22 }, caption: { fontSize: 11, lineHeight: 19, color: '#A19284', marginTop: 10 }, primary: { backgroundColor: '#D85331', borderRadius: 13, paddingVertical: 15, paddingHorizontal: 16, flexDirection: 'row', gap: 8, justifyContent: 'center', alignItems: 'center', marginTop: 14 }, primaryText: { fontSize: 13, color: '#FFF', fontWeight: '800' }, footer: { margin: 16, flexDirection: 'row', gap: 10 }, previous: { padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#D7C6B4' }, previousText: { color: '#8B6A49', fontSize: 13 },
});

import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAppPreferences } from '@/src/app-preferences-context';
import { useAuth } from '@/src/auth-context';
import { SEED_POSTS } from '@/src/data/seed-posts';
import { sourceDeviceKind } from '@/src/photo-metadata';

const SCENES = [
  { id: 'travel', title: '旅行与建筑', need: '轻便、常用焦段和防抖', phone: '先用 1× 主摄完成构图；拍远处建筑细节时，再判断是否需要光学长焦。', upgrade: '比较实际携带重量、常用焦段和防抖。先用现有设备拍同一场景，明确哪里拍不到，再考虑升级。' },
  { id: 'portrait', title: '人像', need: '拍摄距离、对焦和焦段', phone: '退后一点，用 2× 或人像模式；先把背景、光线和人物姿势安排好。', upgrade: '重点比较人眼对焦、常用人像焦段和镜头搭配。样片中人物与背景的距离同样会影响效果。' },
  { id: 'night', title: '夜景', need: '画面稳定和暗光表现', phone: '先靠稳设备，使用夜景模式；先区分画面偏糊来自手抖还是主体运动。', upgrade: '先区分是手抖、主体运动还是噪点问题，再比较防抖、对焦和暗光表现。' },
  { id: 'motion', title: '宠物与运动', need: '连续对焦、快门与连拍', phone: '在光线充足处打开连拍，降低机位，给运动方向留出空间。', upgrade: '重点看连续对焦和高速连拍的实际表现，结合你会拍摄的运动速度和拍摄距离试用。' },
] as const;

export default function GearDiscovery({ equipmentName }: { equipmentName: string }) {
  const router = useRouter();
  const { device } = useAppPreferences();
  const { user } = useAuth();
  const [sceneId, setSceneId] = useState<string>('travel');
  const [upgrading, setUpgrading] = useState(false);
  const scene = SCENES.find(item => item.id === sceneId)!;
  const originalSamples = useMemo(() => SEED_POSTS.filter(post => post.gear.sourceLabel === '原始拍摄信息' && sourceDeviceKind(post.gear.camera) === device.kind), [device.kind]);
  const [sampleModel, setSampleModel] = useState('');
  const sampleModels = [...new Set(originalSamples.map(post => post.gear.camera))];
  const selectedSampleModel = sampleModels.includes(sampleModel) ? sampleModel : '';
  const visibleModel = selectedSampleModel || equipmentName;
  const exactSamples = originalSamples.filter(post => post.gear.camera.toLowerCase() === visibleModel.toLowerCase());
  const samples = exactSamples.length ? exactSamples : originalSamples;
  const ask = () => {
    if (user) router.push({ pathname: '/ask-question', params: { deviceName: selectedSampleModel || equipmentName, scene: scene.title } });
    else router.push({ pathname: '/auth' as never, params: { returnTo: '/ask-question', deviceName: selectedSampleModel || equipmentName, scene: scene.title } });
  };
  return <View style={styles.wrap}>
    <View style={styles.headingRow}><View style={{ flex: 1 }}><Text style={styles.eyebrow}>用什么拍</Text><Text style={styles.title}>从你想拍的场景开始</Text></View><Text style={styles.device}>{device.shortName}</Text></View>
    <View style={styles.intentRow}><TouchableOpacity onPress={() => setUpgrading(false)} style={[styles.intent, !upgrading && styles.intentActive]}><Text style={[styles.intentText, !upgrading && styles.intentTextActive]}>先用手里的设备</Text></TouchableOpacity><TouchableOpacity onPress={() => setUpgrading(true)} style={[styles.intent, upgrading && styles.intentActive]}><Text style={[styles.intentText, upgrading && styles.intentTextActive]}>我在考虑升级</Text></TouchableOpacity></View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>{SCENES.map(item => <TouchableOpacity key={item.id} onPress={() => setSceneId(item.id)} style={[styles.chip, sceneId === item.id && styles.chipActive]}><Text style={[styles.chipText, sceneId === item.id && styles.chipTextActive]}>{item.title}</Text></TouchableOpacity>)}</ScrollView>
    <View style={styles.advice}><Text style={styles.adviceLabel}>这个场景先看什么</Text><Text style={styles.adviceTitle}>{scene.need}</Text><Text style={styles.adviceBody}>{upgrading ? scene.upgrade : device.kind === 'phone' ? scene.phone : '先用现有设备按样片拍一次，检查焦段、对焦与稳定性是否满足需求。'}</Text></View>
    <Text style={styles.samplesTitle}>{exactSamples.length ? '这款设备拍摄的作品' : '同类设备的原始样片参考'}</Text>
    {!exactSamples.length ? <Text style={styles.note}>以下显示每张照片的原始设备，不代表当前所选机型拍摄。进入作品可查看来源与参数。</Text> : null}
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.chips, { marginTop: 12 }]}>{sampleModels.map(model => <TouchableOpacity key={model} onPress={() => setSampleModel(selectedSampleModel === model ? '' : model)} style={[styles.chip, selectedSampleModel === model && styles.chipActive]}><Text style={[styles.chipText, selectedSampleModel === model && styles.chipTextActive]}>{model}</Text></TouchableOpacity>)}</ScrollView>
    {selectedSampleModel ? <Text style={styles.note}>当前样片设备：{selectedSampleModel}</Text> : null}
    {samples.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.samples}>{samples.slice(0, 5).map(post => <TouchableOpacity key={post.id} style={styles.sample} onPress={() => router.push({ pathname: '/shot/[id]', params: { id: post.id } })}>
      <Image source={post.image.source} style={styles.sampleImage} resizeMode="cover" /><Text numberOfLines={1} style={styles.sampleTitle}>{post.location.shortLabel}</Text><Text numberOfLines={2} style={styles.sampleDevice}>{post.gear.camera}</Text><Text style={styles.sampleLink}>查看原始信息与拍法 →</Text>
    </TouchableOpacity>)}</ScrollView> : <Text style={styles.note}>当前尚未收录这一类设备的原始样片。可以先看器材信息，或带着具体场景提问。</Text>}
    <TouchableOpacity style={styles.ask} onPress={ask}><View style={{ flex: 1 }}><Text style={styles.askTitle}>还拿不准？带着场景问</Text><Text style={styles.askCopy}>说清预算、常拍题材和已有设备</Text></View><Text style={styles.askArrow}>去提问 →</Text></TouchableOpacity>
  </View>;
}
const styles = StyleSheet.create({ wrap: { margin: 15, padding: 17, backgroundColor: '#FFFBF5', borderWidth: 1, borderColor: '#EBDDCC', borderRadius: 18 }, headingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 }, eyebrow: { color: '#BD7046', fontSize: 10, fontWeight: '800' }, title: { fontSize: 20, fontWeight: '800', color: '#49372A', marginTop: 5 }, device: { color: '#AE704F', fontSize: 11, backgroundColor: '#F5E6D9', padding: 9, borderRadius: 12 }, intentRow: { flexDirection: 'row', gap: 7, marginTop: 16, marginBottom: 12 }, intent: { flex: 1, borderWidth: 1, borderColor: '#DED3C7', padding: 10, borderRadius: 11, alignItems: 'center' }, intentActive: { backgroundColor: '#D85331', borderColor: '#D85331' }, intentText: { color: '#9C8774', fontSize: 11, fontWeight: '700' }, intentTextActive: { color: '#FFF' }, chips: { gap: 7, marginBottom: 12 }, chip: { borderWidth: 1, borderColor: '#E0D4C7', borderRadius: 17, paddingHorizontal: 12, paddingVertical: 8 }, chipActive: { backgroundColor: '#FAE7D9', borderColor: '#D58E68' }, chipText: { fontSize: 11, color: '#9F8977' }, chipTextActive: { color: '#AD5634', fontWeight: '700' }, advice: { backgroundColor: '#F4EBDF', padding: 15, borderRadius: 13 }, adviceLabel: { fontSize: 10, color: '#AC927C' }, adviceTitle: { fontSize: 15, color: '#6C4B32', fontWeight: '800', marginVertical: 8 }, adviceBody: { fontSize: 12, lineHeight: 22, color: '#957453' }, samplesTitle: { fontSize: 14, color: '#5D4431', fontWeight: '800', marginTop: 20 }, note: { color: '#AC9987', fontSize: 10, lineHeight: 18, marginTop: 8, marginBottom: 10 }, samples: { gap: 10 }, sample: { width: 140, backgroundColor: '#FFF', borderRadius: 12, paddingBottom: 10, overflow: 'hidden' }, sampleImage: { width: 140, height: 105 }, sampleTitle: { fontSize: 12, color: '#5D4431', fontWeight: '800', marginTop: 9, marginHorizontal: 10 }, sampleDevice: { fontSize: 10, color: '#A08B77', lineHeight: 16, margin: 10, marginVertical: 5 }, sampleLink: { fontSize: 10, color: '#C8693E', marginHorizontal: 10 }, ask: { flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: 1, borderColor: '#EBDCCD', paddingTop: 16, marginTop: 17 }, askTitle: { color: '#7E5030', fontSize: 13, fontWeight: '800' }, askCopy: { color: '#AC927A', fontSize: 10, marginTop: 5 }, askArrow: { color: '#C55B31', fontWeight: '800', fontSize: 12 } });

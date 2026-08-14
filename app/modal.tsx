import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAppPreferences } from '@/src/app-preferences-context';
import { getSafeAuthorName, useAuth } from '@/src/auth-context';
import { db } from '@/src/config/firebase';

const CATEGORIES = ['旅行', '人像', '美食', '宠物', '生活'] as const;
const MAX_IMAGE_DATA_LENGTH = 720_000;
const MAX_DEVICE_NAME_LENGTH = 100;
const MAX_LOCATION_LABEL_LENGTH = 100;
const MAX_CAPTURED_AT_LENGTH = 50;
const MAX_PARAM_VALUE_LENGTH = 100;

type PickedPhoto = {
  uri: string;
  width: number;
  height: number;
  fileName?: string | null;
  exif?: Record<string, unknown> | null;
};

const asExifText = (value: unknown, maxLength = MAX_PARAM_VALUE_LENGTH) =>
  typeof value === 'string' || typeof value === 'number'
    ? String(value).trim().slice(0, maxLength)
    : '';

function readPhotoMetadata(photo: PickedPhoto | null, fallbackDevice: string) {
  const exif = photo?.exif ?? {};
  const make = asExifText(exif.Make || exif.make);
  const model = asExifText(exif.Model || exif.model);
  const capturedAt = asExifText(
    exif.DateTimeOriginal || exif.DateTimeDigitized || exif.DateTime || exif.datetime,
    MAX_CAPTURED_AT_LENGTH,
  );
  const params = {
    lens: asExifText(exif.LensModel || exif.Lens || exif.lensModel),
    focalLength: asExifText(exif.FocalLength || exif.focalLength),
    aperture: asExifText(exif.FNumber || exif.ApertureValue || exif.fNumber),
    shutter: asExifText(exif.ExposureTime || exif.ShutterSpeedValue || exif.exposureTime),
    iso: asExifText(exif.ISOSpeedRatings || exif.PhotographicSensitivity || exif.iso),
  };

  return {
    deviceName: ([make, model].filter(Boolean).join(' ') || fallbackDevice.trim())
      .slice(0, MAX_DEVICE_NAME_LENGTH),
    capturedAt,
    params: Object.fromEntries(Object.entries(params).filter(([, value]) => Boolean(value))),
  };
}

async function compressForFirestore(uri: string) {
  const attempts = [
    { width: 1080, quality: 0.58 },
    { width: 900, quality: 0.48 },
    { width: 720, quality: 0.4 },
  ];

  for (const attempt of attempts) {
    const result = await manipulateAsync(
      uri,
      [{ resize: { width: attempt.width } }],
      { compress: attempt.quality, format: SaveFormat.JPEG, base64: true },
    );
    if (!result.base64) continue;
    const dataUri = `data:image/jpeg;base64,${result.base64}`;
    if (dataUri.length <= MAX_IMAGE_DATA_LENGTH) return dataUri;
  }

  throw new Error('image-too-large');
}

export default function PublishModal() {
  const router = useRouter();
  const params = useLocalSearchParams<{ deviceName?: string }>();
  const insets = useSafeAreaInsets();
  const { user, loading: authLoading } = useAuth();
  const { city, device } = useAppPreferences();
  const requestedDeviceName = useMemo(() => {
    const value = Array.isArray(params.deviceName) ? params.deviceName[0] : params.deviceName;
    return value?.trim().slice(0, 80) || device.name;
  }, [device.name, params.deviceName]);
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('生活');
  const [notes, setNotes] = useState('');
  const [deviceName, setDeviceName] = useState(requestedDeviceName);
  const [locationLabel, setLocationLabel] = useState('');
  const [showPreciseLocation, setShowPreciseLocation] = useState(false);
  const [uploading, setUploading] = useState(false);

  const metadata = useMemo(
    () => readPhotoMetadata(photo, requestedDeviceName),
    [photo, requestedDeviceName],
  );

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace({ pathname: '/auth' as never, params: { returnTo: '/modal' } });
    }
  }, [authLoading, router, user]);

  useEffect(() => {
    setDeviceName(metadata.deviceName);
  }, [metadata.deviceName]);

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('需要相册权限', '请允许拍点啥读取你选择的照片。');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: false,
      exif: true,
      quality: 1,
    });
    if (result.canceled) return;

    const asset = result.assets[0];
    setPhoto({
      uri: asset.uri,
      width: asset.width,
      height: asset.height,
      fileName: asset.fileName,
      exif: asset.exif as Record<string, unknown> | null | undefined,
    });
  };

  const publish = async () => {
    if (!user) {
      router.replace({ pathname: '/auth' as never, params: { returnTo: '/modal' } });
      return;
    }
    if (!photo) {
      Alert.alert('还没有照片', '请先选择一张照片。');
      return;
    }
    if (!title.trim()) {
      Alert.alert('填写作品名称', '给这张照片起一个名字。');
      return;
    }

    const normalizedDeviceName = (deviceName.trim() || device.name.trim());
    if (normalizedDeviceName.length > MAX_DEVICE_NAME_LENGTH) {
      Alert.alert('设备名称过长', `拍摄设备最多填写 ${MAX_DEVICE_NAME_LENGTH} 个字符。`);
      return;
    }
    const normalizedLocationLabel = locationLabel.trim();
    if (normalizedLocationLabel.length > MAX_LOCATION_LABEL_LENGTH) {
      Alert.alert('地点名称过长', `拍摄地点最多填写 ${MAX_LOCATION_LABEL_LENGTH} 个字符。`);
      return;
    }
    if (metadata.capturedAt.length > MAX_CAPTURED_AT_LENGTH) {
      Alert.alert('照片时间信息异常', '这张照片的拍摄时间信息过长，请换一张照片后重试。');
      return;
    }

    setUploading(true);
    try {
      const imageUrl = await compressForFirestore(photo.uri);
      await addDoc(collection(db, 'posts'), {
        title: title.trim(),
        imageUrl,
        category,
        motivation: category,
        notes: notes.trim(),
        device: normalizedDeviceName,
        capturedAt: metadata.capturedAt || null,
        params: metadata.params,
        location: normalizedLocationLabel
          ? {
              label: showPreciseLocation
                ? normalizedLocationLabel
                : city.trim().slice(0, MAX_LOCATION_LABEL_LENGTH),
              precise: showPreciseLocation,
            }
          : null,
        userId: user.uid,
        authorName: getSafeAuthorName(user.displayName),
        likes: 0,
        createdAt: serverTimestamp(),
      });

      Alert.alert('发布成功', '作品已同步到首页和你的个人主页。', [
        { text: '查看我的作品', onPress: () => router.replace('/(tabs)/profile') },
      ]);
    } catch (error) {
      const code = typeof error === 'object' && error && 'code' in error
        ? String((error as { code?: unknown }).code)
        : '';
      const message =
        error instanceof Error && error.message === 'image-too-large'
          ? '这张照片压缩后仍然太大，请换一张后重试。'
          : code === 'permission-denied'
            ? '后端拒绝写入，请确认已登录且 Firestore 规则已部署。'
            : code === 'unavailable'
              ? '暂时连接不到后端，请检查网络后重试。'
              : '发布失败，请稍后再试。';
      Alert.alert('没有发布成功', message);
    } finally {
      setUploading(false);
    }
  };

  if (authLoading || !user) {
    return <View style={styles.loading}><ActivityIndicator color="#D85331" /></View>;
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.iconButton} onPress={() => router.back()}>
          <IconSymbol name="xmark" size={21} color="#2E2A2C" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>发布作品</Text>
        <TouchableOpacity onPress={publish} disabled={uploading} style={styles.headerPublish}>
          {uploading ? <ActivityIndicator color="#D85331" /> : <Text style={styles.headerPublishText}>发布</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <TouchableOpacity style={styles.photoCard} onPress={pickPhoto} activeOpacity={0.88}>
          {photo ? (
            <Image source={{ uri: photo.uri }} style={styles.photo} resizeMode="cover" />
          ) : (
            <View style={styles.photoPlaceholder}>
              <View style={styles.photoIcon}><IconSymbol name="camera.fill" size={28} color="#FFFFFF" /></View>
              <Text style={styles.photoTitle}>选择一张照片</Text>
              <Text style={styles.photoBody}>前期只发单图，让每张作品都值得被看见</Text>
            </View>
          )}
          {photo ? <View style={styles.changeBadge}><Text style={styles.changeText}>更换</Text></View> : null}
        </TouchableOpacity>

        <View style={styles.field}>
          <Text style={styles.label}>作品名称 *</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="例如：雨后的鼓楼"
            placeholderTextColor="#AAA3A6"
            style={styles.input}
            maxLength={40}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>拍了什么</Text>
          <View style={styles.chips}>
            {CATEGORIES.map((item) => (
              <TouchableOpacity
                key={item}
                onPress={() => setCategory(item)}
                style={[styles.chip, category === item && styles.chipActive]}
              >
                <Text style={[styles.chipText, category === item && styles.chipTextActive]}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>拍摄设备</Text>
          <TextInput
            value={deviceName}
            onChangeText={setDeviceName}
            placeholder="从照片读取失败时可手动填写"
            placeholderTextColor="#AAA3A6"
            style={styles.input}
            maxLength={MAX_DEVICE_NAME_LENGTH}
          />
          <Text style={styles.helper}>
            {metadata.capturedAt ? `拍摄时间：${metadata.capturedAt}` : '照片没有可读取的拍摄时间，可直接发布。'}
          </Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>拍摄地点（可选）</Text>
          <TextInput
            value={locationLabel}
            onChangeText={setLocationLabel}
            placeholder="例如：北京市东城区景山前街"
            placeholderTextColor="#AAA3A6"
            style={styles.input}
            maxLength={MAX_LOCATION_LABEL_LENGTH}
          />
          {locationLabel.trim() ? (
            <View style={styles.switchRow}>
              <View style={styles.switchCopy}>
                <Text style={styles.switchTitle}>展示具体地点</Text>
                <Text style={styles.switchBody}>
                  关闭时仅保存城市“{city}”，上方具体地址不会上传
                </Text>
              </View>
              <Switch
                value={showPreciseLocation}
                onValueChange={setShowPreciseLocation}
                trackColor={{ false: '#DCD5D1', true: '#E99D82' }}
                thumbColor={showPreciseLocation ? '#D85331' : '#FFFFFF'}
              />
            </View>
          ) : null}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>拍摄想法（可选）</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="说说为什么想拍下这一刻，或分享拍法"
            placeholderTextColor="#AAA3A6"
            style={[styles.input, styles.notes]}
            multiline
            maxLength={280}
          />
        </View>

        <View style={styles.syncNote}>
          <IconSymbol name="checkmark.circle.fill" size={18} color="#D85331" />
          <Text style={styles.syncText}>照片会压缩后同步；原图仍只保留在你的手机中。</Text>
        </View>

        <TouchableOpacity style={styles.publishButton} onPress={publish} disabled={uploading}>
          {uploading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.publishButtonText}>发布这张作品</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFDFC' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFDFC' },
  header: {
    minHeight: 62, paddingHorizontal: 16, paddingBottom: 10, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#EEE7E3',
  },
  iconButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#292527', fontSize: 17, fontWeight: '900' },
  headerPublish: { minWidth: 48, minHeight: 40, alignItems: 'center', justifyContent: 'center' },
  headerPublishText: { color: '#D85331', fontSize: 15, fontWeight: '900' },
  content: { padding: 18, paddingBottom: 46 },
  photoCard: { height: 310, borderRadius: 22, overflow: 'hidden', backgroundColor: '#F3ECE8' },
  photo: { width: '100%', height: '100%' },
  photoPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  photoIcon: { width: 58, height: 58, borderRadius: 20, backgroundColor: '#D85331', alignItems: 'center', justifyContent: 'center' },
  photoTitle: { marginTop: 16, color: '#332E30', fontSize: 18, fontWeight: '900' },
  photoBody: { marginTop: 7, color: '#8A8285', fontSize: 12, textAlign: 'center', lineHeight: 18 },
  changeBadge: { position: 'absolute', right: 12, bottom: 12, borderRadius: 14, paddingHorizontal: 13, paddingVertical: 8, backgroundColor: 'rgba(34,31,32,0.82)' },
  changeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  field: { marginTop: 24 },
  label: { marginBottom: 9, color: '#4B4548', fontSize: 13, fontWeight: '900' },
  input: { minHeight: 52, borderWidth: 1, borderColor: '#E7DFDB', borderRadius: 15, paddingHorizontal: 15, backgroundColor: '#FFFFFF', color: '#292527', fontSize: 15 },
  notes: { minHeight: 108, paddingTop: 14, textAlignVertical: 'top' },
  helper: { marginTop: 8, color: '#938B8E', fontSize: 11, lineHeight: 17 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14, backgroundColor: '#F2ECE8' },
  chipActive: { backgroundColor: '#D85331' },
  chipText: { color: '#736C6F', fontSize: 13, fontWeight: '800' },
  chipTextActive: { color: '#FFFFFF' },
  switchRow: { marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  switchCopy: { flex: 1, paddingRight: 12 },
  switchTitle: { color: '#4B4548', fontSize: 13, fontWeight: '800' },
  switchBody: { marginTop: 3, color: '#9B9396', fontSize: 10 },
  syncNote: { marginTop: 24, padding: 14, borderRadius: 14, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF0E9' },
  syncText: { flex: 1, marginLeft: 9, color: '#7D5B50', fontSize: 11, lineHeight: 17 },
  publishButton: { marginTop: 18, minHeight: 56, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: '#D85331' },
  publishButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
});

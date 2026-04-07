import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Image, ScrollView, Platform, KeyboardAvoidingView, Switch, ActivityIndicator, Alert, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
const { MediaTypeOptions } = ImagePicker;
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, storage, auth } from '../src/config/firebase';

const { width } = Dimensions.get('window');
const IMAGE_SIZE = (width - 60) / 3;

const MOTIVATIONS = ['记录生活', '唯美主义', '纪实摄影', '色彩练习', '影调探索'];
const METHODS = ['自然光', '环境光', '极简构图', '对称美学', '长曝光', '动态捕捉'];
const MOODS = ['宁静', '孤独', '热烈', '客观', '超现实'];

export default function PublishModal() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [images, setImages] = useState<string[]>([]);
  const [coverIndex, setCoverIndex] = useState(0);
  const [uploading, setUploading] = useState(false);
  
  // Categorization
  const [motivation, setMotivation] = useState('');
  const [selectedMethods, setSelectedMethods] = useState<string[]>([]);
  const [mood, setMood] = useState('');
  const [notes, setNotes] = useState('');
  
  // Camera parameters with toggles
  const [showParams, setShowParams] = useState(false);
  const [params, setParams] = useState({
    camera: { value: '', show: true },
    lens: { value: '', show: true },
    focalLength: { value: '', show: true },
    aperture: { value: '', show: true },
    shutter: { value: '', show: true },
    iso: { value: '', show: true },
  });

  const pickImages = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert("权限不足", "需要相册权限才能选择照片！");
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 9 - images.length,
      quality: 0.8,
    });

    if (!result.canceled) {
      const newImages = result.assets.map(asset => asset.uri);
      setImages([...images, ...newImages]);
    }
  };

  const removeImage = (index: number) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    setImages(newImages);
    if (coverIndex === index) setCoverIndex(0);
    else if (coverIndex > index) setCoverIndex(coverIndex - 1);
  };

  const toggleMethod = (method: string) => {
    if (selectedMethods.includes(method)) {
      setSelectedMethods(selectedMethods.filter(m => m !== method));
    } else {
      setSelectedMethods([...selectedMethods, method]);
    }
  };

  const handlePublish = async () => {
    if (images.length === 0) {
      Alert.alert("请选择照片");
      return;
    }
    if (!motivation || !mood) {
      Alert.alert("请完成拍摄动机与情绪的选择");
      return;
    }

    setUploading(true);
    try {
      const imageUrls = await Promise.all(images.map(async (uri, index) => {
        console.log('Uploading image:', index, uri);

        let blob: Blob;
        if (uri.startsWith('blob:') || uri.startsWith('data:')) {
          const response = await fetch(uri);
          blob = await response.blob();
        } else {
          const response = await fetch(uri);
          blob = await response.blob();
        }

        const filename = `posts/${Date.now()}-${index}-${auth.currentUser?.uid || 'guest'}.jpg`;
        const storageRef = ref(storage, filename);
        await uploadBytes(storageRef, blob);
        const url = await getDownloadURL(storageRef);
        console.log('Uploaded:', url);
        return url;
      }));

      const finalParams: any = {};
      Object.entries(params).forEach(([key, val]) => {
        if (val.show && val.value) finalParams[key] = val.value;
      });

      const postData = {
        imageUrls,
        imageUrl: imageUrls[coverIndex],
        motivation,
        methods: selectedMethods,
        mood,
        notes,
        params: showParams ? finalParams : null,
        userId: auth.currentUser?.uid || 'guest',
        createdAt: serverTimestamp(),
        likes: 0,
        avatar: 'https://i.pravatar.cc/150?u=' + (auth.currentUser?.uid || '0'),
      };

      await addDoc(collection(db, 'posts'), postData);

      Alert.alert("同步成功", "你的创作已在灵感池中绽放", [
        { text: "好的", onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error('Publish error:', error);
      Alert.alert("发布失败", error instanceof Error ? error.message : "请稍后再试");
    } finally {
      setUploading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top || 20 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <IconSymbol name="xmark" size={24} color="#86868B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>新创作</Text>
        <TouchableOpacity 
          onPress={handlePublish} 
          style={[styles.headerBtn, (images.length === 0 || uploading) && styles.headerBtnDisabled]}
          disabled={images.length === 0 || uploading}
        >
          {uploading ? (
            <ActivityIndicator size="small" color="#1D1D1F" />
          ) : (
            <Text style={styles.publishText}>发布</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Multi Image Picker */}
        <View style={styles.imageGrid}>
          {images.map((uri, index) => (
            <TouchableOpacity 
              key={index} 
              style={[styles.imageWrapper, coverIndex === index && styles.imageWrapperActive]} 
              onPress={() => setCoverIndex(index)}
              activeOpacity={0.8}
            >
              <Image source={{ uri }} style={styles.imageItem} />
              <TouchableOpacity style={styles.removeBtn} onPress={() => removeImage(index)}>
                <IconSymbol name="xmark" size={12} color="#1D1D1F" />
              </TouchableOpacity>
              {coverIndex === index && (
                <View style={styles.coverBadge}>
                  <Text style={styles.coverText}>封面</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
          {images.length < 9 && (
            <TouchableOpacity style={styles.addBtn} onPress={pickImages}>
              <IconSymbol name="plus" size={32} color="#1D1D1F" />
              <Text style={styles.addText}>{images.length}/9</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.tipBox}>
          <Text style={styles.tipText}>点击图片设置为该作品的封面。高质量的图片能获得更多关注。</Text>
        </View>

        {/* Motivation Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>拍摄动机</Text>
          <View style={styles.optionRow}>
            {MOTIVATIONS.map(item => (
              <TouchableOpacity 
                key={item} 
                style={[styles.optionChip, motivation === item && styles.optionChipActive]}
                onPress={() => setMotivation(item)}
              >
                <Text style={[styles.optionText, motivation === item && styles.optionTextActive]}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Mood Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>核心情绪</Text>
          <View style={styles.optionRow}>
            {MOODS.map(item => (
              <TouchableOpacity 
                key={item} 
                style={[styles.optionChip, mood === item && styles.optionChipActive]}
                onPress={() => setMood(item)}
              >
                <Text style={[styles.optionText, mood === item && styles.optionTextActive]}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Optional Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>创作想法</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="聊聊这张照片背后的故事..."
            placeholderTextColor="#86868B"
            multiline
            value={notes}
            onChangeText={setNotes}
          />
        </View>

        {/* Advanced Specs Toggle */}
        <View style={styles.section}>
             <TouchableOpacity 
                style={styles.advancedToggle} 
                onPress={() => setShowParams(!showParams)}
                activeOpacity={0.7}
             >
                <Text style={styles.advancedText}>{showParams ? '隐藏专业参数' : '添加专业摄影参数'}</Text>
                <IconSymbol 
                    name={showParams ? "chevron.up" : "chevron.down"} 
                    size={14} 
                    color="#1D1D1F" 
                />
             </TouchableOpacity>
          
          {showParams && (
            <View style={styles.paramsGrid}>
              {Object.entries(params).map(([key, item]: [string, any]) => (
                <View key={key} style={styles.paramInputRow}>
                  <View style={styles.paramLabelRow}>
                    <Text style={styles.miniLabel}>{key === 'focalLength' ? '焦距' : key.toUpperCase()}</Text>
                    <Switch 
                      value={item.show} 
                      onValueChange={(val) => setParams({...params, [key]: {...item, show: val}})}
                      style={{ transform: [{ scale: 0.8 }] }}
                      trackColor={{ false: '#D1D1D6', true: '#34C759' }}
                    />
                  </View>
                  <TextInput 
                    style={[styles.paramInput, !item.show && styles.paramInputDisabled]}
                    value={item.value}
                    onChangeText={(val) => setParams({...params, [key]: {...item, value: val}})}
                    placeholder="未填写"
                    placeholderTextColor="#D1D1D6"
                    editable={item.show}
                  />
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  headerBtn: {
    minWidth: 40,
  },
  headerBtnDisabled: {
    opacity: 0.3,
  },
  cancelText: {
    color: '#86868B',
    fontSize: 16,
    fontWeight: '500',
  },
  headerTitle: {
    color: '#1D1D1F',
    fontSize: 17,
    fontWeight: 'bold',
  },
  publishText: {
    color: '#1D1D1F',
    fontSize: 16,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 10,
  },
  imageWrapper: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#F5F5F7',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  imageWrapperActive: {
    borderColor: '#1D1D1F',
  },
  imageItem: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  removeBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(255,255,255,0.9)',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  coverBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(29, 29, 31, 0.9)',
    paddingVertical: 2,
    alignItems: 'center',
  },
  coverText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
  addBtn: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: 16,
    backgroundColor: '#F5F5F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addText: {
    color: '#86868B',
    fontSize: 11,
    marginTop: 4,
    fontWeight: '600',
  },
  tipBox: {
    marginTop: 15,
    marginBottom: 30,
    paddingHorizontal: 5,
  },
  tipText: {
    color: '#86868B',
    fontSize: 12,
    lineHeight: 18,
  },
  section: {
    marginBottom: 35,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionLabel: {
    color: '#1D1D1F',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 15,
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  optionChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F5F5F7',
  },
  optionChipActive: {
    backgroundColor: '#1D1D1F',
  },
  optionText: {
    color: '#424245',
    fontSize: 14,
    fontWeight: '600',
  },
  optionTextActive: {
    color: '#FFFFFF',
  },
  notesInput: {
    backgroundColor: '#F5F5F7',
    borderRadius: 16,
    padding: 16,
    color: '#1D1D1F',
    fontSize: 15,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  advancedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    backgroundColor: '#F5F5F7',
    borderRadius: 12,
    marginTop: 10,
  },
  advancedText: {
    color: '#1D1D1F',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 6,
  },
  paramsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 20,
  },
  paramInputRow: {
    width: (width - 52) / 2,
    backgroundColor: '#F5F5F7',
    borderRadius: 12,
    padding: 12,
  },
  paramLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  miniLabel: {
    color: '#86868B',
    fontSize: 10,
    fontWeight: '700',
  },
  paramInput: {
    color: '#1D1D1F',
    fontSize: 14,
    fontWeight: '600',
    padding: 0,
  },
  paramInputDisabled: {
    opacity: 0.3,
  }
});



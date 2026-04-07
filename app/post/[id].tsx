import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, Dimensions, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../src/config/firebase';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

const MOCK_POSTS: any[] = [
    {
        id: 'mock1',
        imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1000&auto=format&fit=crop',
        imageUrls: ['https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1000', 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?q=80&w=1000'],
        userId: 'ArtLover99',
        title: 'Neon Nights',
        likes: 1240,
        avatar: 'https://i.pravatar.cc/150?u=1',
        motivation: '色彩练习',
        mood: '热烈',
        methods: ['环境光', '极简构图'],
        notes: '在霓虹灯下寻找那一抹纯净的色彩对比。每次拍摄都是一次对光影界限的探索。',
        params: { camera: 'Sony A7R4', lens: '35mm f/1.4', focalLength: '35mm', aperture: 'f/1.4', shutter: '1/60', iso: '800' }
    },
    {
        id: 'mock2',
        imageUrl: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=1000&auto=format&fit=crop',
        userId: 'Visionary',
        title: 'Abstract Fluid',
        likes: 382,
        avatar: 'https://i.pravatar.cc/150?u=2',
        motivation: '唯美主义',
        mood: '超 surreal',
        methods: ['实验创作'],
        params: { camera: 'Fujifilm X-T4', focalLength: '56mm' }
    },
    {
        id: 'mock3',
        imageUrl: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?q=80&w=1000&auto=format&fit=crop',
        userId: 'ColorPop',
        title: 'Geometric Harmony',
        likes: 89,
        avatar: 'https://i.pravatar.cc/150?u=3',
        motivation: '影调探索',
        mood: '客观',
        methods: ['对称美学'],
    },
];

export default function PostDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const docRef = doc(db, 'posts', id as string);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setPost(docSnap.data());
        } else {
          // Fallback to mock data
          const mock = MOCK_POSTS.find(m => m.id === id);
          if (mock) setPost(mock);
        }
      } catch (error) {
        console.error("Error fetching post:", error);
        const mock = MOCK_POSTS.find(m => m.id === id);
        if (mock) setPost(mock);
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
  }, [id]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#1D1D1F" />
      </View>
    );
  }

  if (!post) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>作品已下架或链接失效</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>返回首页</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const imageUrls = post.imageUrls || [post.imageUrl];

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{
          headerTitle: '',
          headerTransparent: true,
          headerTintColor: '#1D1D1F',
          headerLeft: () => (
            <TouchableOpacity 
              style={[styles.circleBtn, { marginLeft: 10 }]} 
              onPress={() => router.back()}
            >
              <IconSymbol name="chevron.left" size={24} color="#1D1D1F" />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <View style={[styles.headerRight, { marginRight: 10 }]}>
              <TouchableOpacity style={styles.circleBtn}>
                <IconSymbol name="heart" size={20} color="#1D1D1F" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.circleBtn}>
                <IconSymbol name="square.and.arrow.up" size={20} color="#1D1D1F" />
              </TouchableOpacity>
            </View>
          ),
        }} 
      />

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Image Gallery */}
        <View style={styles.galleryWrapper}>
          <ScrollView 
            horizontal 
            pagingEnabled 
            showsHorizontalScrollIndicator={false}
            onScroll={(e) => {
              const x = e.nativeEvent.contentOffset.x;
              // We need the width of the container for accurate paging index
              // On Web, use the layout width if possible, fallback to Dimensions
              const layoutWidth = e.nativeEvent.layoutMeasurement.width;
              setActiveImageIndex(Math.round(x / layoutWidth));
            }}
            scrollEventThrottle={16}
          >
            {imageUrls.map((url: string, index: number) => (
              <View key={index} style={styles.imageSlide}>
                <Image 
                  source={{ uri: url }} 
                  style={styles.mainImage} 
                  contentFit="cover"
                  transition={200}
                />
              </View>
            ))}
          </ScrollView>
          
          {/* Pagination dots */}
          {imageUrls.length > 1 && (
            <View style={styles.pagination}>
              {imageUrls.map((_: any, i: number) => (
                <View 
                  key={i} 
                  style={[styles.dot, activeImageIndex === i && styles.dotActive]} 
                />
              ))}
            </View>
          )}
        </View>

        {/* User Info Bar */}
        <View style={styles.userBar}>
          <Image source={{ uri: post.avatar || 'https://i.pravatar.cc/150?u=0' }} style={styles.avatar} />
          <View>
            <Text style={styles.username}>{post.userId?.substring(0, 12)}</Text>
            <Text style={styles.postDate}>{post.createdAt?.toDate ? post.createdAt.toDate().toLocaleDateString() : '2026/03/23'}</Text>
          </View>
          <View style={{flex: 1}} />
          <TouchableOpacity style={styles.followBtn}>
            <Text style={styles.followText}>关注</Text>
          </TouchableOpacity>
        </View>

        {/* Content Section */}
        <View style={styles.contentSection}>
          <View style={styles.intentGrid}>
            <View style={styles.intentItem}>
              <Text style={styles.intentLabel}>创作意图</Text>
              <Text style={styles.intentValue}>{post.motivation || '视觉记录'}</Text>
            </View>
            <View style={styles.intentItem}>
              <Text style={styles.intentLabel}>核心情绪</Text>
              <Text style={styles.intentValue}>{post.mood || '中性'}</Text>
            </View>
          </View>

          {post.notes && (
            <View style={styles.notesBox}>
              <Text style={styles.notesText}>{post.notes}</Text>
            </View>
          )}

          {post.methods && post.methods.length > 0 && (
            <View style={styles.methodList}>
              <Text style={styles.intentLabel}>光影与手段</Text>
              <View style={styles.tagRow}>
                {post.methods.map((m: string) => (
                  <View key={m} style={styles.tag}>
                    <Text style={styles.tagText}>{m}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Params Panel - Refined Sunny Style */}
        {post.params && (
          <View style={styles.paramsContainer}>
            <View style={styles.paramsPanel}>
              <Text style={styles.panelTitle}>TECHNICAL DATA</Text>
              <View style={styles.paramsGrid}>
                {Object.entries(post.params).map(([key, val]: [string, any]) => (
                  <View key={key} style={styles.paramItem}>
                    <Text style={styles.paramKey}>{key === 'focalLength' ? 'FOCAL' : key.toUpperCase()}</Text>
                    <Text style={styles.paramVal}>{val}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#86868B',
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  backBtn: {
    backgroundColor: '#1D1D1F',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  header: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
  },
  circleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerRight: {
      flexDirection: 'row',
      gap: 12,
  },
  scrollView: {
    flex: 1,
  },
  galleryWrapper: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#FFFFFF',
  },
  imageSlide: {
    width: 390, // Fixed width for each slide to match the phone wrapper max-width
    maxWidth: '100%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainImage: {
    width: '100%',
    height: '100%',
  },
  pagination: {
    position: 'absolute',
    bottom: 25,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  dotActive: {
    backgroundColor: '#FFFFFF',
    width: 14,
  },
  userBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#F2F2F2',
  },
  username: {
    color: '#1D1D1F',
    fontSize: 15,
    fontWeight: 'bold',
  },
  postDate: {
    color: '#86868B',
    fontSize: 11,
    marginTop: 2,
  },
  followBtn: {
    backgroundColor: '#F5F5F7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  followText: {
    color: '#1D1D1F',
    fontSize: 13,
    fontWeight: '700',
  },
  contentSection: {
    padding: 20,
  },
  intentGrid: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 30,
  },
  intentItem: {
    flex: 1,
  },
  intentLabel: {
    color: '#86868B',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  intentValue: {
    color: '#1D1D1F',
    fontSize: 20,
    fontWeight: '900',
  },
  methodList: {
    marginTop: 30,
    marginBottom: 10,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F5F5F7',
    borderRadius: 8,
  },
  tagText: {
    color: '#424245',
    fontSize: 13,
    fontWeight: '600',
  },
  notesBox: {
    marginTop: 5,
    paddingVertical: 10,
  },
  notesText: {
    color: '#1D1D1F',
    fontSize: 16,
    lineHeight: 26,
    fontWeight: '400',
  },
  paramsContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  paramsPanel: {
    backgroundColor: '#F5F5F7',
    padding: 20,
    borderRadius: 20,
  },
  panelTitle: {
    color: '#86868B',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    textAlign: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#EBEBEB',
    paddingBottom: 12,
  },
  paramsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  paramItem: {
    width: '50%',
    marginBottom: 18,
  },
  paramKey: {
    color: '#86868B',
    fontSize: 9,
    fontWeight: '700',
    marginBottom: 4,
  },
  paramVal: {
    color: '#1D1D1F',
    fontSize: 14,
    fontWeight: '800',
  }
});

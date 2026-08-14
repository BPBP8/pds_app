import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { collection, limit, onSnapshot, query, where } from 'firebase/firestore';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { db } from '@/src/config/firebase';

type PublicPost = {
  id: string;
  imageUrl: string;
  title: string;
  likes: number;
  authorName: string;
};

const IMAGE_PREFIX = 'data:image/jpeg;base64,';
const MAX_IMAGE_LENGTH = 800_000;
const BASE64_PAYLOAD_PATTERN = /^[A-Za-z0-9+/]+={0,2}$/;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const firstParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const safeDisplayName = (value: unknown) => {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, 40);
};

const isValidPublicUserId = (value: string) =>
  /^[A-Za-z0-9_-]{1,128}$/.test(value);

const isSafeBase64Image = (value: unknown): value is string => {
  if (typeof value !== 'string' || !value.startsWith(IMAGE_PREFIX) || value.length > MAX_IMAGE_LENGTH) {
    return false;
  }
  const payload = value.slice(IMAGE_PREFIX.length);
  return payload.length >= 4 && BASE64_PAYLOAD_PATTERN.test(payload);
};

function normalizePublicPost(
  id: string,
  value: unknown,
  expectedUserId: string,
  fallbackAuthorName: string,
): PublicPost | null {
  if (!isRecord(value) || value.userId !== expectedUserId) return null;
  if (!isSafeBase64Image(value.imageUrl)) return null;

  const title = typeof value.title === 'string' ? value.title.trim() : '';
  const likes = value.likes;
  if (
    !title
    || title.length > 40
    || typeof likes !== 'number'
    || !Number.isSafeInteger(likes)
    || likes < 0
  ) {
    return null;
  }

  return {
    id,
    imageUrl: value.imageUrl,
    title,
    likes,
    authorName: safeDisplayName(value.authorName) || fallbackAuthorName,
  };
}

const authorInitial = (name: string) =>
  Array.from(name.trim())[0]?.toUpperCase() || '拍';

export default function PublicUserScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const userId = (firstParam(params.id)?.trim() ?? '').slice(0, 128);
  const requestedName = safeDisplayName(firstParam(params.name));
  const fallbackName = requestedName || '拍点啥用户';
  const [posts, setPosts] = useState<PublicPost[]>([]);
  const [displayName, setDisplayName] = useState(fallbackName);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    setDisplayName(fallbackName);
  }, [fallbackName, userId]);

  useEffect(() => {
    let active = true;
    setPosts([]);
    if (!isValidPublicUserId(userId)) {
      setError('这个用户地址无效。');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    const postsQuery = query(
      collection(db, 'posts'),
      where('userId', '==', userId),
      limit(30),
    );
    const unsubscribe = onSnapshot(
      postsQuery,
      (snapshot) => {
        if (!active) return;
        const nextPosts = snapshot.docs.flatMap((postDoc) => {
          const post = normalizePublicPost(
            postDoc.id,
            postDoc.data(),
            userId,
            fallbackName,
          );
          return post ? [post] : [];
        });
        setPosts(nextPosts);
        setDisplayName(requestedName || nextPosts[0]?.authorName || fallbackName);
        setError('');
        setLoading(false);
      },
      () => {
        if (!active) return;
        setError('暂时无法读取这位用户的公开作品，请稍后重试。');
        setLoading(false);
      },
    );
    return () => {
      active = false;
      unsubscribe();
    };
  }, [fallbackName, requestedName, retryKey, userId]);

  const totalLikes = useMemo(
    () => posts.reduce((total, post) => total + post.likes, 0),
    [posts],
  );

  if (loading) {
    return (
      <View style={styles.centerState}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator color="#D85331" />
        <Text style={styles.loadingText}>正在读取公开作品</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityLabel="返回"
        >
          <IconSymbol name="chevron.left" size={24} color="#292527" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>公开主页</Text>
        <View style={styles.backButton} />
      </View>

      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        numColumns={3}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={(
          <View>
            <View style={styles.profileHeader}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{authorInitial(displayName)}</Text>
              </View>
              <Text style={styles.displayName}>{displayName}</Text>
              <Text style={styles.profileDescription}>分享真实拍摄作品与器材思路</Text>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{posts.length}</Text>
                  <Text style={styles.statLabel}>已展示作品</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{totalLikes}</Text>
                  <Text style={styles.statLabel}>已展示获赞</Text>
                </View>
              </View>
            </View>

            {error && posts.length > 0 ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{error}</Text>
                <TouchableOpacity onPress={() => setRetryKey((current) => current + 1)}>
                  <Text style={styles.retryText}>重试</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {posts.length > 0 ? (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>公开作品</Text>
                <Text style={styles.sectionCount}>最多展示 30 张</Text>
              </View>
            ) : null}
          </View>
        )}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.gridItem}
            activeOpacity={0.88}
            onPress={() => router.push({ pathname: '/post/[id]', params: { id: item.id } })}
            accessibilityLabel={`查看作品：${item.title}`}
          >
            <Image source={{ uri: item.imageUrl }} style={styles.gridImage} resizeMode="cover" />
            <View style={styles.likesBadge}>
              <IconSymbol name="heart.fill" size={11} color="#FFFFFF" />
              <Text style={styles.likesText}>{item.likes}</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={(
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <IconSymbol
                name={error ? 'exclamationmark.triangle.fill' : 'camera.fill'}
                size={26}
                color="#D85331"
              />
            </View>
            <Text style={styles.emptyTitle}>{error ? '作品读取失败' : '还没有公开作品'}</Text>
            <Text style={styles.emptyBody}>
              {error || '这位用户发布作品后，会在这里展示。'}
            </Text>
            {error && isValidPublicUserId(userId) ? (
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => setRetryKey((current) => current + 1)}
              >
                <Text style={styles.retryButtonText}>重新加载</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFDFC' },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFDFC',
  },
  loadingText: { marginTop: 10, color: '#8A8285', fontSize: 12 },
  topBar: {
    minHeight: 58,
    paddingHorizontal: 12,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE7E3',
    backgroundColor: '#FFFDFC',
  },
  backButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  topBarTitle: { color: '#292527', fontSize: 16, fontWeight: '900' },
  listContent: { paddingBottom: 38 },
  profileHeader: { alignItems: 'center', paddingHorizontal: 22, paddingTop: 28, paddingBottom: 24 },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D85331',
  },
  avatarText: { color: '#FFFFFF', fontSize: 28, fontWeight: '900' },
  displayName: { marginTop: 14, color: '#292527', fontSize: 22, fontWeight: '900' },
  profileDescription: { marginTop: 6, color: '#8B8487', fontSize: 12 },
  statsRow: {
    minWidth: 210,
    marginTop: 22,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: '#F5EFEB',
  },
  statItem: { minWidth: 88, alignItems: 'center' },
  statValue: { color: '#2D292B', fontSize: 18, fontWeight: '900' },
  statLabel: { marginTop: 3, color: '#90888B', fontSize: 10, fontWeight: '700' },
  statDivider: { width: 1, height: 28, marginHorizontal: 8, backgroundColor: '#DED5D0' },
  errorBanner: {
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 13,
    backgroundColor: '#FFF0E9',
  },
  errorBannerText: { flex: 1, color: '#845A4D', fontSize: 11, lineHeight: 17 },
  retryText: { marginLeft: 10, color: '#C64C2F', fontSize: 11, fontWeight: '900' },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 15,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: { color: '#302B2D', fontSize: 16, fontWeight: '900' },
  sectionCount: { color: '#9A9295', fontSize: 10 },
  gridItem: { width: '33.3333%', aspectRatio: 1, padding: 1.5 },
  gridImage: { width: '100%', height: '100%', backgroundColor: '#EEE8E4' },
  likesBadge: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    paddingHorizontal: 6,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: 9,
    backgroundColor: 'rgba(28,26,27,0.68)',
  },
  likesText: { color: '#FFFFFF', fontSize: 9, fontWeight: '800' },
  emptyState: { alignItems: 'center', paddingHorizontal: 36, paddingTop: 36, paddingBottom: 54 },
  emptyIcon: {
    width: 58,
    height: 58,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF0E9',
  },
  emptyTitle: { marginTop: 15, color: '#332E30', fontSize: 17, fontWeight: '900' },
  emptyBody: { marginTop: 7, color: '#8C8487', fontSize: 12, lineHeight: 19, textAlign: 'center' },
  retryButton: {
    marginTop: 17,
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 14,
    backgroundColor: '#D85331',
  },
  retryButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
});

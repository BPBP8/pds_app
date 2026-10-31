import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import {
  doc,
  getDoc,
  increment,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/src/auth-context';
import { db } from '@/src/config/firebase';
import { useSavedShots } from '@/src/saved-shots-context';

type PostData = {
  imageUrl?: string;
  title?: string;
  userId?: string;
  authorName?: string;
  likes?: number;
  category?: string;
  motivation?: string;
  notes?: string;
  device?: string;
  capturedAt?: string | null;
  location?: { label?: string; precise?: boolean } | null;
  params?: Record<string, string>;
  createdAt?: { toDate?: () => Date };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const optionalString = (value: unknown, maxLength: number) =>
  typeof value === 'string' ? value.slice(0, maxLength) : undefined;

const normalizeRemotePost = (value: unknown): PostData | null => {
  if (!isRecord(value)) return null;
  const imageUrl = optionalString(value.imageUrl, 800000);
  const title = optionalString(value.title, 40)?.trim();
  if (!imageUrl?.startsWith('data:image/jpeg;base64,') || !title) return null;

  const params = isRecord(value.params)
    ? Object.fromEntries(
        Object.entries(value.params).filter((entry): entry is [string, string] =>
          typeof entry[1] === 'string' && entry[1].length <= 100),
      )
    : {};
  const rawLocation = isRecord(value.location) ? value.location : null;
  const location = rawLocation && typeof rawLocation.label === 'string'
    ? {
        label: rawLocation.label.slice(0, 100),
        precise: rawLocation.precise === true,
      }
    : null;
  const createdAt = isRecord(value.createdAt) && typeof value.createdAt.toDate === 'function'
    ? value.createdAt as PostData['createdAt']
    : undefined;

  return {
    imageUrl,
    title,
    userId: optionalString(value.userId, 128),
    authorName: optionalString(value.authorName, 40),
    likes: typeof value.likes === 'number' && Number.isFinite(value.likes)
      ? Math.max(0, Math.floor(value.likes))
      : 0,
    category: optionalString(value.category, 20),
    motivation: optionalString(value.motivation, 20),
    notes: optionalString(value.notes, 500),
    device: optionalString(value.device, 100),
    capturedAt: value.capturedAt === null ? null : optionalString(value.capturedAt, 50),
    location,
    params,
    createdAt,
  };
};

const PARAM_LABELS: Record<string, string> = {
  lens: '镜头',
  focalLength: '焦距',
  aperture: '光圈',
  shutter: '快门',
  iso: 'ISO',
};

function formatCapturedAt(value?: string | null) {
  if (!value) return '';
  return value.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3');
}

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string | string[] }>();
  const router = useRouter();
  const { user } = useAuth();
  const {
    hydrated: savedShotsHydrated,
    isSaved,
    syncError: savedShotsSyncError,
    toggle,
  } = useSavedShots();
  const postId = Array.isArray(id) ? id[0] : id;
  const [post, setPost] = useState<PostData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRemotePost, setIsRemotePost] = useState(false);
  const [liked, setLiked] = useState(false);
  const [liking, setLiking] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    const loadPost = async () => {
      if (!postId) {
        if (active) setLoading(false);
        return;
      }
      try {
        const snapshot = await getDoc(doc(db, 'posts', postId));
        if (!active) return;
        if (snapshot.exists()) {
          const normalized = normalizeRemotePost(snapshot.data());
          setPost(normalized);
          setIsRemotePost(Boolean(normalized));
        } else {
          setPost(null);
        }
      } catch {
        if (active) setPost(null);
      } finally {
        if (active) setLoading(false);
      }
    };
    void loadPost();
    return () => {
      active = false;
    };
  }, [postId]);

  const imageUrl = post?.imageUrl;
  const params = useMemo(
    () => Object.entries(post?.params ?? {}).filter(([, value]) => Boolean(value)),
    [post?.params],
  );
  const saved = Boolean(postId && isRemotePost && isSaved(postId, 'remote'));

  const likePost = async () => {
    if (!postId || !post || liked || liking) return;
    if (!user) {
      router.push({
        pathname: '/auth' as never,
        params: { returnTo: `/post/${postId}` },
      });
      return;
    }

    setLiked(true);
    setLiking(true);
    setPost((current) => current ? { ...current, likes: (current.likes ?? 0) + 1 } : current);
    try {
      if (isRemotePost) {
        const createdLike = await runTransaction(db, async (transaction) => {
          const postRef = doc(db, 'posts', postId);
          const likeRef = doc(db, 'posts', postId, 'likes', user.uid);
          const existingLike = await transaction.get(likeRef);
          if (existingLike.exists()) return false;
          transaction.set(likeRef, { userId: user.uid, createdAt: serverTimestamp() });
          transaction.update(postRef, { likes: increment(1) });
          return true;
        });
        if (!createdLike) {
          setPost((current) => current ? { ...current, likes: Math.max((current.likes ?? 1) - 1, 0) } : current);
        }
      }
    } catch {
      setLiked(false);
      setPost((current) => current ? { ...current, likes: Math.max((current.likes ?? 1) - 1, 0) } : current);
      Alert.alert('点赞失败', '这次点赞没有同步成功，请检查网络后重试。');
    } finally {
      setLiking(false);
    }
  };

  const toggleSaved = async () => {
    if (!postId || !isRemotePost || !savedShotsHydrated || saving) return;
    if (!user) {
      router.push({
        pathname: '/auth' as never,
        params: { returnTo: `/post/${postId}` },
      });
      return;
    }

    setSaving(true);
    try {
      await toggle(postId, 'remote');
    } catch {
      Alert.alert('同步失败', '想拍清单没有改变，请检查网络后重试。');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color="#D85331" /></View>;
  }

  if (!post || !imageUrl) {
    return (
      <View style={styles.center}>
        <Text style={styles.missingTitle}>作品暂时无法查看</Text>
        <TouchableOpacity style={styles.returnButton} onPress={() => router.back()}>
          <Text style={styles.returnText}>返回</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const capturedAt = formatCapturedAt(post.capturedAt);
  const publishedAt = post.createdAt?.toDate?.().toLocaleDateString('zh-CN') ?? '';
  const authorName = post.authorName || '拍点啥用户';
  const authorInitial = authorName.slice(0, 1).toUpperCase();

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Image source={{ uri: imageUrl }} style={styles.heroImage} contentFit="cover" transition={160} />
          <TouchableOpacity style={[styles.circleButton, styles.backButton]} onPress={() => router.back()}>
            <IconSymbol name="chevron.left" size={23} color="#232022" />
          </TouchableOpacity>
        </View>

        <View style={styles.body}>
          <View style={styles.categoryRow}>
            <Text style={styles.category}>{post.category || post.motivation || '生活'}</Text>
            <View style={styles.actionRow}>
              {isRemotePost ? (
                <TouchableOpacity
                  style={[styles.saveButton, saved && styles.saveButtonActive]}
                  onPress={() => void toggleSaved()}
                  disabled={!savedShotsHydrated || saving}
                  accessibilityLabel={saved ? '移出想拍清单' : '加入想拍清单'}
                  accessibilityHint="想拍清单会同步到当前登录账号"
                >
                  <IconSymbol
                    name={saved ? 'bookmark.fill' : 'bookmark'}
                    size={18}
                    color={saved ? '#FFFFFF' : '#D85331'}
                  />
                  <Text style={[styles.saveText, saved && styles.saveTextActive]}>
                    {saving
                      ? '同步中'
                      : !savedShotsHydrated
                        ? savedShotsSyncError ? '同步异常' : '读取中'
                        : saved ? '已想拍' : '想拍'}
                  </Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity style={styles.likeButton} onPress={() => void likePost()} disabled={liking}>
                <IconSymbol name={liked ? 'heart.fill' : 'heart'} size={19} color={liked ? '#D85331' : '#514B4E'} />
                <Text style={[styles.likeText, liked && styles.likeTextActive]}>{post.likes ?? 0}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.title}>{post.title || '未命名作品'}</Text>

          <View style={styles.authorRow}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{authorInitial}</Text></View>
            <View>
              <Text style={styles.authorName}>{authorName}</Text>
              {publishedAt ? <Text style={styles.publishedAt}>发布于 {publishedAt}</Text> : null}
            </View>
          </View>

          <View style={styles.metadataCard}>
            {post.device ? <MetadataRow icon="camera.fill" label="拍摄设备" value={post.device} /> : null}
            {capturedAt ? <MetadataRow icon="clock.fill" label="拍摄时间" value={capturedAt} /> : null}
            {post.location?.label ? (
              <MetadataRow
                icon="location.fill"
                label="拍摄地点"
                value={post.location.precise ? post.location.label : `${post.location.label}附近`}
              />
            ) : null}
          </View>

          {post.notes ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>拍摄想法</Text>
              <Text style={styles.notes}>{post.notes}</Text>
            </View>
          ) : null}

          {params.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>拍摄参数</Text>
              <View style={styles.paramsGrid}>
                {params.map(([key, value]) => (
                  <View key={key} style={styles.paramItem}>
                    <Text style={styles.paramLabel}>{PARAM_LABELS[key] || key}</Text>
                    <Text style={styles.paramValue}>{value}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

function MetadataRow({
  icon,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof IconSymbol>['name'];
  label: string;
  value: string;
}) {
  return (
    <View style={styles.metadataRow}>
      <View style={styles.metadataIcon}><IconSymbol name={icon} size={16} color="#D85331" /></View>
      <Text style={styles.metadataLabel}>{label}</Text>
      <Text numberOfLines={2} style={styles.metadataValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFDFC' },
  content: { paddingBottom: 42 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#FFFDFC',
  },
  missingTitle: { color: '#403A3D', fontSize: 17, fontWeight: '800', marginBottom: 18 },
  returnButton: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14, backgroundColor: '#D85331' },
  returnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  hero: { width: '100%', aspectRatio: 0.93, backgroundColor: '#EEE8E4' },
  heroImage: { width: '100%', height: '100%' },
  circleButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  backButton: { position: 'absolute', top: 18, left: 16 },
  body: { paddingHorizontal: 20, paddingTop: 18 },
  categoryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  category: { color: '#D85331', fontSize: 12, fontWeight: '900' },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  saveButton: {
    minWidth: 76,
    height: 38,
    paddingHorizontal: 12,
    borderRadius: 19,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFF0E9',
  },
  saveButtonActive: { backgroundColor: '#D85331' },
  saveText: { color: '#D85331', fontSize: 12, fontWeight: '900' },
  saveTextActive: { color: '#FFFFFF' },
  likeButton: {
    minWidth: 62,
    height: 38,
    paddingHorizontal: 12,
    borderRadius: 19,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F4EEEA',
  },
  likeText: { color: '#514B4E', fontSize: 13, fontWeight: '800' },
  likeTextActive: { color: '#D85331' },
  title: { marginTop: 8, color: '#242123', fontSize: 27, lineHeight: 35, fontWeight: '900' },
  authorRow: { marginTop: 20, flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 42,
    height: 42,
    marginRight: 11,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#292628',
  },
  avatarText: { color: '#FFFFFF', fontSize: 17, fontWeight: '900' },
  authorName: { color: '#373234', fontSize: 14, fontWeight: '800' },
  publishedAt: { marginTop: 3, color: '#9B9396', fontSize: 11 },
  metadataCard: { marginTop: 22, padding: 16, borderRadius: 18, backgroundColor: '#F5EFEB', gap: 14 },
  metadataRow: { minHeight: 26, flexDirection: 'row', alignItems: 'center' },
  metadataIcon: { width: 27 },
  metadataLabel: { width: 68, color: '#8C8286', fontSize: 11, fontWeight: '700' },
  metadataValue: { flex: 1, color: '#373234', fontSize: 13, fontWeight: '800', textAlign: 'right' },
  section: { marginTop: 28 },
  sectionTitle: { color: '#312C2F', fontSize: 17, fontWeight: '900', marginBottom: 12 },
  notes: { color: '#5E565A', fontSize: 15, lineHeight: 24 },
  paramsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  paramItem: { width: '47%', padding: 13, borderRadius: 14, backgroundColor: '#F5EFEB' },
  paramLabel: { color: '#958B8F', fontSize: 10, fontWeight: '800' },
  paramValue: { marginTop: 6, color: '#302B2D', fontSize: 15, fontWeight: '900' },
});

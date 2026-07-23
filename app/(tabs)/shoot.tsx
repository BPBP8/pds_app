import { useRouter } from 'expo-router';
import { collection, doc, increment, onSnapshot, orderBy, query, updateDoc } from 'firebase/firestore';
import React, { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
  type ImageSourcePropType,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { SEED_POSTS, type SeedCategory } from '../../src/data/seed-posts';
import { db } from '../../src/config/firebase';

type Filter = '全部' | SeedCategory;

type RemotePost = {
  id: string;
  imageUrl?: string;
  imageUrls?: string[];
  title?: string;
  userId?: string;
  likes?: number;
  motivation?: string;
  notes?: string;
  params?: Record<string, string>;
};

type FeedItem = {
  id: string;
  category: string;
  title: string;
  hook: string;
  image: ImageSourcePropType;
  likes: number;
  location: string;
  gear: string;
  creator: string;
  source: 'seed' | 'remote';
};

const FILTERS: Filter[] = ['全部', '旅行', '人像', '美食', '宠物'];
const CATEGORIES: SeedCategory[] = ['旅行', '人像', '美食', '宠物'];

const compactNumber = (value: number) =>
  value >= 1000 ? (value / 1000).toFixed(value >= 10000 ? 0 : 1) + 'k' : String(value);

const isSeedCategory = (value?: string): value is SeedCategory =>
  Boolean(value && CATEGORIES.includes(value as SeedCategory));

export default function ShootScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const coverHeight = Math.min(Math.max((Math.min(screenWidth, 520) - 32) * 0.66, 210), 300);
  const [selectedFilter, setSelectedFilter] = useState<Filter>('全部');
  const [remotePosts, setRemotePosts] = useState<RemotePost[]>([]);
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const postsQuery = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    return onSnapshot(
      postsQuery,
      (snapshot) => {
        setRemotePosts(
          snapshot.docs.map((snapshotDoc) => ({
            id: snapshotDoc.id,
            ...(snapshotDoc.data() as Omit<RemotePost, 'id'>),
          })),
        );
      },
      () => setRemotePosts([]),
    );
  }, []);

  const feedItems = useMemo<FeedItem[]>(() => {
    const seedItems: FeedItem[] = SEED_POSTS.map((post) => ({
      id: post.id,
      category: post.category,
      title: post.title,
      hook: post.hook,
      image: post.image.source,
      likes: post.likes,
      location: post.location.label,
      gear: post.gear.camera,
      creator: post.credit.creator,
      source: 'seed',
    }));

    const userItems: FeedItem[] = remotePosts
      .filter((post) => post.imageUrl || post.imageUrls?.[0])
      .map((post) => ({
        id: post.id,
        category: isSeedCategory(post.motivation) ? post.motivation : '生活',
        title: post.title || '刚刚拍到的生活',
        hook: post.notes || '来自用户发布的真实作品。',
        image: { uri: post.imageUrl || post.imageUrls?.[0] },
        likes: post.likes || 0,
        location: '地点未公开',
        gear: post.params?.camera || '设备未公开',
        creator: post.userId ? post.userId.slice(0, 12) : '新朋友',
        source: 'remote',
      }));

    return [...seedItems, ...userItems];
  }, [remotePosts]);

  const visibleItems =
    selectedFilter === '全部'
      ? feedItems
      : feedItems.filter((post) => post.category === selectedFilter);

  const openPost = (item: FeedItem) => {
    router.push({
      pathname: item.source === 'seed' ? '/shot/[id]' : '/post/[id]',
      params: { id: item.id },
    });
  };

  const likePost = async (item: FeedItem) => {
    if (likedPosts[item.id]) return;
    setLikedPosts((current) => ({ ...current, [item.id]: true }));

    if (item.source === 'remote') {
      try {
        await updateDoc(doc(db, 'posts', item.id), { likes: increment(1) });
      } catch {
        setLikedPosts((current) => ({ ...current, [item.id]: false }));
      }
    }
  };

  const renderItem = ({ item }: { item: FeedItem }) => {
    const liked = Boolean(likedPosts[item.id]);
    return (
      <View style={styles.card}>
        <TouchableOpacity activeOpacity={0.94} onPress={() => openPost(item)}>
          <View>
            <Image
              source={item.image}
              style={[styles.cover, { height: coverHeight }]}
              resizeMode="cover"
              accessibilityLabel={item.title}
            />
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{item.category}</Text>
            </View>
          </View>
        </TouchableOpacity>

        <View style={styles.cardBody}>
          <Text style={styles.creditLine}>
            {item.source === 'seed' ? '灵感样片' : '用户作品'} · {item.creator}
          </Text>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.cardHook}>{item.hook}</Text>

          <View style={styles.metaRow}>
            <View style={styles.metaPill}>
              <IconSymbol name="location.fill" size={13} color="#68686D" />
              <Text numberOfLines={1} style={styles.metaText}>{item.location}</Text>
            </View>
            <View style={styles.metaPill}>
              <IconSymbol name="camera.fill" size={13} color="#68686D" />
              <Text numberOfLines={1} style={styles.metaText}>{item.gear}</Text>
            </View>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.likeButton}
              onPress={() => void likePost(item)}
              accessibilityLabel="点赞"
            >
              <IconSymbol
                name={liked ? 'heart.fill' : 'heart'}
                size={20}
                color={liked ? '#FF5A3C' : '#55555A'}
              />
              <Text style={[styles.likeText, liked && styles.likeTextActive]}>
                {compactNumber(item.likes + (liked ? 1 : 0))}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.shootButton} onPress={() => openPost(item)}>
              <Text style={styles.shootButtonText}>我也想拍</Text>
              <IconSymbol name="chevron.right" size={17} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>拍点啥</Text>
          <View style={styles.sunDot} />
        </View>
        <Text style={styles.subtitle}>看见喜欢的，下一张就自己拍</Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContent}
        >
          {FILTERS.map((filter) => {
            const active = selectedFilter === filter;
            return (
              <TouchableOpacity
                key={filter}
                onPress={() => setSelectedFilter(filter)}
                style={[styles.filter, active && styles.filterActive]}
              >
                <Text style={[styles.filterText, active && styles.filterTextActive]}>
                  {filter}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={visibleItems}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        style={styles.feed}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F7F5' },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 18,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ECECEA',
  },
  titleRow: { flexDirection: 'row', alignItems: 'baseline' },
  title: { fontSize: 32, fontWeight: '900', color: '#18181A', letterSpacing: -1.2 },
  sunDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 5,
    backgroundColor: '#FFB547',
  },
  subtitle: { marginTop: 4, color: '#747479', fontSize: 14, fontWeight: '500' },
  filterContent: { paddingTop: 16, paddingRight: 16 },
  filter: {
    backgroundColor: '#F1F1EF',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 18,
    marginRight: 9,
  },
  filterActive: { backgroundColor: '#202022' },
  filterText: { color: '#69696E', fontSize: 13, fontWeight: '700' },
  filterTextActive: { color: '#FFFFFF' },
  list: { padding: 16, paddingBottom: 110 },
  feed: { width: '100%', maxWidth: 720, alignSelf: 'center' },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    overflow: 'hidden',
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#ECECEA',
    shadowColor: '#171719',
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  cover: { width: '100%', backgroundColor: '#ECECEA' },
  categoryBadge: {
    position: 'absolute',
    top: 14,
    left: 14,
    borderRadius: 14,
    paddingHorizontal: 11,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  categoryText: { color: '#222224', fontSize: 12, fontWeight: '800' },
  cardBody: { padding: 16 },
  creditLine: { color: '#8A8A8F', fontSize: 11, fontWeight: '700', marginBottom: 7 },
  cardTitle: { color: '#1C1C1E', fontSize: 21, fontWeight: '900', letterSpacing: -0.4 },
  cardHook: { color: '#68686D', fontSize: 14, lineHeight: 21, marginTop: 7 },
  metaRow: { flexDirection: 'row', marginTop: 14, gap: 8 },
  metaPill: {
    minWidth: 0,
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F4F4F2',
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  metaText: { minWidth: 0, color: '#68686D', fontSize: 11, fontWeight: '600' },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  likeButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
  likeText: { color: '#55555A', fontSize: 13, fontWeight: '700' },
  likeTextActive: { color: '#FF5A3C' },
  shootButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FF5A3C',
    borderRadius: 18,
    paddingLeft: 16,
    paddingRight: 11,
    paddingVertical: 10,
  },
  shootButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
});

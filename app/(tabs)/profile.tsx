import { useRouter } from 'expo-router';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ImageSourcePropType,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { db } from '@/src/config/firebase';
import { SEED_POST_BY_ID } from '@/src/data/seed-posts';
import { useSavedShots } from '@/src/saved-shots-context';

type ProfileTab = 'works' | 'liked' | 'saved';

type RemotePost = {
  id: string;
  imageUrl?: string;
  imageUrls?: string[];
};

type GridItem = {
  id: string;
  image: ImageSourcePropType;
  kind: 'work' | 'saved';
};

const TABS: readonly {
  key: ProfileTab;
  label: string;
  icon: 'square.grid.2x2.fill' | 'heart.fill' | 'bookmark.fill';
}[] = [
  { key: 'works', label: '作品', icon: 'square.grid.2x2.fill' },
  { key: 'liked', label: '喜欢', icon: 'heart.fill' },
  { key: 'saved', label: '想拍', icon: 'bookmark.fill' },
];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ProfileTab>('works');
  const [posts, setPosts] = useState<RemotePost[]>([]);
  const { entries, hydrated, remove } = useSavedShots();

  useEffect(() => {
    const postsQuery = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    return onSnapshot(
      postsQuery,
      (snapshot) => {
        setPosts(
          snapshot.docs.map((snapshotDoc) => ({
            id: snapshotDoc.id,
            ...(snapshotDoc.data() as Omit<RemotePost, 'id'>),
          })),
        );
      },
      () => setPosts([]),
    );
  }, []);

  const workItems = useMemo<GridItem[]>(
    () =>
      posts
        .filter((post) => post.imageUrl || post.imageUrls?.[0])
        .map((post) => ({
          id: post.id,
          image: { uri: post.imageUrl || post.imageUrls?.[0] },
          kind: 'work',
        })),
    [posts],
  );

  const savedItems = useMemo<GridItem[]>(
    () =>
      entries.flatMap((entry) => {
        const post = SEED_POST_BY_ID[entry.postId];
        return post ? [{ id: post.id, image: post.image.source, kind: 'saved' as const }] : [];
      }),
    [entries],
  );

  const visibleItems = activeTab === 'works' ? workItems : activeTab === 'saved' ? savedItems : [];

  const openItem = (item: GridItem) => {
    router.push({
      pathname: item.kind === 'saved' ? '/shot/[id]' : '/post/[id]',
      params: { id: item.id },
    });
  };

  const emptyCopy =
    activeTab === 'saved'
      ? { title: '还没有想拍的照片', body: '看到喜欢的作品时，点击“加入想拍清单”。' }
      : activeTab === 'liked'
        ? { title: '还没有喜欢的作品', body: '你点赞过的作品以后会出现在这里。' }
        : { title: '还没有发布作品', body: '把第一次拍摄练习记录下来吧。' };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <View style={styles.profileHero}>
        <View style={styles.avatar}>
          <IconSymbol name="camera.fill" size={27} color="#FFFFFF" />
        </View>
        <View style={styles.profileCopy}>
          <Text style={styles.username}>拍照练习生</Text>
          <Text style={styles.bio}>把喜欢的灵感，变成下一次拍摄计划。</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <Stat value={workItems.length} label="作品" />
        <Stat value={0} label="喜欢" />
        <Stat value={savedItems.length} label="想拍" />
      </View>

      <TouchableOpacity style={styles.publishButton} onPress={() => router.push('/modal')}>
        <IconSymbol name="camera.fill" size={17} color="#FFFFFF" />
        <Text style={styles.publishButtonText}>发布作品</Text>
      </TouchableOpacity>

      <View style={styles.gridTabs}>
        {TABS.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.gridTab, active && styles.gridTabActive]}
              onPress={() => setActiveTab(tab.key)}
              accessibilityLabel={tab.label}
            >
              <IconSymbol name={tab.icon} size={21} color={active ? '#FF5A3C' : '#8A8A8F'} />
              <Text style={[styles.gridTabText, active && styles.gridTabTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {activeTab === 'saved' && savedItems.length > 0 ? (
        <Text style={styles.deviceNote}>想拍清单保存在此设备</Text>
      ) : null}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
        <Text style={styles.topBarTitle}>我的</Text>
        <TouchableOpacity accessibilityLabel="更多设置">
          <IconSymbol name="line.3.horizontal" size={24} color="#1D1D1F" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={visibleItems}
        keyExtractor={(item) => `${item.kind}-${item.id}`}
        numColumns={3}
        extraData={{ activeTab, hydrated, savedCount: savedItems.length }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.imageGridItem}>
            <TouchableOpacity style={styles.imageButton} onPress={() => openItem(item)}>
              <Image source={item.image} style={styles.gridImage} resizeMode="cover" />
            </TouchableOpacity>
            {item.kind === 'saved' ? (
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => void remove(item.id)}
                accessibilityLabel="移出想拍清单"
              >
                <IconSymbol name="xmark" size={15} color="#FFFFFF" />
              </TouchableOpacity>
            ) : null}
          </View>
        )}
        ListEmptyComponent={
          !hydrated && activeTab === 'saved' ? (
            <View style={styles.emptyState}>
              <ActivityIndicator color="#FF5A3C" />
              <Text style={styles.emptyBody}>正在读取想拍清单</Text>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <IconSymbol
                  name={activeTab === 'saved' ? 'bookmark' : activeTab === 'liked' ? 'heart' : 'camera.fill'}
                  size={28}
                  color="#FF5A3C"
                />
              </View>
              <Text style={styles.emptyTitle}>{emptyCopy.title}</Text>
              <Text style={styles.emptyBody}>{emptyCopy.body}</Text>
              {activeTab === 'saved' ? (
                <TouchableOpacity
                  style={styles.discoverButton}
                  onPress={() => router.push('/(tabs)/shoot')}
                >
                  <Text style={styles.discoverButtonText}>去发现拍摄灵感</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          )
        }
      />
    </View>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statNumber}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
  },
  topBarTitle: { color: '#1D1D1F', fontSize: 26, fontWeight: '900', letterSpacing: -0.6 },
  listContent: { flexGrow: 1, paddingBottom: 110 },
  headerContainer: { paddingHorizontal: 20, paddingTop: 8 },
  profileHero: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF5A3C',
  },
  profileCopy: { flex: 1, marginLeft: 15 },
  username: { color: '#1D1D1F', fontSize: 18, fontWeight: '900' },
  bio: { color: '#737378', fontSize: 13, lineHeight: 19, marginTop: 5 },
  statsRow: {
    flexDirection: 'row',
    marginTop: 22,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: '#F7F7F5',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statNumber: { color: '#1D1D1F', fontSize: 18, fontWeight: '900' },
  statLabel: { color: '#8A8A8F', fontSize: 11, marginTop: 4 },
  publishButton: {
    height: 44,
    marginTop: 14,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: '#202022',
  },
  publishButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  gridTabs: {
    flexDirection: 'row',
    marginTop: 25,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E6E6E3',
  },
  gridTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 13,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  gridTabActive: { borderBottomColor: '#FF5A3C' },
  gridTabText: { color: '#8A8A8F', fontSize: 12, fontWeight: '700' },
  gridTabTextActive: { color: '#FF5A3C' },
  deviceNote: { color: '#9A9A9F', fontSize: 10, marginTop: 11, marginBottom: 4 },
  imageGridItem: {
    width: '33.333%',
    aspectRatio: 1,
    padding: 1.5,
    position: 'relative',
  },
  imageButton: { flex: 1 },
  gridImage: { width: '100%', height: '100%', backgroundColor: '#F1F1EF' },
  removeButton: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 27,
    height: 27,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(24,24,26,0.76)',
  },
  emptyState: { alignItems: 'center', paddingHorizontal: 35, paddingTop: 48 },
  emptyIcon: {
    width: 58,
    height: 58,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF0EA',
  },
  emptyTitle: { color: '#262628', fontSize: 17, fontWeight: '900', marginTop: 16 },
  emptyBody: { color: '#89898E', fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: 7 },
  discoverButton: {
    marginTop: 18,
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 16,
    backgroundColor: '#FF5A3C',
  },
  discoverButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
});

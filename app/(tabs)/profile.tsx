import { useRouter } from 'expo-router';
import { collection, doc, getDoc, limit, onSnapshot, query, where } from 'firebase/firestore';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ImageSourcePropType,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { DEVICE_OPTIONS, useAppPreferences } from '@/src/app-preferences-context';
import { useAuth } from '@/src/auth-context';
import { db } from '@/src/config/firebase';
import { SEED_POST_BY_ID } from '@/src/data/seed-posts';
import { useOnboardingTour, useTourTarget } from '@/src/onboarding-tour-context';
import { useSavedShots, type SavedShotKind } from '@/src/saved-shots-context';

type ProfileTab = 'works' | 'answers' | 'saved';

type RemotePost = {
  id: string;
  imageUrl: string;
  userId: string;
  likes: number;
  title: string;
  createdAt?: { seconds?: number; toMillis?: () => number };
};

type GridItem = {
  id: string;
  image: ImageSourcePropType;
  kind: 'work' | 'saved';
  savedKind?: SavedShotKind;
  likes?: number;
  title?: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const normalizeRemotePost = (id: string, value: unknown): RemotePost | null => {
  if (!isRecord(value)) return null;
  const imageUrl = typeof value.imageUrl === 'string' ? value.imageUrl : '';
  const title = typeof value.title === 'string' ? value.title.trim() : '';
  const userId = typeof value.userId === 'string' ? value.userId : '';
  const likes = value.likes;
  if (
    !imageUrl.startsWith('data:image/jpeg;base64,')
    || imageUrl.length > 800000
    || title.length === 0
    || title.length > 40
    || userId.length === 0
    || userId.length > 128
    || typeof likes !== 'number'
    || !Number.isInteger(likes)
    || likes < 0
  ) {
    return null;
  }

  const rawCreatedAt = value.createdAt;
  const createdAt = isRecord(rawCreatedAt)
    && (typeof rawCreatedAt.toMillis === 'function' || typeof rawCreatedAt.seconds === 'number')
    ? rawCreatedAt as RemotePost['createdAt']
    : undefined;
  return { id, imageUrl, title, userId, likes, createdAt };
};

const TABS: readonly {
  key: ProfileTab;
  label: string;
  icon: React.ComponentProps<typeof IconSymbol>['name'];
}[] = [
  { key: 'works', label: '作品', icon: 'square.grid.2x2.fill' },
  { key: 'answers', label: '回答', icon: 'lightbulb.fill' },
  { key: 'saved', label: '想拍', icon: 'bookmark.fill' },
];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, loading: authLoading, signOut } = useAuth();
  const {
    city,
    device,
    deviceId,
    locationState,
    setDeviceId,
  } = useAppPreferences();
  const {
    active: tourActive,
    postId: tourPostId,
    startTour,
    stepIndex,
    temporarySaved,
  } = useOnboardingTour();
  const listRef = useRef<FlatList<GridItem>>(null);
  const savedTabTourTarget = useTourTarget('profile-saved', {
    prepare: () => listRef.current?.scrollToOffset({ offset: 0, animated: false }),
  });
  const { entries, hydrated, remove, syncError } = useSavedShots();

  const [activeTab, setActiveTab] = useState<ProfileTab>('works');
  const [posts, setPosts] = useState<RemotePost[]>([]);
  const [postsError, setPostsError] = useState('');
  const [savedRemotePosts, setSavedRemotePosts] = useState<Record<string, RemotePost>>({});
  const [savedRemoteLoading, setSavedRemoteLoading] = useState(false);
  const [savedRemoteError, setSavedRemoteError] = useState('');
  const [devicePickerVisible, setDevicePickerVisible] = useState(false);

  useEffect(() => {
    if (!user) {
      setPosts([]);
      setPostsError('');
      return;
    }
    const postsQuery = query(collection(db, 'posts'), where('userId', '==', user.uid), limit(30));
    return onSnapshot(
      postsQuery,
      (snapshot) => {
        setPostsError('');
        setPosts(snapshot.docs
          .flatMap((snapshotDoc) => {
            const normalized = normalizeRemotePost(snapshotDoc.id, snapshotDoc.data());
            return normalized ? [normalized] : [];
          })
          .sort((left, right) => {
            const leftTime = left.createdAt?.toMillis?.() ?? (left.createdAt?.seconds ?? 0) * 1000;
            const rightTime = right.createdAt?.toMillis?.() ?? (right.createdAt?.seconds ?? 0) * 1000;
            return rightTime - leftTime;
          }));
      },
      () => {
        setPostsError('暂时无法读取云端作品，已保留上次内容。');
      },
    );
  }, [user]);

  const remoteSavedIds = useMemo(
    () => entries.filter((entry) => entry.kind === 'remote').map((entry) => entry.postId),
    [entries],
  );

  useEffect(() => {
    setSavedRemotePosts({});
    setSavedRemoteError('');
  }, [user?.uid]);

  useEffect(() => {
    let active = true;
    if (!user || !hydrated) {
      setSavedRemoteLoading(Boolean(user && !hydrated));
      return () => {
        active = false;
      };
    }
    if (remoteSavedIds.length === 0) {
      setSavedRemotePosts({});
      setSavedRemoteError('');
      setSavedRemoteLoading(false);
      return () => {
        active = false;
      };
    }

    setSavedRemoteLoading(true);
    const loadSavedRemotePosts = async () => {
      const results = await Promise.all(remoteSavedIds.map(async (postId) => {
        try {
          const snapshot = await getDoc(doc(db, 'posts', postId));
          if (!snapshot.exists()) {
            return { postId, status: 'missing' as const, post: null };
          }
          const post = normalizeRemotePost(snapshot.id, snapshot.data());
          return { postId, status: post ? 'ready' as const : 'invalid' as const, post };
        } catch {
          return { postId, status: 'error' as const, post: null };
        }
      }));
      if (!active) return;

      setSavedRemotePosts((current) => {
        const next: Record<string, RemotePost> = {};
        for (const result of results) {
          if (result.post) next[result.postId] = result.post;
          else if (result.status === 'error' && current[result.postId]) {
            next[result.postId] = current[result.postId];
          }
        }
        return next;
      });
      if (results.some((result) => result.status === 'error')) {
        setSavedRemoteError('部分想拍作品暂时无法读取，已保留上次内容。');
      } else if (results.some((result) => result.status === 'missing' || result.status === 'invalid')) {
        setSavedRemoteError('部分想拍作品已下架或数据无效。');
      } else {
        setSavedRemoteError('');
      }
      setSavedRemoteLoading(false);
    };
    void loadSavedRemotePosts();

    return () => {
      active = false;
    };
  }, [hydrated, remoteSavedIds, user]);

  const myPosts = useMemo(
    () => user ? posts.filter((post) => post.userId === user.uid) : [],
    [posts, user],
  );

  const openPublish = () => {
    if (user) router.push('/modal');
    else router.push({ pathname: '/auth' as never, params: { returnTo: '/modal' } });
  };

  const workItems = useMemo<GridItem[]>(
    () =>
      myPosts
        .map((post) => ({
          id: post.id,
          image: { uri: post.imageUrl },
          kind: 'work',
          likes: post.likes,
          title: post.title,
        })),
    [myPosts],
  );

  const savedItems = useMemo<GridItem[]>(
    () =>
      entries.flatMap<GridItem>((entry): GridItem[] => {
        if (entry.kind === 'seed') {
          const post = SEED_POST_BY_ID[entry.postId];
          return post
            ? [{
                id: post.id,
                image: post.image.source,
                kind: 'saved' as const,
                savedKind: 'seed' as const,
                likes: post.likes,
                title: post.title,
              }]
            : [];
        }

        const post = savedRemotePosts[entry.postId];
        return post
          ? [{
              id: post.id,
              image: { uri: post.imageUrl },
              kind: 'saved' as const,
              savedKind: 'remote' as const,
              likes: post.likes,
              title: post.title,
            }]
          : [];
      }),
    [entries, savedRemotePosts],
  );

  const displayedSavedItems = useMemo<GridItem[]>(() => {
    if (!tourActive || !temporarySaved || !tourPostId) return savedItems;
    if (savedItems.some((item) => item.id === tourPostId)) return savedItems;
    const post = SEED_POST_BY_ID[tourPostId];
    if (!post) return savedItems;
    return [
      {
        id: post.id,
        image: post.image.source,
        kind: 'saved',
        savedKind: 'seed',
        likes: post.likes,
        title: post.title,
      },
      ...savedItems,
    ];
  }, [savedItems, temporarySaved, tourActive, tourPostId]);

  const displayedTab: ProfileTab =
    tourActive && stepIndex === 4 ? 'saved' : activeTab;
  const cumulativeLikes = myPosts.reduce((sum, post) => sum + (post.likes || 0), 0);
  const visibleItems =
    displayedTab === 'works'
      ? workItems
      : displayedTab === 'saved'
        ? displayedSavedItems
        : [];

  const openItem = (item: GridItem) => {
    router.push({
      pathname: item.kind === 'saved' && item.savedKind !== 'remote' ? '/shot/[id]' : '/post/[id]',
      params: { id: item.id },
    });
  };

  const removeSavedItem = async (item: GridItem) => {
    if (item.kind !== 'saved' || !item.savedKind) return;
    try {
      await remove(item.id, item.savedKind);
    } catch {
      Alert.alert('同步失败', '作品仍在想拍清单中，请检查网络后重试。');
    }
  };

  const emptyCopy =
    displayedTab === 'saved'
      ? {
          title: '还没有想拍的照片',
          body: user
            ? '看到心动的作品后，进入详情点“加入想拍清单”。'
            : '登录后可把想拍作品同步到账号，并在其他设备继续查看。',
          icon: 'bookmark' as const,
        }
      : activeTab === 'answers'
        ? {
            title: '还没有公开回答',
            body: '问答是解决具体拍摄问题的地方；你的回答会展示在个人主页。',
            icon: 'lightbulb.fill' as const,
          }
        : {
            title: '还没有发布作品',
            body: '先发布一张单图；作品名称必填，设备与时间会尽量从照片读取。',
            icon: 'camera.fill' as const,
          };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <View style={styles.profileHero}>
        <View style={styles.avatar}>
          <IconSymbol name="camera.fill" size={27} color="#FFFFFF" />
        </View>
        <View style={styles.profileCopy}>
          <View style={styles.nameRow}>
            <Text style={styles.username}>
              {user?.displayName || user?.email?.split('@')[0] || '登录后开始记录'}
            </Text>
            <View style={styles.localBadge}>
              <Text style={styles.localBadgeText}>{user ? '云端同步' : '未登录'}</Text>
            </View>
          </View>
          <Text style={styles.bio}>
            {user?.email || '登录后可发布作品，并在换手机后继续使用。'}
          </Text>
        </View>
      </View>

      {!authLoading && !user ? (
        <TouchableOpacity
          style={styles.loginCard}
          onPress={() => router.push({ pathname: '/auth' as never, params: { returnTo: '/(tabs)/profile' } })}
        >
          <View style={styles.loginCardIcon}><IconSymbol name="lock.fill" size={18} color="#FFFFFF" /></View>
          <View style={styles.loginCardCopy}>
            <Text style={styles.loginCardTitle}>登录或注册</Text>
            <Text style={styles.loginCardBody}>邮箱密码登录，作品和想拍清单同步到账号</Text>
          </View>
          <IconSymbol name="chevron.right" size={18} color="#D85331" />
        </TouchableOpacity>
      ) : null}

      <View style={styles.statsRow}>
        <Stat value={workItems.length} label="作品" />
        <View style={styles.statDivider} />
        <Stat value={cumulativeLikes} label="累计获赞" />
        <View style={styles.statDivider} />
        <Stat value={displayedSavedItems.length} label="想拍" />
      </View>

      <TouchableOpacity
        style={styles.shootingProfile}
        activeOpacity={0.86}
        onPress={() => setDevicePickerVisible(true)}
      >
        <View style={styles.shootingProfileIcon}>
          <IconSymbol name="iphone" size={22} color="#FFFFFF" />
        </View>
        <View style={styles.shootingProfileCopy}>
          <Text style={styles.cardEyebrow}>常用设备</Text>
          <Text style={styles.shootingProfileTitle}>{device.name}</Text>
          <Text style={styles.shootingProfileBody}>
            {city} · {locationState === 'ready' ? '已显示实际距离' : '未开启位置'}
          </Text>
        </View>
        <View style={styles.editDevicePill}>
          <Text style={styles.editDeviceText}>更换</Text>
          <IconSymbol name="chevron.right" size={15} color="#C64C2F" />
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={styles.publishButton} onPress={openPublish}>
        <IconSymbol name="camera.fill" size={18} color="#FFFFFF" />
        <Text style={styles.publishButtonText}>发布单图作品</Text>
      </TouchableOpacity>
      <Text style={styles.publishHint}>只需填写作品名称；设备、时间和参数可从照片信息带入后确认</Text>
      {postsError ? <Text style={styles.postsError}>{postsError}</Text> : null}
      {displayedTab === 'saved' && (syncError || savedRemoteError) ? (
        <Text style={styles.postsError}>{syncError || savedRemoteError}</Text>
      ) : null}

      <View style={styles.gridTabs}>
        {TABS.map((tab) => {
          const active = displayedTab === tab.key;
          return (
            <TouchableOpacity
              ref={tab.key === 'saved' ? savedTabTourTarget.ref : undefined}
              onLayout={tab.key === 'saved' ? savedTabTourTarget.onLayout : undefined}
              key={tab.key}
              style={[styles.gridTab, active && styles.gridTabActive]}
              onPress={() => setActiveTab(tab.key)}
              accessibilityLabel={tab.label}
            >
              <IconSymbol name={tab.icon} size={19} color={active ? '#D85331' : '#938D90'} />
              <Text style={[styles.gridTabText, active && styles.gridTabTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {displayedTab === 'saved' && displayedSavedItems.length > 0 ? (
        <View style={styles.savedSummary}>
          <View>
            <Text style={styles.savedSummaryTitle}>下一张，从这里挑</Text>
            <Text style={styles.savedSummaryBody}>想拍清单按加入时间同步到当前账号</Text>
          </View>
          <Text style={styles.savedSummaryCount}>{displayedSavedItems.length}</Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
        <Text style={styles.topBarTitle}>我的</Text>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => setDevicePickerVisible(true)}
          accessibilityLabel="拍摄档案设置"
        >
          <IconSymbol name="gearshape.fill" size={21} color="#252527" />
        </TouchableOpacity>
      </View>

      <FlatList
        ref={listRef}
        data={visibleItems}
        keyExtractor={(item) => `${item.kind}-${item.savedKind ?? 'work'}-${item.id}`}
        numColumns={3}
        extraData={{
          displayedTab,
          hydrated,
          savedCount: displayedSavedItems.length,
          tourActive,
        }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.imageGridItem}>
            <TouchableOpacity style={styles.imageButton} onPress={() => openItem(item)}>
              <Image source={item.image} style={styles.gridImage} resizeMode="cover" />
              {item.likes ? (
                <View style={styles.imageLikes}>
                  <IconSymbol name="heart.fill" size={12} color="#FFFFFF" />
                  <Text style={styles.imageLikesText}>{item.likes}</Text>
                </View>
              ) : null}
            </TouchableOpacity>
            {item.kind === 'saved' ? (
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => void removeSavedItem(item)}
                accessibilityLabel="移出想拍清单"
              >
                <IconSymbol name="xmark" size={15} color="#FFFFFF" />
              </TouchableOpacity>
            ) : null}
          </View>
        )}
        ListEmptyComponent={
          displayedTab === 'saved'
          && (!hydrated || (savedRemoteLoading && displayedSavedItems.length === 0)) ? (
            <View style={styles.emptyState}>
              <ActivityIndicator color="#D85331" />
              <Text style={styles.emptyBody}>正在读取想拍清单</Text>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <IconSymbol name={emptyCopy.icon} size={28} color="#D85331" />
              </View>
              <Text style={styles.emptyTitle}>{emptyCopy.title}</Text>
              <Text style={styles.emptyBody}>{emptyCopy.body}</Text>
              {displayedTab === 'saved' ? (
                <TouchableOpacity
                  style={styles.emptyAction}
                  onPress={() => router.push('/(tabs)/shoot')}
                >
                  <Text style={styles.emptyActionText}>去找拍摄灵感</Text>
                </TouchableOpacity>
              ) : displayedTab === 'answers' ? (
                <TouchableOpacity
                  style={styles.emptyAction}
                  onPress={() => router.push('/(tabs)/questions')}
                >
                  <Text style={styles.emptyActionText}>看看大家在问什么</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.emptyAction} onPress={openPublish}>
                  <Text style={styles.emptyActionText}>{user ? '发布第一张作品' : '登录后发布作品'}</Text>
                </TouchableOpacity>
              )}
            </View>
          )
        }
      />

      <Modal
        visible={devicePickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDevicePickerVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setDevicePickerVisible(false)}>
          <Pressable style={styles.deviceSheet} onPress={() => undefined}>
            <View style={styles.sheetHandle} />
            <Text style={styles.cardEyebrow}>我的设备</Text>
            <Text style={styles.sheetTitle}>你现在主要用什么拍？</Text>
            <Text style={styles.sheetBody}>选一个你最常用的设备。</Text>

            <View style={styles.deviceOptions}>
              {DEVICE_OPTIONS.map((option) => {
                const selected = option.id === deviceId;
                return (
                  <TouchableOpacity
                    key={option.id}
                    style={[styles.deviceOption, selected && styles.deviceOptionSelected]}
                    onPress={() => {
                      void setDeviceId(option.id).then(() => setDevicePickerVisible(false));
                    }}
                  >
                    <View style={[styles.deviceOptionIcon, selected && styles.deviceOptionIconSelected]}>
                      <IconSymbol
                        name={option.kind === 'drone' ? 'paperplane.fill' : option.kind === 'camera' ? 'camera.fill' : 'iphone'}
                        size={20}
                        color={selected ? '#FFFFFF' : '#5F5A5D'}
                      />
                    </View>
                    <View style={styles.deviceOptionCopy}>
                      <Text style={styles.deviceOptionTitle}>{option.name}</Text>
                      <Text numberOfLines={2} style={styles.deviceOptionBody}>{option.description}</Text>
                    </View>
                    <IconSymbol
                      name={selected ? 'checkmark.circle.fill' : 'chevron.right'}
                      size={21}
                      color={selected ? '#D85331' : '#AAA4A7'}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity
              style={styles.restartGuideButton}
              onPress={() => {
                setDevicePickerVisible(false);
                startTour();
              }}
            >
              <IconSymbol name="sparkles" size={16} color="#C64C2F" />
              <Text style={styles.restartGuideText}>开始新手教程</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.accountButton}
              onPress={() => {
                setDevicePickerVisible(false);
                if (user) {
                  Alert.alert('退出登录', '退出后本机仍保留浏览偏好，云端作品不会删除。', [
                    { text: '取消', style: 'cancel' },
                    { text: '退出', style: 'destructive', onPress: () => void signOut() },
                  ]);
                } else {
                  router.push({ pathname: '/auth' as never, params: { returnTo: '/(tabs)/profile' } });
                }
              }}
            >
              <Text style={styles.accountButtonText}>{user ? '退出登录' : '登录 / 注册'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sheetCloseButton} onPress={() => setDevicePickerVisible(false)}>
              <Text style={styles.sheetCloseText}>暂时不改</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
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
  container: { flex: 1, backgroundColor: '#FFFDFC' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingBottom: 11,
    backgroundColor: '#FFFDFC',
  },
  topBarTitle: { color: '#202022', fontSize: 27, fontWeight: '900', letterSpacing: -0.7 },
  settingsButton: {
    width: 39,
    height: 39,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1EDE8',
  },
  listContent: { flexGrow: 1, paddingBottom: 112 },
  headerContainer: { paddingHorizontal: 18, paddingTop: 8 },
  profileHero: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D85331',
  },
  profileCopy: { flex: 1, marginLeft: 14 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  username: { flexShrink: 1, color: '#202022', fontSize: 18, fontWeight: '900' },
  localBadge: { paddingHorizontal: 7, paddingVertical: 4, borderRadius: 8, backgroundColor: '#EFEAE6' },
  localBadgeText: { color: '#817A7D', fontSize: 8, fontWeight: '800' },
  bio: { color: '#777176', fontSize: 12, lineHeight: 18, marginTop: 5 },
  loginCard: { marginTop: 15, padding: 13, borderRadius: 18, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF0E9', borderWidth: 1, borderColor: '#F1D2C4' },
  loginCardIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#D85331' },
  loginCardCopy: { flex: 1, marginHorizontal: 10 },
  loginCardTitle: { color: '#3D302D', fontSize: 13, fontWeight: '900' },
  loginCardBody: { marginTop: 3, color: '#90766D', fontSize: 9 },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 21,
    paddingVertical: 15,
    borderRadius: 18,
    backgroundColor: '#F5F1EC',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statNumber: { color: '#252325', fontSize: 18, fontWeight: '900' },
  statLabel: { color: '#8F898C', fontSize: 10, marginTop: 4 },
  statDivider: { width: 1, height: 27, backgroundColor: '#DED8D2' },
  shootingProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 13,
    padding: 13,
    borderRadius: 19,
    backgroundColor: '#FFF0E9',
    borderWidth: 1,
    borderColor: '#F1D2C4',
  },
  shootingProfileIcon: {
    width: 43,
    height: 43,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#252527',
  },
  shootingProfileCopy: { flex: 1, marginLeft: 11 },
  cardEyebrow: { color: '#D85331', fontSize: 9, fontWeight: '900', letterSpacing: 0.7 },
  shootingProfileTitle: { color: '#282527', fontSize: 14, fontWeight: '900', marginTop: 3 },
  shootingProfileBody: { color: '#887B76', fontSize: 9, marginTop: 3 },
  editDevicePill: { flexDirection: 'row', alignItems: 'center', marginLeft: 6 },
  editDeviceText: { color: '#C64C2F', fontSize: 10, fontWeight: '900' },
  publishButton: {
    height: 48,
    marginTop: 13,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: '#252527',
  },
  publishButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  publishHint: { color: '#9B9598', fontSize: 9, lineHeight: 14, textAlign: 'center', marginTop: 7 },
  postsError: { color: '#B94931', fontSize: 10, lineHeight: 15, textAlign: 'center', marginTop: 7 },
  gridTabs: {
    flexDirection: 'row',
    marginTop: 23,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E4DED9',
  },
  gridTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  gridTabActive: { borderBottomColor: '#D85331' },
  gridTabText: { color: '#938D90', fontSize: 11, fontWeight: '800' },
  gridTabTextActive: { color: '#D85331' },
  savedSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 13,
    marginBottom: 4,
    padding: 13,
    borderRadius: 15,
    backgroundColor: '#F5F1EC',
  },
  savedSummaryTitle: { color: '#2A2728', fontSize: 12, fontWeight: '900' },
  savedSummaryBody: { color: '#938D90', fontSize: 9, marginTop: 3 },
  savedSummaryCount: { color: '#D85331', fontSize: 22, fontWeight: '900' },
  imageGridItem: { width: '33.333%', aspectRatio: 1, padding: 1.5, position: 'relative' },
  imageButton: { flex: 1 },
  gridImage: { width: '100%', height: '100%', backgroundColor: '#ECE7E2' },
  imageLikes: {
    position: 'absolute',
    left: 7,
    bottom: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 9,
    backgroundColor: 'rgba(24,23,24,0.68)',
  },
  imageLikesText: { color: '#FFFFFF', fontSize: 8, fontWeight: '800' },
  removeButton: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 27,
    height: 27,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(24,23,24,0.76)',
  },
  emptyState: { alignItems: 'center', paddingHorizontal: 35, paddingTop: 42 },
  emptyIcon: {
    width: 58,
    height: 58,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF0E9',
  },
  emptyTitle: { color: '#282527', fontSize: 17, fontWeight: '900', marginTop: 15 },
  emptyBody: { color: '#898386', fontSize: 12, lineHeight: 19, textAlign: 'center', marginTop: 6 },
  emptyAction: {
    marginTop: 17,
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 15,
    backgroundColor: '#D85331',
  },
  emptyActionText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
  modalBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    padding: 12,
    backgroundColor: 'rgba(23,21,22,0.48)',
  },
  deviceSheet: {
    width: '100%',
    maxWidth: 410,
    padding: 20,
    paddingBottom: 24,
    borderRadius: 28,
    backgroundColor: '#FFFDFC',
  },
  sheetHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 18,
    backgroundColor: '#D8D1CC',
  },
  sheetTitle: { color: '#222022', fontSize: 22, fontWeight: '900', letterSpacing: -0.5, marginTop: 5 },
  sheetBody: { color: '#777176', fontSize: 11, lineHeight: 18, marginTop: 7 },
  deviceOptions: { marginTop: 16, gap: 8 },
  deviceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 11,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8E2DD',
    backgroundColor: '#FAF7F4',
  },
  deviceOptionSelected: { borderColor: '#E9B7A3', backgroundColor: '#FFF0E9' },
  deviceOptionIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECE7E2',
  },
  deviceOptionIconSelected: { backgroundColor: '#D85331' },
  deviceOptionCopy: { flex: 1, marginHorizontal: 10 },
  deviceOptionTitle: { color: '#282527', fontSize: 12, fontWeight: '900' },
  deviceOptionBody: { color: '#8D878A', fontSize: 9, lineHeight: 14, marginTop: 3 },
  restartGuideButton: {
    height: 43,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    borderRadius: 14,
    backgroundColor: '#FFF0E9',
  },
  restartGuideText: { color: '#C64C2F', fontSize: 11, fontWeight: '900' },
  accountButton: { height: 43, alignItems: 'center', justifyContent: 'center', marginTop: 9, borderRadius: 14, borderWidth: 1, borderColor: '#E7DFDB', backgroundColor: '#FFFFFF' },
  accountButtonText: { color: '#8B4640', fontSize: 11, fontWeight: '900' },
  sheetCloseButton: {
    height: 47,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 15,
    borderRadius: 16,
    backgroundColor: '#252527',
  },
  sheetCloseText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
});

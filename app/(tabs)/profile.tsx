import { useRouter } from 'expo-router';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
import { db } from '@/src/config/firebase';
import { SEED_POST_BY_ID } from '@/src/data/seed-posts';
import { useOnboardingTour, useTourTarget } from '@/src/onboarding-tour-context';
import { useSavedShots } from '@/src/saved-shots-context';

type ProfileTab = 'works' | 'answers' | 'saved';

type RemotePost = {
  id: string;
  imageUrl?: string;
  imageUrls?: string[];
  userId?: string;
  likes?: number;
  title?: string;
};

type GridItem = {
  id: string;
  image: ImageSourcePropType;
  kind: 'work' | 'saved';
  likes?: number;
  title?: string;
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
  const savedTabTourTarget = useTourTarget('profile-saved');
  const { entries, hydrated, remove } = useSavedShots();

  const [activeTab, setActiveTab] = useState<ProfileTab>('works');
  const [posts, setPosts] = useState<RemotePost[]>([]);
  const [devicePickerVisible, setDevicePickerVisible] = useState(false);

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

  const myPosts = useMemo(
    () => posts.filter((post) => post.userId === 'guest'),
    [posts],
  );

  const workItems = useMemo<GridItem[]>(
    () =>
      myPosts
        .filter((post) => post.imageUrl || post.imageUrls?.[0])
        .map((post) => ({
          id: post.id,
          image: { uri: post.imageUrl || post.imageUrls?.[0] },
          kind: 'work',
          likes: post.likes || 0,
          title: post.title,
        })),
    [myPosts],
  );

  const savedItems = useMemo<GridItem[]>(
    () =>
      entries.flatMap((entry) => {
        const post = SEED_POST_BY_ID[entry.postId];
        return post
          ? [{
              id: post.id,
              image: post.image.source,
              kind: 'saved' as const,
              likes: post.likes,
              title: post.title,
            }]
          : [];
      }),
    [entries],
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
      pathname: item.kind === 'saved' ? '/shot/[id]' : '/post/[id]',
      params: { id: item.id },
    });
  };

  const emptyCopy =
    displayedTab === 'saved'
      ? {
          title: '还没有想拍的照片',
          body: '看到心动的作品后，进入详情点“加入想拍清单”。',
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
            <Text style={styles.username}>北京拍照练习生</Text>
            <View style={styles.localBadge}>
              <Text style={styles.localBadgeText}>本机保存</Text>
            </View>
          </View>
          <Text style={styles.bio}>把喜欢的灵感，变成下一张自己拍的照片。</Text>
        </View>
      </View>

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

      <TouchableOpacity style={styles.publishButton} onPress={() => router.push('/modal')}>
        <IconSymbol name="camera.fill" size={18} color="#FFFFFF" />
        <Text style={styles.publishButtonText}>发布单图作品</Text>
      </TouchableOpacity>
      <Text style={styles.publishHint}>只需填写作品名称；设备、时间和参数可从照片信息带入后确认</Text>

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
            <Text style={styles.savedSummaryBody}>想拍清单按加入时间保存在本机</Text>
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
        data={visibleItems}
        keyExtractor={(item) => `${item.kind}-${item.id}`}
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
                onPress={() => void remove(item.id)}
                accessibilityLabel="移出想拍清单"
              >
                <IconSymbol name="xmark" size={15} color="#FFFFFF" />
              </TouchableOpacity>
            ) : null}
          </View>
        )}
        ListEmptyComponent={
          !hydrated && displayedTab === 'saved' ? (
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
                <TouchableOpacity style={styles.emptyAction} onPress={() => router.push('/modal')}>
                  <Text style={styles.emptyActionText}>发布第一张作品</Text>
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
  username: { color: '#202022', fontSize: 18, fontWeight: '900' },
  localBadge: { paddingHorizontal: 7, paddingVertical: 4, borderRadius: 8, backgroundColor: '#EFEAE6' },
  localBadgeText: { color: '#817A7D', fontSize: 8, fontWeight: '800' },
  bio: { color: '#777176', fontSize: 12, lineHeight: 18, marginTop: 5 },
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

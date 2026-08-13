import { useRouter } from 'expo-router';
import { collection, doc, increment, onSnapshot, orderBy, query, updateDoc } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAppPreferences } from '@/src/app-preferences-context';
import { db } from '@/src/config/firebase';
import { SEED_POSTS, type SeedCategory, type SeedPost } from '@/src/data/seed-posts';
import { formatDistance } from '@/src/distance';
import { useOnboardingTour, useTourTarget } from '@/src/onboarding-tour-context';
import { useSavedShots } from '@/src/saved-shots-context';

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

const FILTERS: readonly Filter[] = ['全部', '旅行', '人像', '美食', '宠物'];

const compactNumber = (value: number) =>
  value >= 1000 ? `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k` : String(value);

export default function ShootScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    city,
    coordinates,
    device,
    locationState,
    requestLocation,
  } = useAppPreferences();
  const {
    active: tourActive,
    categoryOverride,
    startTour,
  } = useOnboardingTour();
  const filterTourTarget = useTourTarget('shoot-category');
  const featureTourTarget = useTourTarget('shoot-featured-post');
  const { isSaved } = useSavedShots();

  const [selectedFilter, setSelectedFilter] = useState<Filter>('全部');
  const [remotePosts, setRemotePosts] = useState<RemotePost[]>([]);
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});
  const [cityPickerVisible, setCityPickerVisible] = useState(false);

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

  const displayedFilter: Filter =
    tourActive &&
    categoryOverride &&
    FILTERS.includes(categoryOverride as Filter)
      ? (categoryOverride as Filter)
      : selectedFilter;

  const visibleSeedPosts = useMemo(() => {
    const posts =
      displayedFilter === '全部'
        ? [...SEED_POSTS]
        : SEED_POSTS.filter((post) => post.category === displayedFilter);

    return posts.sort((left, right) => {
      const leftMatches = left.deviceKinds.includes(device.kind) ? 1 : 0;
      const rightMatches = right.deviceKinds.includes(device.kind) ? 1 : 0;
      if (leftMatches !== rightMatches) return rightMatches - leftMatches;
      if (Boolean(left.featured) !== Boolean(right.featured)) return left.featured ? -1 : 1;
      return right.likes - left.likes;
    });
  }, [device.kind, displayedFilter]);

  const featurePost = visibleSeedPosts[0];
  const gridPosts = visibleSeedPosts.slice(1);

  const openSeedPost = (post: SeedPost) => {
    router.push({ pathname: '/shot/[id]', params: { id: post.id } });
  };

  const openRemotePost = (post: RemotePost) => {
    router.push({ pathname: '/post/[id]', params: { id: post.id } });
  };

  const likePost = async (id: string, source: 'seed' | 'remote') => {
    if (likedPosts[id]) return;
    setLikedPosts((current) => ({ ...current, [id]: true }));

    if (source === 'remote') {
      try {
        await updateDoc(doc(db, 'posts', id), { likes: increment(1) });
      } catch {
        setLikedPosts((current) => ({ ...current, [id]: false }));
      }
    }
  };

  const distanceFor = (post: SeedPost) =>
    formatDistance(coordinates, post.location.coordinates) ?? post.location.shortLabel;

  const locationButtonCopy =
    locationState === 'ready'
      ? '已显示实际距离'
      : locationState === 'requesting'
        ? '正在获取位置…'
        : locationState === 'denied'
          ? '未开启位置'
          : locationState === 'error'
            ? '暂时无法定位，点此重试'
            : '显示我附近的作品';

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 12, paddingBottom: 112 + insets.bottom },
        ]}
      >
        <View style={styles.header}>
          <View>
            <View style={styles.brandRow}>
              <Text style={styles.brand}>拍点啥</Text>
              <View style={styles.brandDot} />
            </View>
            <Text style={styles.brandSubtitle}>看见喜欢的，下一张就自己拍</Text>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.tourEntry}
              onPress={() => startTour()}
              accessibilityLabel="开始新手教程"
            >
              <IconSymbol name="sparkles" size={14} color="#C64C2F" />
              <Text style={styles.tourEntryText}>新手教程</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cityButton}
              onPress={() => setCityPickerVisible(true)}
              accessibilityLabel="选择目的地城市"
            >
              <IconSymbol name="location.fill" size={15} color="#D85331" />
              <Text style={styles.cityButtonText}>{city}</Text>
              <IconSymbol name="chevron.down" size={16} color="#D85331" />
            </TouchableOpacity>
          </View>
        </View>

        <View
          {...filterTourTarget}
          style={styles.filterWrap}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterContent}
          >
            {FILTERS.map((filter) => {
              const active = displayedFilter === filter;
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

        {featurePost ? (
          <View style={styles.featureSection}>
            <View style={styles.sectionHeading}>
              <View>
                <Text style={styles.sectionEyebrow}>北京今日灵感</Text>
                <Text style={styles.sectionTitle}>
                  {displayedFilter === '全部' ? '今天想拍这一张' : `${displayedFilter}灵感`}
                </Text>
              </View>
              <View style={styles.livePill}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>{city}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.featureCard}
              activeOpacity={0.94}
              onPress={() => openSeedPost(featurePost)}
            >
              <Image
                source={featurePost.image.source}
                style={styles.featureImage}
                resizeMode="cover"
                accessibilityLabel={featurePost.image.alt}
              />
              <View style={styles.featureTopBadges}>
                <View style={styles.glassBadge}>
                  <IconSymbol name="location.fill" size={12} color="#FFFFFF" />
                  <Text style={styles.glassBadgeText}>{distanceFor(featurePost)}</Text>
                </View>
                <View style={styles.glassBadge}>
                  <IconSymbol name="iphone" size={12} color="#FFFFFF" />
                  <Text style={styles.glassBadgeText}>
                    {featurePost.deviceKinds.includes(device.kind) ? `${device.shortName}可拍` : '方法可参考'}
                  </Text>
                </View>
              </View>

              <View style={styles.featureOverlay}>
                <Text style={styles.featureTime}>{featurePost.time.shootingWindow}</Text>
                <Text style={styles.featureTitle}>{featurePost.title}</Text>
                <Text numberOfLines={2} style={styles.featureHook}>{featurePost.hook}</Text>
                <View style={styles.featureFooter}>
                  <View style={styles.featureLikes}>
                    <IconSymbol
                      name={likedPosts[featurePost.id] ? 'heart.fill' : 'heart'}
                      size={18}
                      color={likedPosts[featurePost.id] ? '#FF8B70' : '#FFFFFF'}
                    />
                    <Text style={styles.featureLikesText}>
                      {compactNumber(featurePost.likes + (likedPosts[featurePost.id] ? 1 : 0))}
                    </Text>
                  </View>
                  <View {...featureTourTarget} style={styles.featureCta}>
                    <Text style={styles.featureCtaText}>查看地点与拍法</Text>
                    <IconSymbol name="chevron.right" size={17} color="#1B1B1D" />
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        ) : null}

        {gridPosts.length > 0 ? (
          <View style={styles.gridSection}>
            <View style={styles.sectionHeading}>
              <View>
                <Text style={styles.sectionEyebrow}>北京人也在拍</Text>
                <Text style={styles.sectionTitle}>地标之外，还有生活</Text>
              </View>
              <Text style={styles.resultCount}>{visibleSeedPosts.length} 个灵感</Text>
            </View>

            <View style={styles.grid}>
              {gridPosts.map((post) => {
                const liked = Boolean(likedPosts[post.id]);
                return (
                  <View key={post.id} style={styles.gridCard}>
                    <TouchableOpacity activeOpacity={0.94} onPress={() => openSeedPost(post)}>
                      <View>
                        <Image
                          source={post.image.source}
                          style={styles.gridImage}
                          resizeMode="cover"
                          accessibilityLabel={post.image.alt}
                        />
                        <View style={styles.gridDistanceBadge}>
                          <Text style={styles.gridDistanceText}>{distanceFor(post)}</Text>
                        </View>
                        {isSaved(post.id) ? (
                          <View style={styles.savedBadge}>
                            <IconSymbol name="bookmark.fill" size={14} color="#FFFFFF" />
                          </View>
                        ) : null}
                      </View>
                    </TouchableOpacity>

                    <View style={styles.gridCardBody}>
                      <View style={styles.gridContextRow}>
                        <Text style={styles.gridCategory}>{post.category}</Text>
                        <Text numberOfLines={1} style={styles.gridTime}>{post.time.shootingWindow}</Text>
                      </View>
                      <Text numberOfLines={2} style={styles.gridTitle}>{post.title}</Text>
                      <View style={styles.gridDeviceRow}>
                        <IconSymbol name="camera.fill" size={13} color="#777176" />
                        <Text numberOfLines={1} style={styles.gridDevice}>
                          {post.deviceKinds.includes(device.kind) ? `${device.shortName}可拍` : post.gear.camera}
                        </Text>
                      </View>
                      <View style={styles.gridActions}>
                        <TouchableOpacity
                          style={styles.heartButton}
                          onPress={() => void likePost(post.id, 'seed')}
                          accessibilityLabel="点赞作品"
                        >
                          <IconSymbol
                            name={liked ? 'heart.fill' : 'heart'}
                            size={17}
                            color={liked ? '#E85A3A' : '#6E696C'}
                          />
                          <Text style={[styles.heartCount, liked && styles.heartCountActive]}>
                            {compactNumber(post.likes + (liked ? 1 : 0))}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.wantButton}
                          onPress={() => openSeedPost(post)}
                          accessibilityLabel={`查看拍法：${post.title}`}
                        >
                          <Text style={styles.wantButtonText}>查看拍法</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        ) : null}

        {remotePosts.some((post) => post.imageUrl || post.imageUrls?.[0]) ? (
          <View style={styles.communitySection}>
            <View style={styles.sectionHeading}>
              <View>
                <Text style={styles.sectionEyebrow}>刚刚发布</Text>
                <Text style={styles.sectionTitle}>用户的单图作品</Text>
              </View>
            </View>
            {remotePosts
              .filter((post) => post.imageUrl || post.imageUrls?.[0])
              .slice(0, 4)
              .map((post) => {
                const liked = Boolean(likedPosts[post.id]);
                return (
                  <TouchableOpacity
                    key={post.id}
                    style={styles.remoteCard}
                    activeOpacity={0.9}
                    onPress={() => openRemotePost(post)}
                  >
                    <Image
                      source={{ uri: post.imageUrl || post.imageUrls?.[0] }}
                      style={styles.remoteImage}
                      resizeMode="cover"
                    />
                    <View style={styles.remoteCopy}>
                      <Text style={styles.remoteTitle}>{post.title || '刚刚拍到的北京'}</Text>
                      <Text numberOfLines={2} style={styles.remoteBody}>
                        {post.notes || '用户发布的真实单图作品'}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.remoteLike}
                      onPress={() => void likePost(post.id, 'remote')}
                      accessibilityLabel="点赞用户作品"
                    >
                      <IconSymbol
                        name={liked ? 'heart.fill' : 'heart'}
                        size={19}
                        color={liked ? '#E85A3A' : '#6E696C'}
                      />
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              })}
          </View>
        ) : null}
      </ScrollView>

      <Modal
        visible={cityPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCityPickerVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setCityPickerVisible(false)}>
          <Pressable style={styles.citySheet} onPress={() => undefined}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetEyebrow}>选择城市</Text>
            <Text style={styles.sheetTitle}>想去哪拍？</Text>
            <Text style={styles.sheetBody}>选择城市，看看当地的照片和拍法。</Text>

            <View style={styles.selectedCityCard}>
              <View style={styles.selectedCityIcon}>
                <IconSymbol name="location.fill" size={21} color="#FFFFFF" />
              </View>
              <View style={styles.selectedCityCopy}>
                <Text style={styles.selectedCityTitle}>北京</Text>
                <Text style={styles.selectedCityBody}>故宫、天坛、胡同与城市夜景</Text>
              </View>
              <IconSymbol name="checkmark.circle.fill" size={24} color="#D85331" />
            </View>

            <TouchableOpacity
              style={[
                styles.locationPermissionButton,
                locationState === 'ready' && styles.locationPermissionButtonReady,
              ]}
              onPress={() => void requestLocation()}
              disabled={locationState === 'requesting' || locationState === 'ready'}
            >
              <IconSymbol
                name="location.circle.fill"
                size={19}
                color={locationState === 'ready' ? '#28734B' : '#252527'}
              />
              <Text
                style={[
                  styles.locationPermissionText,
                  locationState === 'ready' && styles.locationPermissionTextReady,
                ]}
              >
                {locationButtonCopy}
              </Text>
            </TouchableOpacity>

            <Text style={styles.privacyNote}>开启定位后，会显示每张作品离你多远。</Text>
            <TouchableOpacity style={styles.sheetCloseButton} onPress={() => setCityPickerVisible(false)}>
              <Text style={styles.sheetCloseText}>完成</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F1EC' },
  scrollContent: { width: '100%', maxWidth: 720, alignSelf: 'center', paddingHorizontal: 16 },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  brandRow: { flexDirection: 'row', alignItems: 'baseline' },
  brand: { color: '#19191B', fontSize: 31, fontWeight: '900', letterSpacing: -1.2 },
  brandDot: { width: 8, height: 8, borderRadius: 4, marginLeft: 5, backgroundColor: '#F2A644' },
  brandSubtitle: { marginTop: 4, color: '#777176', fontSize: 12, fontWeight: '600' },
  cityButton: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 11,
    paddingVertical: 9,
    borderRadius: 16,
    backgroundColor: '#FFEAE1',
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  tourEntry: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 9,
    borderRadius: 16,
    backgroundColor: '#FFF0E9',
  },
  tourEntryText: { color: '#C64C2F', fontSize: 10, fontWeight: '900' },
  cityButtonText: { color: '#C64C2F', fontSize: 13, fontWeight: '900' },
  filterWrap: { marginTop: 10 },
  filterContent: { paddingVertical: 8, paddingRight: 18 },
  filter: {
    marginRight: 9,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 18,
    backgroundColor: '#EAE6E0',
  },
  filterActive: { backgroundColor: '#252527' },
  filterText: { color: '#6D696C', fontSize: 13, fontWeight: '800' },
  filterTextActive: { color: '#FFFFFF' },
  featureSection: { marginTop: 25 },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 13,
  },
  sectionEyebrow: { color: '#D85331', fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  sectionTitle: { color: '#202022', fontSize: 20, fontWeight: '900', letterSpacing: -0.5, marginTop: 4 },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: '#E8F4EC',
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#3D8A5E' },
  liveText: { color: '#34744F', fontSize: 10, fontWeight: '900' },
  featureCard: {
    height: 430,
    borderRadius: 25,
    overflow: 'hidden',
    backgroundColor: '#D9D5CF',
    shadowColor: '#1A1717',
    shadowOpacity: 0.16,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
  },
  featureImage: { width: '100%', height: '100%' },
  featureTopBadges: { position: 'absolute', top: 14, left: 14, right: 14, flexDirection: 'row', gap: 8 },
  glassBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 13,
    backgroundColor: 'rgba(23,23,25,0.64)',
  },
  glassBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
  featureOverlay: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    padding: 17,
    borderRadius: 20,
    backgroundColor: 'rgba(22,21,22,0.82)',
  },
  featureTime: { color: '#FFBBA8', fontSize: 11, fontWeight: '900' },
  featureTitle: { color: '#FFFFFF', fontSize: 24, lineHeight: 29, fontWeight: '900', marginTop: 5 },
  featureHook: { color: '#E2DDDB', fontSize: 13, lineHeight: 19, marginTop: 7 },
  featureFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 },
  featureLikes: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  featureLikesText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  featureCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingLeft: 13,
    paddingRight: 8,
    paddingVertical: 9,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
  },
  featureCtaText: { color: '#1B1B1D', fontSize: 11, fontWeight: '900' },
  gridSection: { marginTop: 29 },
  resultCount: { color: '#8A8588', fontSize: 10, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  gridCard: {
    width: '48%',
    overflow: 'hidden',
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E3DD',
  },
  gridImage: { width: '100%', height: 190, backgroundColor: '#DDD8D2' },
  gridDistanceBadge: {
    position: 'absolute',
    top: 9,
    left: 9,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  gridDistanceText: { color: '#393638', fontSize: 9, fontWeight: '900' },
  savedBadge: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 27,
    height: 27,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(216,83,49,0.92)',
  },
  gridCardBody: { padding: 11 },
  gridContextRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  gridCategory: { color: '#D85331', fontSize: 9, fontWeight: '900' },
  gridTime: { flex: 1, color: '#9A9497', fontSize: 8, textAlign: 'right' },
  gridTitle: { color: '#252325', fontSize: 14, lineHeight: 19, fontWeight: '900', marginTop: 6 },
  gridDeviceRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 9 },
  gridDevice: { flex: 1, color: '#777176', fontSize: 9, fontWeight: '700' },
  gridActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 11 },
  heartButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 5 },
  heartCount: { color: '#6E696C', fontSize: 9, fontWeight: '800' },
  heartCountActive: { color: '#E85A3A' },
  wantButton: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 12, backgroundColor: '#FFF0E9' },
  wantButtonText: { color: '#C94B2D', fontSize: 9, fontWeight: '900' },
  communitySection: { marginTop: 30 },
  remoteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    padding: 9,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E3DD',
  },
  remoteImage: { width: 70, height: 70, borderRadius: 12, backgroundColor: '#DDD8D2' },
  remoteCopy: { flex: 1, marginLeft: 11 },
  remoteTitle: { color: '#252325', fontSize: 13, fontWeight: '900' },
  remoteBody: { color: '#898386', fontSize: 10, lineHeight: 15, marginTop: 4 },
  remoteLike: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  modalBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    padding: 12,
    backgroundColor: 'rgba(23,21,22,0.48)',
  },
  citySheet: {
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
  sheetEyebrow: { color: '#D85331', fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  sheetTitle: { color: '#222022', fontSize: 23, fontWeight: '900', letterSpacing: -0.6, marginTop: 5 },
  sheetBody: { color: '#777176', fontSize: 12, lineHeight: 19, marginTop: 8 },
  selectedCityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    padding: 14,
    borderRadius: 18,
    backgroundColor: '#FFF0E9',
    borderWidth: 1,
    borderColor: '#F3CDBE',
  },
  selectedCityIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D85331',
  },
  selectedCityCopy: { flex: 1, marginLeft: 11 },
  selectedCityTitle: { color: '#2A2728', fontSize: 16, fontWeight: '900' },
  selectedCityBody: { color: '#887872', fontSize: 10, marginTop: 3 },
  locationPermissionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    height: 45,
    marginTop: 12,
    borderRadius: 15,
    backgroundColor: '#EEEAE5',
  },
  locationPermissionButtonReady: { backgroundColor: '#E5F3EA' },
  locationPermissionText: { color: '#252527', fontSize: 12, fontWeight: '900' },
  locationPermissionTextReady: { color: '#28734B' },
  privacyNote: { color: '#A09A9D', fontSize: 9, lineHeight: 14, marginTop: 15 },
  sheetCloseButton: {
    height: 49,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 15,
    borderRadius: 16,
    backgroundColor: '#252527',
  },
  sheetCloseText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
});

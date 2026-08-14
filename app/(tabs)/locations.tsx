import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAppPreferences } from '@/src/app-preferences-context';
import { SEED_POSTS, type SeedCategory } from '@/src/data/seed-posts';
import { distanceInKilometers, formatDistance } from '@/src/distance';

type Filter = '全部' | SeedCategory;

const FILTERS: readonly Filter[] = ['全部', '旅行', '人像', '美食', '宠物'];
const MARKER_POSITIONS = [
  { left: '14%', top: '20%' },
  { left: '58%', top: '13%' },
  { left: '37%', top: '49%' },
  { left: '72%', top: '58%' },
  { left: '20%', top: '69%' },
] as const;

export default function LocationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { coordinates, locationState, requestLocation, device } = useAppPreferences();
  const [filter, setFilter] = useState<Filter>('全部');
  const [selectedId, setSelectedId] = useState(SEED_POSTS[0].id);

  const visiblePosts = useMemo(() => {
    const source = filter === '全部'
      ? SEED_POSTS
      : SEED_POSTS.filter((post) => post.category === filter);
    const userCoordinates = coordinates;
    return [...source].sort((left, right) => {
      const leftCoordinates = left.location.coordinates;
      const rightCoordinates = right.location.coordinates;
      if (userCoordinates && leftCoordinates && rightCoordinates) {
        const distanceDelta =
          distanceInKilometers(userCoordinates, leftCoordinates)
          - distanceInKilometers(userCoordinates, rightCoordinates);
        if (Math.abs(distanceDelta) > 0.05) return distanceDelta;
      }
      const leftMatch = left.deviceKinds.includes(device.kind) ? 1 : 0;
      const rightMatch = right.deviceKinds.includes(device.kind) ? 1 : 0;
      return rightMatch - leftMatch;
    });
  }, [coordinates, device.kind, filter]);

  const selected = visiblePosts.find((post) => post.id === selectedId) ?? visiblePosts[0];
  const locationCopy = locationState === 'ready'
    ? '已按你的位置显示距离'
    : locationState === 'requesting'
      ? '正在获取位置…'
      : locationState === 'denied'
        ? '未获得定位权限，仍可浏览全部机位'
        : locationState === 'error'
          ? '定位失败，点击重试'
          : '开启定位，发现离你更近的机位';

  const openPost = (id: string) => router.push({ pathname: '/shot/[id]', params: { id } });

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top + 14, paddingBottom: insets.bottom + 110 }}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>怎么拍</Text>
            <Text style={styles.title}>北京机位与拍法</Text>
            <Text style={styles.subtitle}>先找到地点，再看设备、参数和复刻步骤</Text>
          </View>
          <View style={styles.deviceBadge}>
            <IconSymbol name={device.kind === 'drone' ? 'paperplane.fill' : device.kind === 'camera' ? 'camera.fill' : 'iphone'} size={15} color="#D85331" />
            <Text numberOfLines={1} style={styles.deviceBadgeText}>{device.shortName}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.locationButton}
          onPress={() => void requestLocation()}
          disabled={locationState === 'requesting'}
        >
          <IconSymbol name="location.circle.fill" size={20} color="#D85331" />
          <Text style={styles.locationButtonText}>{locationCopy}</Text>
          <IconSymbol name="chevron.right" size={16} color="#B27A68" />
        </TouchableOpacity>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
        >
          {FILTERS.map((item) => (
            <TouchableOpacity
              key={item}
              style={[styles.filterChip, filter === item && styles.filterChipActive]}
              onPress={() => {
                setFilter(item);
                const first = item === '全部' ? SEED_POSTS[0] : SEED_POSTS.find((post) => post.category === item);
                if (first) setSelectedId(first.id);
              }}
            >
              <Text style={[styles.filterText, filter === item && styles.filterTextActive]}>{item}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.mapSection}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>机位分布</Text>
            <Text style={styles.mapHint}>示意位置 · 点击标记查看</Text>
          </View>
          <View style={styles.mapCanvas}>
            <View style={[styles.road, styles.roadOne]} />
            <View style={[styles.road, styles.roadTwo]} />
            <View style={[styles.road, styles.roadThree]} />
            <View style={styles.water} />
            {visiblePosts.slice(0, 5).map((post, index) => {
              const active = selected?.id === post.id;
              return (
                <TouchableOpacity
                  key={post.id}
                  style={[styles.marker, MARKER_POSITIONS[index], active && styles.markerActive]}
                  onPress={() => setSelectedId(post.id)}
                  accessibilityLabel={`查看${post.location.shortLabel}`}
                >
                  <Text style={[styles.markerText, active && styles.markerTextActive]}>{index + 1}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {selected ? (
            <TouchableOpacity style={styles.selectedCard} onPress={() => openPost(selected.id)} activeOpacity={0.88}>
              <Image source={selected.image.source} style={styles.selectedImage} />
              <View style={styles.selectedCopy}>
                <Text numberOfLines={1} style={styles.selectedTitle}>{selected.title}</Text>
                <Text numberOfLines={1} style={styles.selectedMeta}>
                  {selected.location.shortLabel} · {formatDistance(coordinates, selected.location.coordinates) ?? selected.time.label}
                </Text>
                <Text numberOfLines={2} style={styles.selectedMethod}>{selected.recreation.steps[0]}</Text>
              </View>
              <IconSymbol name="chevron.right" size={19} color="#D85331" />
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.listSection}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>完整拍摄方案</Text>
            <Text style={styles.resultCount}>{visiblePosts.length} 个</Text>
          </View>
          {visiblePosts.map((post) => {
            const matchesDevice = post.deviceKinds.includes(device.kind);
            return (
              <TouchableOpacity key={post.id} style={styles.planCard} onPress={() => openPost(post.id)} activeOpacity={0.88}>
                <Image source={post.image.source} style={styles.planImage} />
                <View style={styles.planBody}>
                  <View style={styles.planTopRow}>
                    <Text style={styles.planCategory}>{post.category}</Text>
                    <Text style={styles.planDistance}>
                      {formatDistance(coordinates, post.location.coordinates) ?? post.location.shortLabel}
                    </Text>
                  </View>
                  <Text numberOfLines={2} style={styles.planTitle}>{post.title}</Text>
                  <Text numberOfLines={1} style={styles.planMeta}>{post.time.shootingWindow}</Text>
                  <View style={styles.planFooter}>
                    <View style={[styles.matchPill, !matchesDevice && styles.referencePill]}>
                      <Text style={[styles.matchText, !matchesDevice && styles.referenceText]}>
                        {matchesDevice ? `${device.shortName}可拍` : '拍法可参考'}
                      </Text>
                    </View>
                    <Text style={styles.difficulty}>{post.recreation.difficulty}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.mapNotice}>
          <IconSymbol name="map.fill" size={18} color="#9A7164" />
          <Text style={styles.mapNoticeText}>地图模式准备中，当前可以按实际距离浏览北京机位，点击任一地点查看拍摄方法。</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFDFC' },
  header: { paddingHorizontal: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  eyebrow: { color: '#D85331', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  title: { marginTop: 5, color: '#272325', fontSize: 27, fontWeight: '900', letterSpacing: -0.7 },
  subtitle: { marginTop: 5, color: '#8C8487', fontSize: 12 },
  deviceBadge: { maxWidth: 116, flexDirection: 'row', alignItems: 'center', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: '#FFF0E9' },
  deviceBadgeText: { marginLeft: 5, color: '#A5432C', fontSize: 10, fontWeight: '800' },
  locationButton: { marginHorizontal: 18, marginTop: 18, minHeight: 48, borderRadius: 15, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3ECE8' },
  locationButtonText: { flex: 1, marginLeft: 8, color: '#6F6669', fontSize: 12, fontWeight: '700' },
  filters: { paddingHorizontal: 18, paddingVertical: 16, gap: 8 },
  filterChip: { borderRadius: 14, paddingHorizontal: 15, paddingVertical: 9, backgroundColor: '#F3ECE8' },
  filterChipActive: { backgroundColor: '#D85331' },
  filterText: { color: '#796F73', fontSize: 12, fontWeight: '800' },
  filterTextActive: { color: '#FFFFFF' },
  mapSection: { paddingHorizontal: 18 },
  sectionTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 11 },
  sectionTitle: { color: '#302B2D', fontSize: 17, fontWeight: '900' },
  mapHint: { color: '#9A9295', fontSize: 10 },
  mapCanvas: { height: 238, overflow: 'hidden', borderRadius: 22, backgroundColor: '#E9E2DA' },
  road: { position: 'absolute', height: 18, borderRadius: 9, backgroundColor: '#FFFDFC' },
  roadOne: { width: '120%', top: 70, left: -25, transform: [{ rotate: '-12deg' }] },
  roadTwo: { width: '110%', top: 160, left: -20, transform: [{ rotate: '18deg' }] },
  roadThree: { width: 250, top: 108, left: 70, transform: [{ rotate: '76deg' }] },
  water: { position: 'absolute', width: 138, height: 72, right: -12, bottom: -8, borderRadius: 50, backgroundColor: '#C8DDD8' },
  marker: { position: 'absolute', width: 34, height: 34, borderRadius: 17, borderWidth: 3, borderColor: '#FFFDFC', alignItems: 'center', justifyContent: 'center', backgroundColor: '#655F61' },
  markerActive: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#D85331', transform: [{ translateX: -3 }, { translateY: -3 }] },
  markerText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900' },
  markerTextActive: { fontSize: 13 },
  selectedCard: { marginTop: 10, borderRadius: 18, padding: 9, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#ECE4E0' },
  selectedImage: { width: 74, height: 74, borderRadius: 13 },
  selectedCopy: { flex: 1, marginHorizontal: 11 },
  selectedTitle: { color: '#302B2D', fontSize: 14, fontWeight: '900' },
  selectedMeta: { marginTop: 4, color: '#D85331', fontSize: 10, fontWeight: '700' },
  selectedMethod: { marginTop: 5, color: '#81787C', fontSize: 10, lineHeight: 15 },
  listSection: { marginTop: 28, paddingHorizontal: 18 },
  resultCount: { color: '#9A9295', fontSize: 11 },
  planCard: { marginBottom: 12, minHeight: 154, borderRadius: 19, overflow: 'hidden', flexDirection: 'row', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EEE7E3' },
  planImage: { width: 126, height: '100%' },
  planBody: { flex: 1, padding: 13 },
  planTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  planCategory: { color: '#D85331', fontSize: 9, fontWeight: '900' },
  planDistance: { color: '#91898C', fontSize: 9, fontWeight: '700' },
  planTitle: { marginTop: 7, color: '#2F2A2C', fontSize: 14, lineHeight: 19, fontWeight: '900' },
  planMeta: { marginTop: 5, color: '#847C7F', fontSize: 10 },
  planFooter: { marginTop: 'auto', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  matchPill: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 5, backgroundColor: '#FFF0E9' },
  referencePill: { backgroundColor: '#F1ECE9' },
  matchText: { color: '#B6492E', fontSize: 9, fontWeight: '800' },
  referenceText: { color: '#7C7477' },
  difficulty: { color: '#9B9396', fontSize: 9, fontWeight: '700' },
  mapNotice: { marginHorizontal: 18, marginTop: 10, padding: 14, borderRadius: 16, flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#F3ECE8' },
  mapNoticeText: { flex: 1, marginLeft: 9, color: '#7B6D68', fontSize: 10, lineHeight: 16 },
});

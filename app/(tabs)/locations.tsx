import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Platform, TouchableOpacity, ScrollView, Image } from 'react-native';
import * as Location from 'expo-location';

// Note: react-native-maps requires additional setup on web or might not work perfectly without react-native-web-maps.
// For Web preview, we might just show a placeholder if MapView fails, but let's try importing it.
let MapView: any;
let Marker: any;
if (Platform.OS !== 'web') {
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Marker = Maps.Marker;
}

const locationsData = [
  { id: 1, title: '老钢厂创意园', desc: '工业风，适合冷色调', coordinate: { latitude: 34.2305, longitude: 108.9342 } },
  { id: 2, title: '海滨灯塔公园', desc: '最佳观赏日落机位', coordinate: { latitude: 34.2250, longitude: 108.9400 } },
  { id: 3, title: '市中心天桥', desc: '赛博朋克风格夜景', coordinate: { latitude: 34.2400, longitude: 108.9300 } },
];

const TIME_OPTIONS = ['日出', '日落', '夜景', '黄金时刻', '任意时间'];
const SUBJECT_OPTIONS = ['人像', '风光', '建筑', '纪实', '任意题材'];
const DIFFICULTY_OPTIONS = ['新手友好', '进阶挑战'];

type TabType = 'map' | 'ai';

export default function LocationsScreen() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('map');
  const [selectedTime, setSelectedTime] = useState('任意时间');
  const [selectedSubject, setSelectedSubject] = useState('任意题材');
  const [selectedDifficulty, setSelectedDifficulty] = useState('新手友好');
  const [aiRecommendations, setAiRecommendations] = useState<any[]>([]);
  const [isLoadingAI, setIsLoadingAI] = useState(false);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setLocation(location);
    })();
  }, []);

  const handleAIRecommend = async () => {
    setIsLoadingAI(true);
    // Simulate AI recommendation delay
    setTimeout(() => {
      setAiRecommendations([
        {
          id: 1,
          title: '老钢厂创意园',
          reason: `根据您选择的「${selectedTime}」和「${selectedSubject}」，推荐这里。工业风场景非常适合${selectedSubject === '人像' ? '拍摄人像' : selectedSubject === '建筑' ? '建筑摄影' : '创作'}`,
          distance: '约 2.3km',
          bestTime: selectedTime === '任意时间' ? '傍晚' : selectedTime,
          imageUrl: 'https://images.unsplash.com/photo-1517750764282-26a4d1b24f0e?w=400',
        },
        {
          id: 2,
          title: '灞河岸边',
          reason: '开阔的水域和天空，是拍摄日落风光的绝佳位置。建议携带三脚架使用长曝光',
          distance: '约 5.1km',
          bestTime: '日落',
          imageUrl: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=400',
        },
      ]);
      setIsLoadingAI(false);
    }, 1500);
  };

  const renderMapTab = () => (
    <>
      {MapView ? (
        <MapView
          style={styles.map}
          showsUserLocation={true}
          followsUserLocation={true}
          onMapReady={() => setIsMapReady(true)}
          initialRegion={{
            latitude: location ? location.coords.latitude : 34.2305,
            longitude: location ? location.coords.longitude : 108.9342,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
          }}
        >
          {isMapReady && locationsData.map((marker) => (
            <Marker
              key={marker.id}
              coordinate={marker.coordinate}
              title={marker.title}
              description={marker.desc}
            />
          ))}
        </MapView>
      ) : (
        <Text>Map loading failed...</Text>
      )}

      {/* Overlay Header */}
      <View style={styles.headerOverlay}>
        <Text style={styles.title}>附近机位</Text>
        <Text style={styles.subtitle}>定位中: {errorMsg ? errorMsg : (location ? '已获取' : '...')}</Text>
      </View>
    </>
  );

  const renderAITab = () => (
    <View style={styles.aiContainer}>
      <ScrollView style={styles.aiScroll} showsVerticalScrollIndicator={false}>
        {/* AI Header */}
        <View style={styles.aiHeader}>
          <Text style={styles.aiTitle}>AI 机位推荐</Text>
          <Text style={styles.aiSubtitle}>告诉我你的拍摄需求，AI帮你推荐最佳机位</Text>
        </View>

        {/* Selection Options */}
        <View style={styles.selectionSection}>
          <Text style={styles.selectionLabel}>拍摄时间</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {TIME_OPTIONS.map((time) => (
              <TouchableOpacity
                key={time}
                style={[styles.optionChip, selectedTime === time && styles.optionChipActive]}
                onPress={() => setSelectedTime(time)}
              >
                <Text style={[styles.optionText, selectedTime === time && styles.optionTextActive]}>
                  {time}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.selectionSection}>
          <Text style={styles.selectionLabel}>拍摄题材</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {SUBJECT_OPTIONS.map((subject) => (
              <TouchableOpacity
                key={subject}
                style={[styles.optionChip, selectedSubject === subject && styles.optionChipActive]}
                onPress={() => setSelectedSubject(subject)}
              >
                <Text style={[styles.optionText, selectedSubject === subject && styles.optionTextActive]}>
                  {subject}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.selectionSection}>
          <Text style={styles.selectionLabel}>难度偏好</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {DIFFICULTY_OPTIONS.map((diff) => (
              <TouchableOpacity
                key={diff}
                style={[styles.optionChip, selectedDifficulty === diff && styles.optionChipActive]}
                onPress={() => setSelectedDifficulty(diff)}
              >
                <Text style={[styles.optionText, selectedDifficulty === diff && styles.optionTextActive]}>
                  {diff}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* AI Button */}
        <TouchableOpacity
          style={styles.aiButton}
          onPress={handleAIRecommend}
          disabled={isLoadingAI}
        >
          <Text style={styles.aiButtonText}>
            {isLoadingAI ? '🤖 AI 分析中...' : '🔮 AI 推荐机位'}
          </Text>
        </TouchableOpacity>

        {/* AI Results */}
        {aiRecommendations.length > 0 && (
          <View style={styles.resultsSection}>
            <Text style={styles.resultsTitle}>为你推荐</Text>
            {aiRecommendations.map((item) => (
              <View key={item.id} style={styles.resultCard}>
                <Image source={{ uri: item.imageUrl }} style={styles.resultImage} />
                <View style={styles.resultContent}>
                  <View style={styles.resultHeader}>
                    <Text style={styles.resultTitle}>{item.title}</Text>
                    <Text style={styles.resultDistance}>{item.distance}</Text>
                  </View>
                  <Text style={styles.resultReason}>{item.reason}</Text>
                  <View style={styles.resultMeta}>
                    <Text style={styles.resultMetaText}>最佳时间: {item.bestTime}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );

  if (Platform.OS === 'web') {
    return (
      <View style={styles.webContainer}>
        <Text style={styles.webTitle}>🌍 附近机位</Text>
        <Text style={styles.webText}>当前网页预览环境暂不支持完整的原生相册地图插件。</Text>
        <Text style={styles.webText}>请使用手机扫描终端二维码预览真实地图效果！</Text>
        {location && (
          <Text style={styles.webLocation}>
            您的当前经纬度: {location.coords.latitude.toFixed(4)}, {location.coords.longitude.toFixed(4)}
          </Text>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Tab Selector */}
      <View style={styles.tabSelector}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'map' && styles.tabActive]}
          onPress={() => setActiveTab('map')}
        >
          <Text style={[styles.tabText, activeTab === 'map' && styles.tabTextActive]}>地图</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'ai' && styles.tabActive]}
          onPress={() => setActiveTab('ai')}
        >
          <Text style={[styles.tabText, activeTab === 'ai' && styles.tabTextActive]}>AI推荐</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'map' ? renderMapTab() : renderAITab()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  tabSelector: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingTop: 50,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F5',
  },
  tab: {
    paddingVertical: 14,
    marginRight: 24,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#FF2D55',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#86868B',
  },
  tabTextActive: {
    color: '#FF2D55',
  },
  headerOverlay: {
    position: 'absolute',
    top: 110,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    padding: 15,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  webContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fafafa',
    padding: 30,
  },
  webTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  webText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 24,
  },
  webLocation: {
    marginTop: 30,
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 8,
    color: '#007AFF',
    fontWeight: '600',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  // AI Tab styles
  aiContainer: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  aiScroll: {
    flex: 1,
  },
  aiHeader: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    paddingTop: 20,
  },
  aiTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#1D1D1F',
  },
  aiSubtitle: {
    fontSize: 14,
    color: '#86868B',
    marginTop: 6,
  },
  selectionSection: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 14,
    marginTop: 10,
  },
  selectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#636366',
    marginBottom: 12,
  },
  optionChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F0F0F5',
    marginRight: 10,
  },
  optionChipActive: {
    backgroundColor: '#FF2D55',
  },
  optionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#636366',
  },
  optionTextActive: {
    color: '#FFFFFF',
  },
  aiButton: {
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: '#1D1D1F',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  aiButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  resultsSection: {
    padding: 20,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1D1D1F',
    marginBottom: 16,
  },
  resultCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  resultImage: {
    width: '100%',
    height: 140,
    backgroundColor: '#F5F5F7',
  },
  resultContent: {
    padding: 16,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  resultTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1D1D1F',
  },
  resultDistance: {
    fontSize: 13,
    color: '#86868B',
  },
  resultReason: {
    fontSize: 14,
    color: '#636366',
    lineHeight: 20,
  },
  resultMeta: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F5',
  },
  resultMetaText: {
    fontSize: 13,
    color: '#FF6B6B',
    fontWeight: '600',
  },
});

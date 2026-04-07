import React, { useState, useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, ImageBackground, TouchableOpacity, Image, Dimensions, Alert, Pressable, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/icon-symbol';
import * as ImagePicker from 'expo-image-picker';

const { width } = Dimensions.get('window');
const itemWidth = '48%';

// Enhanced Mock Data with more models across categories
const TOPIC_DATA: any = {
  'Sony A7M4': { brand: 'Sony', price: 16999, title: 'Sony Alpha 7 IV', subtitle: '全画幅基准，全能无反', coverImage: 'https://images.unsplash.com/photo-1516961642265-531546e84af2?w=1000', tags: ['全画幅', '3300万像素', '对焦之神'], specs: { sensor: '3300万全画幅', mount: 'Sony E卡口', price: '约 16,999 RMB' }, reviews: [{ user: '摄影老怪', text: '对焦快准狠，绝对的基准级产品', rating: 5 }], samples: [{ url: 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=800' }, { url: 'https://images.unsplash.com/photo-1521911961916-b8fd6a2e2d09?w=800' }] },
  'Fujifilm X100V': { brand: 'Fujifilm', price: 10000, title: 'Fujifilm X100V', subtitle: '原汁原味的街头摄影与复古色彩', coverImage: 'https://images.unsplash.com/photo-1589802875323-2287fdd1bfba?w=1000', tags: ['APS-C', '复古旁轴', '胶片模拟'], specs: { sensor: '2610万像素 APS-C', lens: '23mm f/2', price: '约 10,000 RMB' }, reviews: [{ user: 'StreetWalker', text: 'Classic Negative 太绝了', rating: 5 }], samples: [{ url: 'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=800' }] },
  'Nikon Z8': { brand: 'Nikon', price: 27999, title: 'Nikon Z8', subtitle: '小旗舰，全能生产力工具', coverImage: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=1000', tags: ['旗舰级', '4500万像素', '8K录制'], specs: { sensor: '4571万堆栈式全画幅', mount: 'Nikon Z', price: '约 27,999 RMB' }, reviews: [{ user: 'Z-Fan', text: '对焦提升太明显了，手感极佳', rating: 5 }], samples: [{ url: 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800' }] },
  'Leica Q3': { brand: 'Leica', price: 48000, title: 'Leica Q3', subtitle: '纯粹的德味美学体验', coverImage: 'https://images.unsplash.com/photo-1615655096345-64a515a447c2?w=1000', tags: ['全画幅', '定焦', '奢侈品级'], specs: { sensor: '6000万全画幅', lens: '28mm f/1.7', price: '约 48,000 RMB' }, reviews: [{ user: 'L-Collector', text: '这一代的微距太强了，色彩依然迷人', rating: 5 }], samples: [{ url: 'https://images.unsplash.com/photo-1515276457388-34859d0ed716?w=800' }] },
  'Canon R5': { brand: 'Canon', price: 23000, title: 'Canon EOS R5', subtitle: '高像素无反全能王', coverImage: 'https://images.unsplash.com/photo-1620807577531-15df1211e40a?w=1000', tags: ['全画幅', '8K', '肖像必备'], specs: { sensor: '4500万像素全画幅', mount: 'RF卡口', price: '约 23,000 RMB' }, reviews: [{ user: 'Portrait', text: '直出肤色依然是业界标杆', rating: 5 }], samples: [{ url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800' }] },
  'Xiaomi 14 Ultra': { brand: 'Xiaomi', price: 6499, title: 'Xiaomi 14 Ultra', subtitle: '徕卡光学 Summilux 镜头', coverImage: 'https://images.unsplash.com/photo-1511746015383-02f897ff02aa9?w=1000', tags: ['徕卡', '一英寸', '摄影套装'], specs: { sensor: '一英寸 LYT-900', lens: '徕卡光学四摄', price: '约 6,499 RMB' }, reviews: [{ user: 'LeicaMobile', text: '徕卡影调非常地道，街拍神器', rating: 5 }], samples: [{ url: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=800' }] },
  'vivo X100 Ultra': { brand: 'vivo', price: 6499, title: 'vivo X100 Ultra', subtitle: '蓝图影像，旗舰之王', coverImage: 'https://images.unsplash.com/photo-1582216260271-eade858fdfb2?w=1000', tags: ['蔡司', '2亿长焦', '演唱会必备'], specs: { sensor: '一英寸 LYT-900', lens: '2亿像素潜望长焦', price: '约 6,499 RMB' }, reviews: [{ user: 'LiveFan', text: '长焦清晰度简直是离大谱，太强了', rating: 5 }], samples: [{ url: 'https://images.unsplash.com/photo-1505236858219-8359eb29e325?w=800' }] },
  'iPhone 15 Pro Max': { brand: 'Apple', price: 9999, title: 'iPhone 15 Pro Max', subtitle: '5倍光学变焦，专业创作平台', coverImage: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=1000', tags: ['ProRes', 'Log', '随身便携'], specs: { sensor: '4800万像素', lens: '13/24/120mm', price: '约 9,999 RMB' }, reviews: [{ user: 'FilmBoy', text: '视频能力的断层式领先', rating: 5 }], samples: [{ url: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=800' }] },
  'OPPO Find X7 Ultra': { brand: 'OPPO', price: 5999, title: 'OPPO Find X7 Ultra', subtitle: '双潜望长焦，哈苏影调', coverImage: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=1000', tags: ['哈苏', '双潜望', '超光影'], specs: { sensor: '一英寸 LYT-900', lens: '双潜望四主摄', price: '约 5,999 RMB' }, reviews: [{ user: 'Hasselblad', text: '人像影调很有高级感', rating: 5 }], samples: [{ url: 'https://images.unsplash.com/photo-1517436073-3b1b116130cb?w=800' }] },
  'Panasonic S5II': { brand: 'Panasonic', price: 11000, title: 'Panasonic S5II', subtitle: '视频神器，相位对焦进化', coverImage: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=1000', tags: ['全画幅', 'L卡口', '视频旗舰'], specs: { sensor: '2420万全画幅', AF: '相位对焦', price: '约 11,000 RMB' }, reviews: [{ user: 'Vlogger', text: '终于有相位对焦了，松下永远的神', rating: 5 }], samples: [{ url: 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800' }] }
};

const BRANDS = ['全部', 'Sony', 'Fujifilm', 'Canon', 'Nikon', 'Leica', 'Panasonic', 'Apple', 'Xiaomi', 'vivo', 'OPPO'];
const PRICE_RANGES = ['全部', '5千以内', '5千-1万', '1万-2万', '2万以上'];

type TabType = 'gear' | 'qa';

export default function GuidesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('gear');
  const [activeEquip, setActiveEquip] = useState('Sony A7M4');
  const [specsModalVisible, setSpecsModalVisible] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [activeBrand, setActiveBrand] = useState('全部');
  const [activePrice, setActivePrice] = useState('全部');

  // Unified global filtering logic
  const filteredEquipment = useMemo(() => {
    return Object.keys(TOPIC_DATA).filter(key => {
      const item = TOPIC_DATA[key];
      const matchesSearch = item.title.toLowerCase().includes(searchText.toLowerCase()) ||
                           item.brand.toLowerCase().includes(searchText.toLowerCase()) ||
                           key.toLowerCase().includes(searchText.toLowerCase());

      // If searching, show all global matches. Otherwise apply filters.
      if (searchText.length > 0) {
        return matchesSearch;
      }

      const matchesBrand = activeBrand === '全部' || item.brand === activeBrand;
      let matchesPrice = true;
      if (activePrice === '5千以内') matchesPrice = item.price < 5000;
      else if (activePrice === '5千-1万') matchesPrice = item.price >= 5000 && item.price <= 10000;
      else if (activePrice === '1万-2万') matchesPrice = item.price > 10000 && item.price <= 20000;
      else if (activePrice === '2万以上') matchesPrice = item.price > 20000;

      return matchesBrand && matchesPrice;
    });
  }, [searchText, activeBrand, activePrice]);

  const currentData = TOPIC_DATA[activeEquip] || (filteredEquipment.length > 0 ? TOPIC_DATA[filteredEquipment[0]] : TOPIC_DATA['Sony A7M4']);

  const pickImage = () => {
    router.push('/modal');
  };

  return (
    <View style={styles.container}>
      {/* Tab Selector */}
      <View style={[styles.tabSelector, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'gear' && styles.tabActive]}
          onPress={() => setActiveTab('gear')}
        >
          <Text style={[styles.tabText, activeTab === 'gear' && styles.tabTextActive]}>器材库</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'qa' && styles.tabActive]}
          onPress={() => setActiveTab('qa')}
        >
          <Text style={[styles.tabText, activeTab === 'qa' && styles.tabTextActive]}>选购问答</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'gear' ? (
      <>
        <View style={styles.headerContainer}>
          <View style={styles.headerTop}>
            <Text style={styles.pageTitle}>器材库</Text>
            <View style={styles.searchBar}>
              <IconSymbol name="magnifyingglass" size={14} color="#666" />
              <TextInput
                style={styles.searchInput}
                placeholder="搜索所有品牌或型号..."
                placeholderTextColor="#555"
                value={searchText}
                onChangeText={(t) => {
                  setSearchText(t);
                }}
              />
            </View>
          </View>

          {/* Brand Filter - Horizontal Scroll */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={styles.filterContent}>
            {BRANDS.map(brand => (
              <TouchableOpacity key={brand} style={[styles.filterChip, activeBrand === brand && styles.filterChipActive]} onPress={() => { setActiveBrand(brand); setSearchText(''); }}>
                <Text style={[styles.filterChipText, activeBrand === brand && styles.filterChipTextActive]}>{brand}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Price Filter - Horizontal Scroll */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={styles.filterContent}>
            {PRICE_RANGES.map(range => (
              <TouchableOpacity key={range} style={[styles.filterChip, activePrice === range && styles.filterChipActive]} onPress={() => { setActivePrice(range); setSearchText(''); }}>
                <Text style={[styles.filterChipText, activePrice === range && styles.filterChipTextActive]}>{range}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Selected Results List */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.resultsRow} contentContainerStyle={styles.resultsContent}>
            {filteredEquipment.map(key => (
              <TouchableOpacity key={key} style={[styles.resultTab, activeEquip === key && styles.resultTabActive]} onPress={() => setActiveEquip(key)}>
                <Text style={[styles.resultTabText, activeEquip === key && styles.resultTabTextActive]}>{key}</Text>
              </TouchableOpacity>
            ))}
            {filteredEquipment.length === 0 && <Text style={styles.noResultsText}>暂无匹配器材</Text>}
          </ScrollView>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Cover Hero Area */}
        <View style={styles.heroWrapper}>
          <ImageBackground source={{ uri: currentData.coverImage }} style={styles.heroImage} imageStyle={{ borderRadius: 20 }}>
            <View style={styles.overlay} />
            <View style={styles.heroContent}>
              <View style={styles.heroTitleRow}>
                <Text style={styles.heroTitle}>{currentData.title}</Text>
                <TouchableOpacity style={styles.infoButton} onPress={() => setSpecsModalVisible(true)}>
                   <IconSymbol name="book.fill" size={14} color="#FFF" />
                </TouchableOpacity>
              </View>
              <Text style={styles.heroSubtitle}>{currentData.subtitle}</Text>
              <View style={styles.tagRow}>
                {currentData.tags.map((tag: string, i: number) => (
                  <View key={i} style={styles.tagBadge}><Text style={styles.tagText}>{tag}</Text></View>
                ))}
              </View>
            </View>
          </ImageBackground>
        </View>

        {/* Equipment Reviews */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}><IconSymbol name="sparkles" size={16} color="#FF2D55" /><Text style={styles.sectionTitle}>真实短评</Text></View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.reviewsScroll} contentContainerStyle={{ paddingHorizontal: 15 }}>
            {currentData.reviews.map((r: any, i: number) => (
              <View key={i} style={styles.reviewCard}>
                <Text style={styles.reviewUser}>@{r.user}</Text>
                <Text style={styles.reviewText}>"{r.text}"</Text>
                <Text style={styles.rating}>{'⭐'.repeat(r.rating)}</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Inline Upload Button ABOVE Gallery */}
        <View style={styles.inlineUploadWrapper}>
           <TouchableOpacity style={styles.inlineUploadButton} onPress={pickImage}>
              <IconSymbol name="camera.fill" size={18} color="#FFF" />
              <Text style={styles.inlineUploadText}>分享我用 {currentData.title} 拍的作品</Text>
           </TouchableOpacity>
        </View>

        {/* Gallery Grid */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}><IconSymbol name="camera.fill" size={16} color="#FFF" /><Text style={styles.sectionTitle}>精选样张</Text></View>
          <View style={styles.galleryGrid}>
            {currentData.samples.map((img: any, i: number) => (
              <TouchableOpacity key={i} style={[styles.galleryItemWrapper, { width: itemWidth }]} onPress={() => setFullscreenImage(img.url)}>
                <Image source={{ uri: img.url }} style={styles.galleryImage} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
      </>
      ) : null}

      {/* Q&A Tab Content */}
      {activeTab === 'qa' && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.qaContainer}>
          <View style={styles.qaHeader}>
            <Text style={styles.qaTitle}>器材选购问答</Text>
            <Text style={styles.qaSubtitle}>提出你的器材问题，获得社区建议</Text>
          </View>

          <TouchableOpacity style={styles.askButton} onPress={() => router.push('/questions')}>
            <IconSymbol name="plus" size={20} color="#FFF" />
            <Text style={styles.askButtonText}>发布问题</Text>
          </TouchableOpacity>

          <View style={styles.questionsList}>
            <Text style={styles.questionsTitle}>热门问题</Text>
            {[
              { id: 'qa1', q: '预算1万5，想入手一台拍人像为主的相机，有什么推荐？', answers: 12 },
              { id: 'qa2', q: 'Sony A7M4 和 Canon R6 Mark II 怎么选？', answers: 8 },
              { id: 'qa3', q: '手机拍照和相机拍照差别大吗？', answers: 23 },
            ].map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.questionCard}
                onPress={() => router.push({ pathname: '/question/[id]', params: { id: item.id } })}
              >
                <Text style={styles.questionText}>{item.q}</Text>
                <Text style={styles.answersCount}>{item.answers} 回答</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}

      {/* Fullscreen Overlay - 点击背景关闭 */}
      {fullscreenImage && (
         <TouchableOpacity style={[StyleSheet.absoluteFill, styles.fullscreenModal]} activeOpacity={1} onPress={() => setFullscreenImage(null)}>
            <Image source={{ uri: fullscreenImage }} style={styles.fullscreenImage} resizeMode="contain" />
         </TouchableOpacity>
      )}

      {/* Specs Overlay - Fixed to stay within phone frame */}
      {specsModalVisible && (
         <View style={[StyleSheet.absoluteFill, styles.specsModalOverlay]}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setSpecsModalVisible(false)} />
            <View style={styles.specsModalContent}>
               <View style={styles.specsHeader}>
                 <Text style={styles.specsTitle}>📸 {currentData.title} 核心参数</Text>
                 <TouchableOpacity onPress={() => setSpecsModalVisible(false)}><IconSymbol name="plus" size={24} color="#666" style={{ transform: [{ rotate: '45deg' }] }} /></TouchableOpacity>
               </View>
               <View style={styles.specsList}>
                 {currentData.specs && Object.entries(currentData.specs).map(([key, val], i) => (
                   <View key={i} style={styles.specRow}><Text style={styles.specKey}>{key.toUpperCase()}:</Text><Text style={styles.specValue}>{String(val)}</Text></View>
                 ))}
               </View>
            </View>
         </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  tabSelector: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
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
  headerContainer: { backgroundColor: '#FFFFFF', zIndex: 100 },
  headerTop: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 10 },
  pageTitle: { fontSize: 24, fontWeight: '900', color: '#1D1D1F', letterSpacing: -0.5 },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F7', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, marginLeft: 15 },
  searchInput: { flex: 1, color: '#1D1D1F', fontSize: 13, marginLeft: 6, padding: 0 },
  filterRow: { marginTop: 6, height: 35 },
  filterContent: { paddingHorizontal: 15 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, backgroundColor: '#F5F5F7', marginRight: 8, height: 26, justifyContent: 'center' },
  filterChipActive: { backgroundColor: '#1D1D1F' },
  filterChipText: { color: '#86868B', fontSize: 11, fontWeight: '600' },
  filterChipTextActive: { color: '#FFFFFF' },
  resultsRow: { marginTop: 10, borderBottomWidth: 1, borderBottomColor: '#F2F2F2' },
  resultsContent: { paddingHorizontal: 15 },
  resultTab: { paddingBottom: 8, marginRight: 20 },
  resultTabActive: { borderBottomWidth: 2, borderBottomColor: '#1D1D1F' },
  resultTabText: { color: '#86868B', fontSize: 13, fontWeight: 'bold' },
  resultTabTextActive: { color: '#1D1D1F' },
  noResultsText: { color: '#86868B', fontSize: 12, marginTop: 5, paddingHorizontal: 20 },
  heroWrapper: { marginHorizontal: 15, marginTop: 15, borderRadius: 20, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
  heroImage: { width: '100%', height: 240, justifyContent: 'flex-end' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.2)' },
  heroContent: { padding: 15, zIndex: 1 },
  heroTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  heroTitle: { fontSize: 22, fontWeight: '900', color: '#FFF' },
  infoButton: { marginLeft: 10, padding: 5, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12 },
  heroSubtitle: { fontSize: 12, color: '#DDD', marginBottom: 8 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap' },
  tagBadge: { backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, marginRight: 6, marginBottom: 4 },
  tagText: { color: '#FFF', fontSize: 9, fontWeight: 'bold' },
  sectionContainer: { marginTop: 25 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, paddingHorizontal: 15 },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#1D1D1F', marginLeft: 6 },
  reviewsScroll: { paddingBottom: 5 },
  reviewCard: { backgroundColor: '#F5F5F7', borderRadius: 16, padding: 15, marginRight: 10, width: 220 },
  reviewUser: { color: '#1D1D1F', fontWeight: 'bold', fontSize: 12, marginBottom: 4 },
  reviewText: { color: '#424245', fontSize: 12, lineHeight: 18, marginBottom: 6 },
  rating: { fontSize: 10 },
  galleryGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: 15 },
  galleryItemWrapper: { marginBottom: 10, aspectRatio: 0.82, borderRadius: 14, overflow: 'hidden' },
  galleryImage: { width: '100%', height: '100%', backgroundColor: '#F5F5F7' },
  inlineUploadWrapper: { paddingHorizontal: 15, marginVertical: 15 },
  inlineUploadButton: { backgroundColor: '#1D1D1F', flexDirection: 'row', paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  inlineUploadText: { color: '#FFF', fontWeight: 'bold', fontSize: 14, marginLeft: 8 },
  fullscreenModal: { backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center', zIndex: 2000 },
  fullscreenImage: { width: '100%', height: '80%' },
  specsModalOverlay: { backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end', zIndex: 2000 },
  specsModalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 25, paddingBottom: 50 },
  specsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  specsTitle: { fontSize: 18, fontWeight: 'bold', color: '#1D1D1F' },
  specsList: { marginTop: 5 },
  specRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F2F2F2' },
  specKey: { fontSize: 12, color: '#86868B', fontWeight: '600', flex: 1 },
  specValue: { fontSize: 12, color: '#1D1D1F', fontWeight: 'bold', flex: 2, textAlign: 'right' },
  // Q&A styles
  qaContainer: { padding: 20, paddingBottom: 100 },
  qaHeader: { marginBottom: 20 },
  qaTitle: { fontSize: 26, fontWeight: '900', color: '#1D1D1F' },
  qaSubtitle: { fontSize: 14, color: '#86868B', marginTop: 6 },
  askButton: { backgroundColor: '#FF2D55', flexDirection: 'row', paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  askButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 15, marginLeft: 8 },
  questionsList: { marginTop: 10 },
  questionsTitle: { fontSize: 17, fontWeight: '700', color: '#1D1D1F', marginBottom: 16 },
  questionCard: { backgroundColor: '#F8F8F8', borderRadius: 16, padding: 16, marginBottom: 12 },
  questionText: { fontSize: 15, color: '#1D1D1F', lineHeight: 22, marginBottom: 10 },
  answersCount: { fontSize: 13, color: '#FF6B6B', fontWeight: '600' },
});

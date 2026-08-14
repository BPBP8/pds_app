import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, ImageBackground, TouchableOpacity, Image, Pressable, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAppPreferences, type DeviceKind } from '@/src/app-preferences-context';
import { useAuth } from '@/src/auth-context';
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '@/src/config/firebase';

const itemWidth = '48%';

// Enhanced Mock Data with more models across categories
const TOPIC_DATA: any = {
  '手机通用拍摄': { brand: '通用', price: 0, title: '用好你现在的手机', subtitle: '先发挥主摄优势，再按场景决定是否升级', coverImage: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=1000', tags: ['随手拍', '主摄优先', '轻便'], specs: { suitableFor: '旅行、美食、宠物和日常记录', focus: '优先用主摄、擦净镜头并保持画面稳定', price: '无需新增设备' }, reviews: [{ user: '编辑建议', text: '先把手里的手机拍明白，再为明确需求换设备', rating: 5 }], samples: [{ url: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=800' }] },
  '长焦手机拍摄': { brand: '通用', price: 0, title: '带长焦的手机', subtitle: '适合人像、远景和不便靠近的拍摄场景', coverImage: 'https://images.unsplash.com/photo-1511746015383-02f897ff02aa9?w=1000', tags: ['长焦', '人像', '远景'], specs: { suitableFor: '旅行地标、人像、舞台与宠物', focus: '重点比较等效焦段、防抖和暗光画质', price: '按预算选择具体型号' }, reviews: [{ user: '编辑建议', text: '长焦不是越远越好，常用焦段和稳定性更重要', rating: 5 }], samples: [{ url: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=800' }] },
  'Sony A7M4': { brand: 'Sony', price: 16999, title: 'Sony Alpha 7 IV', subtitle: '全画幅基准，全能无反', coverImage: 'https://images.unsplash.com/photo-1516961642265-531546e84af2?w=1000', tags: ['全画幅', '3300万像素', '对焦之神'], specs: { sensor: '3300万全画幅', mount: 'Sony E卡口', price: '约 16,999 RMB' }, reviews: [{ user: '摄影老怪', text: '对焦快准狠，绝对的基准级产品', rating: 5 }], samples: [{ url: 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=800' }, { url: 'https://images.unsplash.com/photo-1521911961916-b8fd6a2e2d09?w=800' }] },
  'Fujifilm X100V': { brand: 'Fujifilm', price: 10000, title: 'Fujifilm X100V', subtitle: '原汁原味的街头摄影与复古色彩', coverImage: 'https://images.unsplash.com/photo-1589802875323-2287fdd1bfba?w=1000', tags: ['APS-C', '复古旁轴', '胶片模拟'], specs: { sensor: '2610万像素 APS-C', lens: '23mm f/2', price: '约 10,000 RMB' }, reviews: [{ user: 'StreetWalker', text: 'Classic Negative 太绝了', rating: 5 }], samples: [{ url: 'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=800' }] },
  'Nikon Z8': { brand: 'Nikon', price: 27999, title: 'Nikon Z8', subtitle: '小旗舰，全能生产力工具', coverImage: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=1000', tags: ['旗舰级', '4500万像素', '8K录制'], specs: { sensor: '4571万堆栈式全画幅', mount: 'Nikon Z', price: '约 27,999 RMB' }, reviews: [{ user: 'Z-Fan', text: '对焦提升太明显了，手感极佳', rating: 5 }], samples: [{ url: 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800' }] },
  'Leica Q3': { brand: 'Leica', price: 48000, title: 'Leica Q3', subtitle: '纯粹的德味美学体验', coverImage: 'https://images.unsplash.com/photo-1615655096345-64a515a447c2?w=1000', tags: ['全画幅', '定焦', '奢侈品级'], specs: { sensor: '6000万全画幅', lens: '28mm f/1.7', price: '约 48,000 RMB' }, reviews: [{ user: 'L-Collector', text: '这一代的微距太强了，色彩依然迷人', rating: 5 }], samples: [{ url: 'https://images.unsplash.com/photo-1515276457388-34859d0ed716?w=800' }] },
  'Canon R5': { brand: 'Canon', price: 23000, title: 'Canon EOS R5', subtitle: '高像素无反全能王', coverImage: 'https://images.unsplash.com/photo-1620807577531-15df1211e40a?w=1000', tags: ['全画幅', '8K', '肖像必备'], specs: { sensor: '4500万像素全画幅', mount: 'RF卡口', price: '约 23,000 RMB' }, reviews: [{ user: 'Portrait', text: '直出肤色依然是业界标杆', rating: 5 }], samples: [{ url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800' }] },
  'Xiaomi 14 Ultra': { brand: 'Xiaomi', price: 6499, title: 'Xiaomi 14 Ultra', subtitle: '徕卡光学 Summilux 镜头', coverImage: 'https://images.unsplash.com/photo-1511746015383-02f897ff02aa9?w=1000', tags: ['徕卡', '一英寸', '摄影套装'], specs: { sensor: '一英寸 LYT-900', lens: '徕卡光学四摄', price: '约 6,499 RMB' }, reviews: [{ user: 'LeicaMobile', text: '徕卡影调非常地道，街拍神器', rating: 5 }], samples: [{ url: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=800' }] },
  'vivo X100 Ultra': { brand: 'vivo', price: 6499, title: 'vivo X100 Ultra', subtitle: '蓝图影像，旗舰之王', coverImage: 'https://images.unsplash.com/photo-1582216260271-eade858fdfb2?w=1000', tags: ['蔡司', '2亿长焦', '演唱会必备'], specs: { sensor: '一英寸 LYT-900', lens: '2亿像素潜望长焦', price: '约 6,499 RMB' }, reviews: [{ user: 'LiveFan', text: '长焦清晰度简直是离大谱，太强了', rating: 5 }], samples: [{ url: 'https://images.unsplash.com/photo-1505236858219-8359eb29e325?w=800' }] },
  'iPhone 15 Pro Max': { brand: 'Apple', price: 9999, title: 'iPhone 15 Pro Max', subtitle: '5倍光学变焦，专业创作平台', coverImage: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=1000', tags: ['ProRes', 'Log', '随身便携'], specs: { sensor: '4800万像素', lens: '13/24/120mm', price: '约 9,999 RMB' }, reviews: [{ user: 'FilmBoy', text: '视频能力的断层式领先', rating: 5 }], samples: [{ url: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=800' }] },
  'OPPO Find X7 Ultra': { brand: 'OPPO', price: 5999, title: 'OPPO Find X7 Ultra', subtitle: '双潜望长焦，哈苏影调', coverImage: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=1000', tags: ['哈苏', '双潜望', '超光影'], specs: { sensor: '一英寸 LYT-900', lens: '双潜望四主摄', price: '约 5,999 RMB' }, reviews: [{ user: 'Hasselblad', text: '人像影调很有高级感', rating: 5 }], samples: [{ url: 'https://images.unsplash.com/photo-1517436073-3b1b116130cb?w=800' }] },
  'Panasonic S5II': { brand: 'Panasonic', price: 11000, title: 'Panasonic S5II', subtitle: '视频神器，相位对焦进化', coverImage: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=1000', tags: ['全画幅', 'L卡口', '视频旗舰'], specs: { sensor: '2420万全画幅', AF: '相位对焦', price: '约 11,000 RMB' }, reviews: [{ user: '编辑建议', text: '适合同时重视照片和视频的用户', rating: 5 }], samples: [{ url: 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800' }] },
  'DJI Osmo Action': { brand: 'DJI', price: 2499, title: 'DJI Osmo Action 系列', subtitle: '适合第一视角、骑行和户外记录', coverImage: 'https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=1000', tags: ['防抖', '超广角', '户外'], specs: { suitableFor: '骑行、徒步、水边与第一视角', focus: '优先比较防抖、续航和配件生态', price: '主流运动相机价位' }, reviews: [{ user: '编辑建议', text: '先确认使用场景，再决定是否需要更多配件', rating: 5 }], samples: [{ url: 'https://images.unsplash.com/photo-1530137073520-4ea6e2f10a48?w=800' }] },
  'Insta360 X Series': { brand: 'Insta360', price: 3499, title: 'Insta360 X 系列', subtitle: '先拍后取景，适合旅行与运动视角', coverImage: 'https://images.unsplash.com/photo-1486911278844-a81c5267e227?w=1000', tags: ['全景', '隐形自拍杆', '旅行'], specs: { suitableFor: '旅行记录、滑雪、骑行和多人同行', focus: '优先考虑后期流程与存储空间', price: '主流全景相机价位' }, reviews: [{ user: '编辑建议', text: '全景素材自由度高，但需要预留后期时间', rating: 5 }], samples: [{ url: 'https://images.unsplash.com/photo-1486911278844-a81c5267e227?w=800' }] },
  'DJI Mini Series': { brand: 'DJI', price: 4599, title: 'DJI Mini 系列', subtitle: '轻量航拍入门，旅行携带压力更小', coverImage: 'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=1000', tags: ['轻量', '航拍', '旅行'], specs: { suitableFor: '旅行风光、城市建立镜头与俯拍构图', focus: '先核实禁飞区、登记与当地规定', price: '入门航拍价位' }, reviews: [{ user: '编辑建议', text: '购买前先确认常去地点是否允许飞行', rating: 5 }], samples: [{ url: 'https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=800' }] },
  'DJI Air Series': { brand: 'DJI', price: 6999, title: 'DJI Air 系列', subtitle: '更重视画质、长焦和抗风能力', coverImage: 'https://images.unsplash.com/photo-1506947411487-a56738267384?w=1000', tags: ['双焦段', '风光', '进阶'], specs: { suitableFor: '进阶风光、远近景切换与商业素材', focus: '在画质、重量与飞行规定之间取舍', price: '进阶航拍价位' }, reviews: [{ user: '编辑建议', text: '适合已经明确需要更高画质的航拍用户', rating: 5 }], samples: [{ url: 'https://images.unsplash.com/photo-1506947411487-a56738267384?w=800' }] }
};

const EQUIPMENT_KIND: Record<string, DeviceKind> = {
  '手机通用拍摄': 'phone',
  '长焦手机拍摄': 'phone',
  'Sony A7M4': 'camera',
  'Fujifilm X100V': 'camera',
  'Nikon Z8': 'camera',
  'Leica Q3': 'camera',
  'Canon R5': 'camera',
  'Panasonic S5II': 'camera',
  'Xiaomi 14 Ultra': 'phone',
  'vivo X100 Ultra': 'phone',
  'iPhone 15 Pro Max': 'phone',
  'OPPO Find X7 Ultra': 'phone',
  'DJI Osmo Action': 'action',
  'Insta360 X Series': 'action',
  'DJI Mini Series': 'drone',
  'DJI Air Series': 'drone',
};

const DEFAULT_EQUIPMENT: Record<string, string> = {
  'this-phone': '手机通用拍摄',
  'pro-phone': '长焦手机拍摄',
  mirrorless: 'Sony A7M4',
  'action-camera': 'DJI Osmo Action',
  drone: 'DJI Mini Series',
};

const BRANDS = ['全部', '通用', 'Sony', 'Fujifilm', 'Canon', 'Nikon', 'Leica', 'Panasonic', 'Apple', 'Xiaomi', 'vivo', 'OPPO', 'DJI', 'Insta360'];
const PRICE_RANGES = ['全部', '5千以内', '5千-1万', '1万-2万', '2万以上'];

type TabType = 'gear' | 'qa';

type QuestionPreview = { id: string; q: string; answers: number };

const normalizeQuestionPreview = (id: string, value: unknown): QuestionPreview => {
  const data = typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  const title = typeof data.title === 'string' ? data.title.trim().slice(0, 100) : '';
  const answers = typeof data.answersCount === 'number' && Number.isFinite(data.answersCount)
    ? Math.max(0, Math.floor(data.answersCount))
    : 0;
  return { id, q: title || '未命名问题', answers };
};

const CURATED_QUESTIONS: QuestionPreview[] = [
  { id: 'qa1', q: '预算1万5，想入手一台拍人像为主的相机，有什么推荐？', answers: 12 },
  { id: 'qa2', q: 'Sony A7M4 和 Canon R6 Mark II 怎么选？', answers: 8 },
  { id: 'qa3', q: '手机拍照和相机拍照差别大吗？', answers: 23 },
];

export default function GuidesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { device, deviceId } = useAppPreferences();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('gear');
  const [activeEquip, setActiveEquip] = useState(DEFAULT_EQUIPMENT[deviceId] ?? 'Sony A7M4');
  const [specsModalVisible, setSpecsModalVisible] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [activeBrand, setActiveBrand] = useState('全部');
  const [activePrice, setActivePrice] = useState('全部');
  const [onlyForMyDevice, setOnlyForMyDevice] = useState(true);
  const [questions, setQuestions] = useState<QuestionPreview[]>(CURATED_QUESTIONS);

  useEffect(() => {
    const questionsQuery = query(
      collection(db, 'questions'),
      orderBy('createdAt', 'desc'),
      limit(3),
    );
    return onSnapshot(
      questionsQuery,
      (snapshot) => {
        if (snapshot.empty) {
          setQuestions(CURATED_QUESTIONS);
          return;
        }
        setQuestions(snapshot.docs.map((questionDoc) =>
          normalizeQuestionPreview(questionDoc.id, questionDoc.data()),
        ));
      },
      () => setQuestions(CURATED_QUESTIONS),
    );
  }, []);

  // Unified global filtering logic
  const filteredEquipment = useMemo(() => {
    return Object.keys(TOPIC_DATA).filter(key => {
      const item = TOPIC_DATA[key];
      const matchesSearch = item.title.toLowerCase().includes(searchText.toLowerCase()) ||
                           item.brand.toLowerCase().includes(searchText.toLowerCase()) ||
                           key.toLowerCase().includes(searchText.toLowerCase());
      const matchesDevice = !onlyForMyDevice || EQUIPMENT_KIND[key] === device.kind;
      const matchesBrand = activeBrand === '全部' || item.brand === activeBrand;
      let matchesPrice = true;
      if (activePrice === '5千以内') matchesPrice = item.price < 5000;
      else if (activePrice === '5千-1万') matchesPrice = item.price >= 5000 && item.price <= 10000;
      else if (activePrice === '1万-2万') matchesPrice = item.price > 10000 && item.price <= 20000;
      else if (activePrice === '2万以上') matchesPrice = item.price > 20000;

      return matchesSearch && matchesDevice && matchesBrand && matchesPrice;
    });
  }, [activeBrand, activePrice, device.kind, onlyForMyDevice, searchText]);

  useEffect(() => {
    setSpecsModalVisible(false);
    setOnlyForMyDevice(true);
    setActiveBrand('全部');
    setActivePrice('全部');
    setSearchText('');
    setActiveEquip(DEFAULT_EQUIPMENT[deviceId] ?? 'Sony A7M4');
  }, [deviceId]);

  useEffect(() => {
    if (filteredEquipment.length > 0 && !filteredEquipment.includes(activeEquip)) {
      setActiveEquip(filteredEquipment[0]);
    }
  }, [activeEquip, filteredEquipment]);

  const currentData = filteredEquipment.includes(activeEquip) ? TOPIC_DATA[activeEquip] : null;

  const pickImage = () => {
    const selectedDeviceName = currentData?.title ?? device.name;
    if (user) {
      router.push({ pathname: '/modal' as never, params: { deviceName: selectedDeviceName } });
    } else {
      router.push({
        pathname: '/auth' as never,
        params: { returnTo: '/modal', deviceName: selectedDeviceName },
      });
    }
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

          <View style={styles.personalizationRow}>
            <View style={styles.personalizationCopy}>
              <Text style={styles.personalizationLabel}>按你的常用设备</Text>
              <Text style={styles.personalizationDevice}>{device.name}</Text>
            </View>
            <TouchableOpacity
              style={[styles.scopeButton, !onlyForMyDevice && styles.scopeButtonAll]}
              onPress={() => setOnlyForMyDevice((value) => !value)}
            >
              <Text style={[styles.scopeButtonText, !onlyForMyDevice && styles.scopeButtonTextAll]}>
                {onlyForMyDevice ? '适合我的' : '全部器材'}
              </Text>
            </TouchableOpacity>
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

        {currentData ? <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
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
          <View style={styles.sectionHeader}><IconSymbol name="sparkles" size={16} color="#D85331" /><Text style={styles.sectionTitle}>使用建议</Text></View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.reviewsScroll} contentContainerStyle={{ paddingHorizontal: 15 }}>
            {currentData.reviews.map((r: any, i: number) => (
              <View key={i} style={styles.reviewCard}>
                <Text style={styles.reviewUser}>@{r.user}</Text>
                <Text style={styles.reviewText}>“{r.text}”</Text>
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
          <View style={styles.sectionHeader}><IconSymbol name="camera.fill" size={16} color="#D85331" /><Text style={styles.sectionTitle}>适合场景示意</Text></View>
          <View style={styles.galleryGrid}>
            {currentData.samples.map((img: any, i: number) => (
              <TouchableOpacity key={i} style={[styles.galleryItemWrapper, { width: itemWidth }]} onPress={() => setFullscreenImage(img.url)}>
                <Image source={{ uri: img.url }} style={styles.galleryImage} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView> : (
        <View style={styles.emptyEquipment}>
          <View style={styles.emptyEquipmentIcon}><IconSymbol name="camera.fill" size={26} color="#D85331" /></View>
          <Text style={styles.emptyEquipmentTitle}>没有符合当前条件的器材</Text>
          <Text style={styles.emptyEquipmentBody}>清除品牌、价格或搜索条件后再看看。</Text>
          <TouchableOpacity style={styles.emptyEquipmentButton} onPress={() => { setActiveBrand('全部'); setActivePrice('全部'); setSearchText(''); }}>
            <Text style={styles.emptyEquipmentButtonText}>清除筛选</Text>
          </TouchableOpacity>
        </View>
      )}
      </>
      ) : null}

      {/* Q&A Tab Content */}
      {activeTab === 'qa' && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.qaContainer}>
          <View style={styles.qaHeader}>
            <Text style={styles.qaTitle}>器材选购问答</Text>
            <Text style={styles.qaSubtitle}>提出你的器材问题，获得社区建议</Text>
          </View>

          <TouchableOpacity
            style={styles.askButton}
            onPress={() => {
              if (user) router.push('/ask-question');
              else router.push({ pathname: '/auth' as never, params: { returnTo: '/ask-question' } });
            }}
          >
            <IconSymbol name="plus" size={20} color="#FFF" />
            <Text style={styles.askButtonText}>发布问题</Text>
          </TouchableOpacity>

          <View style={styles.questionsList}>
            <Text style={styles.questionsTitle}>热门问题</Text>
            {questions.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.questionCard}
                onPress={() => router.push({ pathname: '/question/[id]', params: { id: item.id } })}
              >
                <Text style={styles.questionText}>{item.q}</Text>
                <Text style={styles.answersCount}>{item.answers} 回答</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.allQuestionsButton} onPress={() => router.push('/(tabs)/questions')}>
              <Text style={styles.allQuestionsText}>查看全部问答</Text>
              <IconSymbol name="chevron.right" size={18} color="#D85331" />
            </TouchableOpacity>
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
      {specsModalVisible && currentData && (
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
  personalizationRow: { marginHorizontal: 15, marginBottom: 8, padding: 12, borderRadius: 14, backgroundColor: '#FFF0E9', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  personalizationCopy: { flex: 1 },
  personalizationLabel: { color: '#A86450', fontSize: 9, fontWeight: '800' },
  personalizationDevice: { marginTop: 2, color: '#4B3630', fontSize: 13, fontWeight: '900' },
  scopeButton: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#D85331' },
  scopeButtonAll: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E8C6B9' },
  scopeButtonText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900' },
  scopeButtonTextAll: { color: '#B64B31' },
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
  emptyEquipment: { flex: 1, minHeight: 360, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 },
  emptyEquipmentIcon: { width: 58, height: 58, borderRadius: 20, backgroundColor: '#FFF0E9', alignItems: 'center', justifyContent: 'center' },
  emptyEquipmentTitle: { marginTop: 14, color: '#332E30', fontSize: 16, fontWeight: '900' },
  emptyEquipmentBody: { marginTop: 6, color: '#8D8588', fontSize: 12, textAlign: 'center' },
  emptyEquipmentButton: { marginTop: 16, borderRadius: 13, paddingHorizontal: 18, paddingVertical: 10, backgroundColor: '#D85331' },
  emptyEquipmentButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
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
  allQuestionsButton: {
    minHeight: 46,
    marginTop: 4,
    paddingHorizontal: 14,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#F0D7CE',
    backgroundColor: '#FFF8F5',
  },
  allQuestionsText: { color: '#D85331', fontSize: 14, fontWeight: '800' },
});

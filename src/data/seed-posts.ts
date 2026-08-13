import type { ImageSourcePropType } from 'react-native';

import type { Coordinates, DeviceKind } from '@/src/app-preferences-context';

export type SeedCategory = '旅行' | '人像' | '美食' | '宠物';
export type ParameterSource = '原始拍摄信息' | '推荐复刻参数';

export type SeedPost = {
  id: string;
  city: '北京';
  category: SeedCategory;
  featured?: boolean;
  title: string;
  hook: string;
  image: {
    source: ImageSourcePropType;
    width: number;
    height: number;
    alt: string;
  };
  likes: number;
  deviceKinds: readonly DeviceKind[];
  location: {
    label: string;
    shortLabel: string;
    sourceLabel: string;
    coordinates?: Coordinates;
  };
  time: {
    label: string;
    sourceLabel: string;
    shootingWindow: string;
  };
  gear: {
    camera: string;
    lens?: string;
    sourceLabel: string;
    note?: string;
  };
  parameters: {
    sourceLabel: ParameterSource;
    items: readonly { label: string; value: string }[];
  };
  recreation: {
    difficulty: '入门' | '进阶' | '挑战';
    duration: string;
    steps: readonly string[];
  };
  accessNote?: string;
  credit: {
    creator: string;
    source: 'Pexels' | 'Unsplash' | 'Wikimedia Commons';
    sourceUrl: string;
    license: string;
    licenseUrl: string;
    changes?: string;
  };
};

const images = {
  forbiddenCity: {
    source: require('../../assets/images/seed/beijing-forbidden-city.jpg'),
    width: 1280,
    height: 959,
    alt: '雨天的北京故宫宫墙与湿润地面',
  },
  templeOfHeaven: {
    source: require('../../assets/images/seed/beijing-temple-heaven.jpg'),
    width: 960,
    height: 1280,
    alt: '北京天坛祈年殿的中轴对称画面',
  },
  mutianyu: {
    source: require('../../assets/images/seed/beijing-mutianyu.jpg'),
    width: 4194,
    height: 3145,
    alt: '清晨的慕田峪长城与山脊',
  },
  summerPalace: {
    source: require('../../assets/images/seed/beijing-summer-palace.jpg'),
    width: 2272,
    height: 1704,
    alt: '颐和园昆明湖与远处园林建筑',
  },
  beihaiSunset: {
    source: require('../../assets/images/seed/beijing-beihai-sunset.jpg'),
    width: 3809,
    height: 2857,
    alt: '北京北海公园的湖面日落与倒影',
  },
  birdNest: {
    source: require('../../assets/images/seed/beijing-birdnest.jpg'),
    width: 3840,
    height: 2560,
    alt: '夜晚亮灯的北京国家体育场鸟巢',
  },
  hutong: {
    source: require('../../assets/images/seed/beijing-hutong.jpg'),
    width: 3216,
    height: 2136,
    alt: '北京胡同街巷中的自行车与生活场景',
  },
  pekingDuck: {
    source: require('../../assets/images/seed/beijing-peking-duck.jpg'),
    width: 3000,
    height: 3002,
    alt: '北京餐厅桌上的烤鸭',
  },
  portraitWindow: {
    source: require('../../assets/images/seed/portrait-window.jpg'),
    width: 1200,
    height: 1680,
    alt: '窗边自然光中的人物肖像',
  },
  portraitColorWall: {
    source: require('../../assets/images/seed/portrait-color-wall.jpg'),
    width: 1200,
    height: 1800,
    alt: '彩色墙面前的旅行人像',
  },
  foodBreakfast: {
    source: require('../../assets/images/seed/food-breakfast.jpg'),
    width: 1200,
    height: 800,
    alt: '自然光下的早餐俯拍',
  },
  petDogRun: {
    source: require('../../assets/images/seed/pet-dog-run.jpg'),
    width: 1200,
    height: 801,
    alt: '草地上奔跑中的狗狗',
  },
} satisfies Record<string, SeedPost['image']>;

const params = (
  sourceLabel: ParameterSource,
  ...items: (readonly [string, string])[]
): SeedPost['parameters'] => ({
  sourceLabel,
  items: items.map(([label, value]) => ({ label, value })),
});

const commons = (
  creator: string,
  fileName: string,
  license: string,
  licenseUrl: string,
): SeedPost['credit'] => ({
  creator,
  source: 'Wikimedia Commons',
  sourceUrl: `https://commons.wikimedia.org/wiki/File:${fileName}`,
  license,
  licenseUrl,
  changes: '应用内仅按容器裁切展示，未改变图片内容',
});

const pexels = (creator: string, id: string): SeedPost['credit'] => ({
  creator,
  source: 'Pexels',
  sourceUrl: `https://www.pexels.com/photo/${id}/`,
  license: 'Pexels License',
  licenseUrl: 'https://www.pexels.com/legal-pages/license/',
});

const unsplash = (creator: string, id: string): SeedPost['credit'] => ({
  creator,
  source: 'Unsplash',
  sourceUrl: `https://unsplash.com/photos/${id}`,
  license: 'Unsplash License',
  licenseUrl: 'https://unsplash.com/license',
});

export const SEED_POSTS: readonly SeedPost[] = [
  {
    id: 'beijing-forbidden-city-rain',
    city: '北京',
    category: '旅行',
    featured: true,
    title: '雨把故宫的红墙擦亮了',
    hook: '别只躲雨。压低机位，让湿地反光把红墙和行人的倒影一起留住。',
    image: images.forbiddenCity,
    likes: 8624,
    deviceKinds: ['phone', 'camera'],
    location: {
      label: '东城区 · 故宫中轴院落',
      shortLabel: '故宫',
      sourceLabel: '原始文件坐标',
      coordinates: { latitude: 39.913175, longitude: 116.389817 },
    },
    time: {
      label: '2025.09.05 · 11:54',
      sourceLabel: '原始拍摄时间',
      shootingWindow: '雨天 10:00–15:00',
    },
    gear: {
      camera: 'Samsung Galaxy A52s 5G',
      lens: '等效 25 mm 主摄',
      sourceLabel: '原始拍摄信息',
      note: '普通手机主摄即可复刻，先保护好设备再拍。',
    },
    parameters: params(
      '原始拍摄信息',
      ['焦距', '等效 25 mm'],
      ['光圈', 'f/1.8'],
      ['快门', '约 1/370 s'],
      ['ISO', '25'],
    ),
    recreation: {
      difficulty: '入门',
      duration: '15 分钟',
      steps: [
        '先找一块不会妨碍通行的湿润地面。',
        '把手机降到膝盖以下，让倒影占画面下方三分之一。',
        '点击红墙高光处测光，曝光补偿下调约 0.3 EV。',
        '等待撑伞行人走进留白区域后连拍。',
      ],
    },
    accessNote: '开放区域和参观安排可能变化，出发前请以场馆官方信息为准。',
    credit: commons(
      'LunMa4',
      'Die_verbotene_Stadt_in_Beijing.jpg',
      'CC BY 4.0',
      'https://creativecommons.org/licenses/by/4.0/',
    ),
  },
  {
    id: 'beijing-temple-symmetry',
    city: '北京',
    category: '旅行',
    featured: true,
    title: '天坛中轴，不用超广角也能拍稳',
    hook: '站正、压低、等人少。对称构图最怕的不是游客，而是自己没站在中线上。',
    image: images.templeOfHeaven,
    likes: 7431,
    deviceKinds: ['phone', 'camera'],
    location: {
      label: '东城区 · 天坛祈年殿',
      shortLabel: '天坛',
      sourceLabel: '原始文件坐标',
      coordinates: { latitude: 39.881463, longitude: 116.406826 },
    },
    time: {
      label: '2017.05.06 · 13:03',
      sourceLabel: '原始拍摄时间',
      shootingWindow: '建议 07:00–09:00',
    },
    gear: {
      camera: 'Xiaomi Mi Max',
      lens: '内置主摄',
      sourceLabel: '原始拍摄信息',
      note: '1× 主摄即可；想减少前景游客可尝试 2× 位置后退。',
    },
    parameters: params(
      '原始拍摄信息',
      ['焦距', '3.57 mm'],
      ['光圈', 'f/2'],
      ['快门', '1/790 s'],
      ['ISO', '100'],
    ),
    recreation: {
      difficulty: '入门',
      duration: '20 分钟',
      steps: [
        '打开相机网格线，找到台阶和建筑共同的中轴。',
        '手机保持水平，避免祈年殿向后倾倒。',
        '先锁定建筑亮部曝光，再等待前景短暂清空。',
        '保留一两位尺度合适的游客，画面会更有空间感。',
      ],
    },
    accessNote: '开放时间、票务与可进入区域请以天坛公园官方信息为准。',
    credit: commons(
      'BIJAY BHANDARI',
      'Temple_Of_Heaven.jpg',
      'CC BY-SA 4.0',
      'https://creativecommons.org/licenses/by-sa/4.0/',
    ),
  },
  {
    id: 'beijing-mutianyu-layers',
    city: '北京',
    category: '旅行',
    featured: true,
    title: '长城的纵深，交给山脊自己画',
    hook: '不用把每座烽火台都塞进画面；找一条反复折返的城墙，就有了天然引导线。',
    image: images.mutianyu,
    likes: 6920,
    deviceKinds: ['phone', 'camera'],
    location: {
      label: '怀柔区 · 慕田峪长城',
      shortLabel: '慕田峪',
      sourceLabel: '原始文件坐标',
      coordinates: { latitude: 40.434404, longitude: 116.446838 },
    },
    time: {
      label: '2015.09.24 · 07:26',
      sourceLabel: '原始拍摄时间',
      shootingWindow: '07:00–09:30',
    },
    gear: {
      camera: 'Olympus E-M5 Mark II',
      lens: '14 mm',
      sourceLabel: '原始拍摄信息',
      note: '手机 2×/3× 也能压缩山体层次，重点是保持稳定。',
    },
    parameters: params(
      '原始拍摄信息',
      ['焦距', '14 mm'],
      ['光圈', 'f/8'],
      ['快门', '1/250 s'],
      ['ISO', '200'],
    ),
    recreation: {
      difficulty: '进阶',
      duration: '30 分钟',
      steps: [
        '在安全的开放步道内寻找能看到三层以上山脊的位置。',
        '用 2× 或中焦段让远处城墙显得更紧凑。',
        '把最近的烽火台放在画面一侧，不要堵住走势。',
        '对天空高光测光，后期再轻提山体阴影。',
      ],
    },
    accessNote: '山地天气与开放路段变化较大，请以景区当天信息为准并优先保证安全。',
    credit: commons(
      'Laika ac',
      'Great_Wall_at_Mutianyu_(22398121914).jpg',
      'CC BY-SA 2.0',
      'https://creativecommons.org/licenses/by-sa/2.0/',
    ),
  },
  {
    id: 'beijing-beihai-sunset',
    city: '北京',
    category: '旅行',
    featured: true,
    title: '北海的晚霞，手机也能保住层次',
    hook: '天空很亮、湖面很暗时，先保住云的颜色，倒影会替你把画面补完整。',
    image: images.beihaiSunset,
    likes: 6258,
    deviceKinds: ['phone', 'camera'],
    location: {
      label: '西城区 · 北海公园湖岸',
      shortLabel: '北海公园',
      sourceLabel: '原始图片地点',
      coordinates: { latitude: 39.9255, longitude: 116.389 },
    },
    time: {
      label: '2018.09.04 · 18:40',
      sourceLabel: '原始拍摄时间',
      shootingWindow: '日落前 30 分钟',
    },
    gear: {
      camera: 'Apple iPhone 6s Plus',
      lens: '等效 29 mm 主摄',
      sourceLabel: '原始拍摄信息',
      note: '任何带曝光锁定的手机都可以完成。',
    },
    parameters: params(
      '原始拍摄信息',
      ['焦距', '等效 29 mm'],
      ['光圈', 'f/2.2'],
      ['快门', '1/100 s'],
      ['ISO', '25'],
    ),
    recreation: {
      difficulty: '入门',
      duration: '25 分钟',
      steps: [
        '提前找到能同时看到开阔天空和湖面的位置。',
        '把地平线放在画面中线以下，让晚霞成为主角。',
        '长按天空锁定曝光，再向下微调亮度。',
        '等待水面平静或出现一条有方向感的波纹。',
      ],
    },
    accessNote: '日落时间随季节变化；公园开放安排请以官方信息为准。',
    credit: commons(
      'cattan2011',
      'Bei_Hai_park_sunset,_Beijing,_China.jpg',
      'CC BY 2.0',
      'https://creativecommons.org/licenses/by/2.0/',
    ),
  },
  {
    id: 'beijing-birdnest-blue-hour',
    city: '北京',
    category: '旅行',
    featured: true,
    title: '鸟巢亮灯后，别急着把夜拍黑',
    hook: '蓝调时刻的天空还能看见颜色，建筑灯光也不会过曝成一团。',
    image: images.birdNest,
    likes: 5876,
    deviceKinds: ['phone', 'camera'],
    location: {
      label: '朝阳区 · 奥林匹克公园',
      shortLabel: '鸟巢',
      sourceLabel: '图片来源地点',
      coordinates: { latitude: 39.9929, longitude: 116.3965 },
    },
    time: {
      label: '2015.10.18 · 19:55',
      sourceLabel: '原始拍摄时间',
      shootingWindow: '蓝调时刻至 20:30',
    },
    gear: {
      camera: 'Canon EOS 5D Mark III',
      lens: 'EF 16–35 mm',
      sourceLabel: '原始拍摄信息',
      note: '手机可用夜景模式手持复刻；相机长曝光需要稳定支撑。',
    },
    parameters: params(
      '原始拍摄信息',
      ['焦距', '26 mm'],
      ['光圈', 'f/11'],
      ['快门', '15 s'],
      ['ISO', '125'],
    ),
    recreation: {
      difficulty: '进阶',
      duration: '30 分钟',
      steps: [
        '在天完全黑前到场，先确定建筑与地面的比例。',
        '手机开启夜景模式；相机则固定在稳固支撑上。',
        '点击灯光最亮处测光，避免红色结构失去纹理。',
        '多拍一张较亮的天空和一张较暗的建筑供选择。',
      ],
    },
    accessNote: '灯光、活动与可进入区域可能变化，出发前请核实场馆和园区信息。',
    credit: commons(
      'Morio',
      'Beijing_National_Stadium_2016_October_1.jpg',
      'CC BY-SA 4.0',
      'https://creativecommons.org/licenses/by-sa/4.0/',
    ),
  },
  {
    id: 'beijing-hutong-life',
    city: '北京',
    category: '旅行',
    title: '胡同里，生活比地标更耐看',
    hook: '不用等“完美路人”。自行车、门洞和晾晒的衣服，本来就是北京的画面语言。',
    image: images.hutong,
    likes: 5529,
    deviceKinds: ['phone', 'camera', 'action'],
    location: {
      label: '西城区 · 什刹海周边胡同',
      shortLabel: '什刹海胡同',
      sourceLabel: '图片来源场景',
      coordinates: { latitude: 39.9401, longitude: 116.3963 },
    },
    time: {
      label: '2008.11.26 · 15:46',
      sourceLabel: '原始拍摄时间',
      shootingWindow: '07:00–09:00',
    },
    gear: {
      camera: 'Nikon D90',
      lens: '20 mm（等效约 30 mm）',
      sourceLabel: '原始拍摄信息',
      note: '手机 1× 主摄最接近这种自然的街头视角。',
    },
    parameters: params(
      '原始拍摄信息',
      ['焦距', '20 mm'],
      ['光圈', 'f/5.6'],
      ['快门', '1/125 s'],
      ['ISO', '220'],
    ),
    recreation: {
      difficulty: '进阶',
      duration: '30 分钟',
      steps: [
        '先找有门洞、树影或道路转折的街巷。',
        '使用 1× 主摄并保持与行人有礼貌的距离。',
        '让自行车或路牌成为前景，街巷延伸到画面深处。',
        '不打扰居民，不对着可识别人物持续拍摄。',
      ],
    },
    accessNote: '胡同是居民生活空间，请保持安静并尊重隐私，不进入非公共区域。',
    credit: commons(
      'Jorge Lascar',
      'A_Beijing_Street.jpg',
      'CC BY-SA 2.0',
      'https://creativecommons.org/licenses/by-sa/2.0/',
    ),
  },
  {
    id: 'beijing-summer-palace-layers',
    city: '北京',
    category: '旅行',
    title: '颐和园不只拍佛香阁',
    hook: '用一段岸线、一片湖面和远处建筑分出三层，普通广角也会有园林的深度。',
    image: images.summerPalace,
    likes: 5214,
    deviceKinds: ['phone', 'camera'],
    location: {
      label: '海淀区 · 颐和园昆明湖',
      shortLabel: '颐和园',
      sourceLabel: '图片来源地点',
      coordinates: { latitude: 39.9999, longitude: 116.2755 },
    },
    time: {
      label: '2009.10.04 · 文件时间 00:26',
      sourceLabel: '原始文件时间（可能未校时）',
      shootingWindow: '建议 15:30–日落',
    },
    gear: {
      camera: 'Canon PowerShot SD300',
      lens: '5.8 mm',
      sourceLabel: '原始拍摄信息',
      note: '手机 1× 主摄足够，画面重点是前中远景分层。',
    },
    parameters: params(
      '原始拍摄信息',
      ['焦距', '5.8 mm'],
      ['光圈', 'f/5.6'],
      ['快门', '1/250 s'],
      ['ISO', '未记录'],
    ),
    recreation: {
      difficulty: '入门',
      duration: '25 分钟',
      steps: [
        '沿湖寻找能看到近岸植物和远处建筑的位置。',
        '让近景只占画面边缘，不要遮住湖面。',
        '手机保持水平，先对远处建筑锁定焦点。',
        '等待湖面出现倒影或游船作为尺度。',
      ],
    },
    accessNote: '园区路线、开放时间和票务请以颐和园官方信息为准。',
    credit: commons(
      'Lyn Gateley',
      'Summer_Palace,_Beijing_(4691921970).jpg',
      'CC BY 2.0',
      'https://creativecommons.org/licenses/by/2.0/',
    ),
  },
  {
    id: 'beijing-peking-duck-table',
    city: '北京',
    category: '美食',
    title: '烤鸭上桌，先拍皮的亮和脆',
    hook: '不需要俯拍整桌。靠近一点，让侧光擦过鸭皮，食物会比盘子更有存在感。',
    image: images.pekingDuck,
    likes: 4897,
    deviceKinds: ['phone', 'camera'],
    location: {
      label: '北京 · 烤鸭餐厅靠窗位',
      shortLabel: '烤鸭餐桌',
      sourceLabel: '推荐拍摄场景',
    },
    time: {
      label: '2013.09.19 · 13:11',
      sourceLabel: '原始拍摄时间',
      shootingWindow: '11:00–13:30',
    },
    gear: {
      camera: 'Sony Ericsson Xperia S',
      lens: '4.48 mm 主摄',
      sourceLabel: '原始拍摄信息',
      note: '现代手机用 2× 更容易避开桌面杂物。',
    },
    parameters: params(
      '原始拍摄信息',
      ['焦距', '4.48 mm'],
      ['光圈', 'f/2.4'],
      ['快门', '1/40 s'],
      ['ISO', '250'],
    ),
    recreation: {
      difficulty: '入门',
      duration: '5 分钟',
      steps: [
        '请同桌暂缓动筷，把主盘转向侧光方向。',
        '使用 2× 或略靠近，让鸭皮占据主要画面。',
        '点击最亮的鸭皮并稍微降低曝光。',
        '拍完立刻开吃，不长时间占用餐桌。',
      ],
    },
    credit: commons(
      'Danrah',
      'Peking_Duck.jpg',
      'CC BY-SA 4.0',
      'https://creativecommons.org/licenses/by-sa/4.0/',
    ),
  },
  {
    id: 'beijing-hutong-window-portrait',
    city: '北京',
    category: '人像',
    title: '胡同民宿的一扇窗，就是柔光棚',
    hook: '关掉顶灯，让人物侧向窗户，普通手机也能拍出安静、有层次的脸。',
    image: images.portraitWindow,
    likes: 4368,
    deviceKinds: ['phone', 'camera'],
    location: {
      label: '东城区 · 胡同室内窗边',
      shortLabel: '胡同窗边',
      sourceLabel: '推荐拍摄场景',
    },
    time: {
      label: '建议上午 09:00–11:00',
      sourceLabel: '推荐拍摄时间',
      shootingWindow: '09:00–11:00',
    },
    gear: {
      camera: '人像模式手机或相机',
      lens: '等效 50–85 mm',
      sourceLabel: '推荐器材',
    },
    parameters: params(
      '推荐复刻参数',
      ['焦距', '等效 50–85 mm'],
      ['光圈', 'f/2.2–f/4'],
      ['快门', '不低于 1/200 s'],
      ['ISO', '自动，上限 800'],
    ),
    recreation: {
      difficulty: '入门',
      duration: '20 分钟',
      steps: [
        '关闭室内顶灯，让窗成为唯一主光。',
        '人物与窗户约成 45°，离窗一到两步。',
        '对近侧眼睛单点对焦并略微降低曝光。',
        '用白墙或白纸从暗侧补一点反光。',
      ],
    },
    credit: pexels('YI REN', '28874266'),
  },
  {
    id: 'beijing-798-color-portrait',
    city: '北京',
    category: '人像',
    title: '去 798，先找一块干净的颜色',
    hook: '背景越大胆，人物动作越要简单；让服装和墙面只形成一组明确对比。',
    image: images.portraitColorWall,
    likes: 3976,
    deviceKinds: ['phone', 'camera'],
    location: {
      label: '朝阳区 · 798 艺术区彩色墙面',
      shortLabel: '798 艺术区',
      sourceLabel: '推荐拍摄场景',
      coordinates: { latitude: 39.9842, longitude: 116.4955 },
    },
    time: {
      label: '建议薄云天 14:00–17:00',
      sourceLabel: '推荐拍摄时间',
      shootingWindow: '14:00–17:00',
    },
    gear: {
      camera: '手机 1×/2× 或相机',
      lens: '等效 35–50 mm',
      sourceLabel: '推荐器材',
    },
    parameters: params(
      '推荐复刻参数',
      ['焦距', '等效 50 mm'],
      ['光圈', 'f/4'],
      ['快门', '1/500 s'],
      ['ISO', '100–200'],
    ),
    recreation: {
      difficulty: '入门',
      duration: '15 分钟',
      steps: [
        '选择只有一到两种主色的墙面。',
        '让服装与背景形成冷暖或明暗反差。',
        '人物离墙半步，减少紧贴墙面的硬阴影。',
        '保持墙面线条端正并给视线方向留白。',
      ],
    },
    accessNote: '展览和可拍摄区域可能变化，请遵守现场标识。',
    credit: pexels('Mica Bassa', '36689026'),
  },
  {
    id: 'beijing-breakfast-window',
    city: '北京',
    category: '美食',
    title: '北京早餐，先搭好颜色三角',
    hook: '别把豆汁、焦圈和小菜摆成一排；三样食物错开，普通桌面也会有秩序。',
    image: images.foodBreakfast,
    likes: 3724,
    deviceKinds: ['phone', 'camera'],
    location: {
      label: '北京 · 靠窗早餐店',
      shortLabel: '早餐店',
      sourceLabel: '推荐拍摄场景',
    },
    time: {
      label: '建议 07:30–09:30',
      sourceLabel: '推荐拍摄时间',
      shootingWindow: '07:30–09:30',
    },
    gear: {
      camera: '手机主摄或相机',
      lens: '等效 35–50 mm',
      sourceLabel: '推荐器材',
      note: '素材来源可核验器材为 Canon EOS 5D Mark IV；曝光值为复刻建议。',
    },
    parameters: params(
      '推荐复刻参数',
      ['焦距', '等效 35–50 mm'],
      ['光圈', 'f/4–f/5.6'],
      ['快门', '1/125 s'],
      ['ISO', '200–400'],
    ),
    recreation: {
      difficulty: '进阶',
      duration: '10 分钟',
      steps: [
        '把三样主食或小菜组成不等边三角形。',
        '餐具放在画面边缘作为引导线。',
        '手机尽量与桌面平行，避免餐盘变形。',
        '用纸巾或菜单从背光侧补一点亮度。',
      ],
    },
    credit: unsplash('Heather Ford', '9YgUAuCV7Is'),
  },
  {
    id: 'beijing-chaoyang-dog-run',
    city: '北京',
    category: '宠物',
    title: '朝阳公园里，让狗狗冲进焦点',
    hook: '别追着它横移，先判断重复奔跑的路线，再在终点前等它。',
    image: images.petDogRun,
    likes: 4512,
    deviceKinds: ['phone', 'camera'],
    location: {
      label: '朝阳区 · 开阔且允许活动的草地',
      shortLabel: '朝阳公园',
      sourceLabel: '推荐拍摄场景',
      coordinates: { latitude: 39.9337, longitude: 116.4753 },
    },
    time: {
      label: '建议 07:00–09:00',
      sourceLabel: '推荐拍摄时间',
      shootingWindow: '07:00–09:00',
    },
    gear: {
      camera: '支持连拍追焦的手机或相机',
      lens: '手机 3× 或等效 70–200 mm',
      sourceLabel: '推荐器材',
    },
    parameters: params(
      '推荐复刻参数',
      ['焦距', '等效 70–135 mm'],
      ['光圈', 'f/2.8–f/4'],
      ['快门', '1/1600 s'],
      ['ISO', '自动，上限 1600'],
    ),
    recreation: {
      difficulty: '挑战',
      duration: '30 分钟',
      steps: [
        '先观察狗狗反复奔跑的路线和安全范围。',
        '蹲低并预对焦它即将经过的位置。',
        '开启高速连拍与连续追焦。',
        '挑选四脚舒展、眼睛清晰且背景干净的一帧。',
      ],
    },
    accessNote: '只在允许宠物活动的区域拍摄，并始终牵引和照看宠物。',
    credit: pexels('Gili Pup', '11545921'),
  },
];

export const SEED_POST_BY_ID = Object.fromEntries(
  SEED_POSTS.map((post) => [post.id, post]),
) as Readonly<Record<string, SeedPost>>;

import type { ImageSourcePropType } from 'react-native';

export type SeedCategory = '旅行' | '人像' | '美食' | '宠物';
export type ParameterSource = '原始拍摄信息' | '推荐复刻参数';

export type SeedPost = {
  id: string;
  category: SeedCategory;
  title: string;
  hook: string;
  image: {
    source: ImageSourcePropType;
    width: number;
    height: number;
    alt: string;
  };
  likes: number;
  location: { label: string; sourceLabel: string };
  time: { label: string; sourceLabel: string };
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
  credit: {
    creator: string;
    source: 'Pexels' | 'Unsplash' | 'Wikimedia Commons';
    sourceUrl: string;
    license: string;
    licenseUrl: string;
  };
};

const images = {
  travelCity: {
    source: require('../../assets/images/seed/travel-city.jpg'),
    width: 1200,
    height: 1800,
    alt: '黄金时刻的城市街道',
  },
  travelTrain: {
    source: require('../../assets/images/seed/travel-train.jpg'),
    width: 1280,
    height: 908,
    alt: '从列车车窗望向 River Tamar',
  },
  travelRoad: {
    source: require('../../assets/images/seed/travel-road.jpg'),
    width: 1280,
    height: 853,
    alt: '冰岛山地公路延伸向远方',
  },
  portraitWindow: {
    source: require('../../assets/images/seed/portrait-window.jpg'),
    width: 1200,
    height: 1680,
    alt: '窗边自然光中的人物肖像',
  },
  portraitSilhouette: {
    source: require('../../assets/images/seed/portrait-silhouette.jpg'),
    width: 1200,
    height: 1264,
    alt: '黄金时刻的人物剪影',
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
  foodLatte: {
    source: require('../../assets/images/seed/food-latte.jpg'),
    width: 1200,
    height: 800,
    alt: '咖啡馆里的拉花咖啡',
  },
  foodNightMarket: {
    source: require('../../assets/images/seed/food-night-market.jpg'),
    width: 1200,
    height: 1800,
    alt: '夜市暖光和蒸汽中的食物',
  },
  petCatWindow: {
    source: require('../../assets/images/seed/pet-cat-window.jpg'),
    width: 1280,
    height: 1280,
    alt: '坐在窗边向外张望的猫咪',
  },
  petDogRun: {
    source: require('../../assets/images/seed/pet-dog-run.jpg'),
    width: 1200,
    height: 801,
    alt: '草地上奔跑中的狗狗',
  },
  petHug: {
    source: require('../../assets/images/seed/pet-hug.jpg'),
    width: 1200,
    height: 800,
    alt: '人与宠物亲密拥抱的瞬间',
  },
} satisfies Record<string, SeedPost['image']>;

const params = (
  sourceLabel: ParameterSource,
  ...items: (readonly [string, string])[]
): SeedPost['parameters'] => ({
  sourceLabel,
  items: items.map(([label, value]) => ({ label, value })),
});

const pexels = (creator: string, id: string): SeedPost['credit'] => ({
  creator,
  source: 'Pexels',
  sourceUrl: 'https://www.pexels.com/photo/' + id + '/',
  license: 'Pexels License',
  licenseUrl: 'https://www.pexels.com/legal-pages/license/',
});

const unsplash = (creator: string, id: string): SeedPost['credit'] => ({
  creator,
  source: 'Unsplash',
  sourceUrl: 'https://unsplash.com/photos/' + id,
  license: 'Unsplash License',
  licenseUrl: 'https://unsplash.com/license',
});

/**
 * 只有列车窗景与窗边猫咪的完整曝光信息已从来源页核验。
 * 其余参数都是透明标注的复刻建议，不代表素材原始 EXIF。
 */
export const SEED_POSTS: readonly SeedPost[] = [
  {
    id: 'seed-travel-city',
    category: '旅行',
    title: '在城市里等一束光',
    hook: '旅行照不必装下整座城，先让明暗替你决定主角。',
    image: images.travelCity,
    likes: 2386,
    location: { label: '墨西哥城街区', sourceLabel: '图片来源地点' },
    time: { label: '日落前 1 小时', sourceLabel: '推荐拍摄时段' },
    gear: { camera: '任意手机或相机', lens: '等效 35–50 mm', sourceLabel: '推荐器材' },
    parameters: params(
      '推荐复刻参数',
      ['焦距', '等效 50 mm'],
      ['光圈', 'f/4'],
      ['快门', '1/500 s'],
      ['ISO', '100'],
      ['曝光补偿', '-0.3 EV'],
    ),
    recreation: {
      difficulty: '入门',
      duration: '15 分钟',
      steps: [
        '寻找有明显明暗分界的街角。',
        '用中焦段把主体放在光线边缘。',
        '对高光测光并略微降低曝光。',
        '等待行人进入画面后连拍。',
      ],
    },
    credit: pexels('Fernando Paleta', '15150041'),
  },
  {
    id: 'seed-travel-train',
    category: '旅行',
    title: '列车窗外，风景只停一秒',
    hook: '玻璃反光和高速掠过的岸线，也可以成为旅途的速度感。',
    image: images.travelTrain,
    likes: 1842,
    location: { label: 'River Tamar', sourceLabel: '原始拍摄地点' },
    time: { label: '2021 年 11 月 2 日', sourceLabel: '原始拍摄日期' },
    gear: { camera: 'Apple iPhone 7', lens: '内置广角镜头', sourceLabel: '原始拍摄信息' },
    parameters: params(
      '原始拍摄信息',
      ['快门', '1/850 s'],
      ['光圈', 'f/1.8'],
      ['ISO', '20'],
    ),
    recreation: {
      difficulty: '进阶',
      duration: '20 分钟',
      steps: [
        '上车前擦净车窗。',
        '让镜头贴近玻璃并遮住车厢反光。',
        '点击远处景物对焦并连拍。',
        '保留少量运动模糊表现速度。',
      ],
    },
    credit: {
      creator: 'Tim Green',
      source: 'Wikimedia Commons',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:View_from_the_train_window.jpg',
      license: 'CC BY 2.0',
      licenseUrl: 'https://creativecommons.org/licenses/by/2.0/',
    },
  },
  {
    id: 'seed-travel-road',
    category: '旅行',
    title: '让公路把视线带到远方',
    hook: '最简单的旅行构图，是把一条路当作画面的箭头。',
    image: images.travelRoad,
    likes: 3174,
    location: { label: 'Iceland', sourceLabel: '图片来源地点' },
    time: { label: '阴天或日出后', sourceLabel: '推荐拍摄时段' },
    gear: { camera: '相机或支持 RAW 的手机', lens: '等效 24–28 mm', sourceLabel: '推荐器材' },
    parameters: params(
      '推荐复刻参数',
      ['焦距', '等效 24 mm'],
      ['光圈', 'f/8'],
      ['快门', '1/250 s'],
      ['ISO', '100'],
    ),
    recreation: {
      difficulty: '入门',
      duration: '10 分钟',
      steps: [
        '只在安全停车点或步道内取景。',
        '让道路从画面底角指向远山。',
        '保持地平线水平。',
        '对天空高光测光。',
      ],
    },
    credit: {
      creator: 'Jonatan Pie',
      source: 'Wikimedia Commons',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Mountain_Road_in_Iceland.jpg',
      license: 'CC0 1.0',
      licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
    },
  },
  {
    id: 'seed-portrait-window',
    category: '人像',
    title: '窗边两步，就是柔光棚',
    hook: '关掉顶灯，让一扇窗把脸部轮廓慢慢照出来。',
    image: images.portraitWindow,
    likes: 4258,
    location: { label: '靠窗的安静室内', sourceLabel: '推荐场景' },
    time: { label: '上午 9–11 点', sourceLabel: '推荐拍摄时段' },
    gear: { camera: '相机或人像模式手机', lens: '等效 50–85 mm', sourceLabel: '推荐器材' },
    parameters: params(
      '推荐复刻参数',
      ['焦距', '等效 85 mm'],
      ['光圈', 'f/2.2'],
      ['快门', '1/200 s'],
      ['ISO', '400'],
    ),
    recreation: {
      difficulty: '入门',
      duration: '20 分钟',
      steps: [
        '关闭室内顶灯。',
        '让人物与窗户约成 45°。',
        '对近侧眼睛单点对焦。',
        '用白墙或白纸从暗侧补光。',
      ],
    },
    credit: pexels('YI REN', '28874266'),
  },
  {
    id: 'seed-portrait-silhouette',
    category: '人像',
    title: '把表情藏进剪影里',
    hook: '不拍清脸，姿态和轮廓反而更会讲故事。',
    image: images.portraitSilhouette,
    likes: 2917,
    location: { label: '明亮出口或落地窗前', sourceLabel: '推荐场景' },
    time: { label: '日落前后 20 分钟', sourceLabel: '推荐拍摄时段' },
    gear: { camera: '任意手机或相机', lens: '等效 35–50 mm', sourceLabel: '推荐器材' },
    parameters: params(
      '推荐复刻参数',
      ['焦距', '等效 35 mm'],
      ['光圈', 'f/4'],
      ['快门', '1/320 s'],
      ['ISO', '100'],
      ['曝光补偿', '-1.3 EV'],
    ),
    recreation: {
      difficulty: '进阶',
      duration: '15 分钟',
      steps: [
        '让人物站在明亮背景前。',
        '点击背景最亮处测光。',
        '让人物侧身制造清晰轮廓。',
        '检查高光不过曝。',
      ],
    },
    credit: pexels('mododeolhar', '2475138'),
  },
  {
    id: 'seed-portrait-color-wall',
    category: '人像',
    title: '把人放进一块大胆的颜色',
    hook: '背景越鲜明，人物的动作和服装就越要简单。',
    image: images.portraitColorWall,
    likes: 3621,
    location: { label: 'Buenos Aires · La Boca', sourceLabel: '图片来源地点' },
    time: { label: '薄云天气或开放阴影', sourceLabel: '推荐拍摄时段' },
    gear: { camera: '相机或手机主摄', lens: '等效 35–50 mm', sourceLabel: '推荐器材' },
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
        '选择一到两种主色的墙面。',
        '让服装和背景形成色彩反差。',
        '人物离墙半步减少硬阴影。',
        '保持墙面线条端正。',
      ],
    },
    credit: pexels('Mica Bassa', '36689026'),
  },
  {
    id: 'seed-food-breakfast',
    category: '美食',
    title: '早餐俯拍，先搭好颜色三角',
    hook: '别把餐盘摆成一排，让三个颜色互相牵住视线。',
    image: images.foodBreakfast,
    likes: 4016,
    location: { label: '靠窗餐桌', sourceLabel: '推荐场景' },
    time: { label: '上午柔和自然光', sourceLabel: '推荐拍摄时段' },
    gear: {
      camera: 'Canon EOS 5D Mark IV',
      sourceLabel: '来源可核验器材',
      note: '机型来自 Unsplash；下列曝光值为推荐复刻参数。',
    },
    parameters: params(
      '推荐复刻参数',
      ['焦距', '35–50 mm'],
      ['光圈', 'f/4–f/5.6'],
      ['快门', '1/125 s'],
      ['ISO', '200–400'],
    ),
    recreation: {
      difficulty: '进阶',
      duration: '25 分钟',
      steps: [
        '用三样主食组成不等边三角形。',
        '餐具放在边缘作为引导线。',
        '相机保持与桌面平行。',
        '用白纸补亮背光侧。',
      ],
    },
    credit: unsplash('Heather Ford', '9YgUAuCV7Is'),
  },
  {
    id: 'seed-food-latte',
    category: '美食',
    title: '一杯咖啡，用侧光拍出香气',
    hook: '桌边的斜光会让奶泡纹理和杯沿同时亮起来。',
    image: images.foodLatte,
    likes: 3542,
    location: { label: 'Tiong Bahru Bakery · Singapore', sourceLabel: '图片来源地点' },
    time: { label: '靠窗有侧光时', sourceLabel: '推荐拍摄时段' },
    gear: {
      camera: 'Fujifilm X-E2',
      sourceLabel: '来源可核验器材',
      note: '机型来自 Unsplash；下列曝光值为推荐复刻参数。',
    },
    parameters: params(
      '推荐复刻参数',
      ['焦距', '等效 35–50 mm'],
      ['光圈', 'f/2.8'],
      ['快门', '1/125 s'],
      ['ISO', '400'],
    ),
    recreation: {
      difficulty: '入门',
      duration: '10 分钟',
      steps: [
        '把咖啡放在窗户侧前方。',
        '整理桌面只留一件环境小物。',
        '从杯沿略高处拍摄。',
        '对奶泡最亮处测光。',
      ],
    },
    credit: unsplash('Lex Sirikiat', 'cUI21fhe810'),
  },
  {
    id: 'seed-food-night-market',
    category: '美食',
    title: '夜市烟火气，要保住那盏暖灯',
    hook: '先为食物上的高光测光，周围的人群自然退进氛围里。',
    image: images.foodNightMarket,
    likes: 4721,
    location: { label: '有摊位灯光的夜市', sourceLabel: '推荐场景' },
    time: { label: '入夜后、人流未拥挤时', sourceLabel: '推荐拍摄时段' },
    gear: { camera: '夜景模式手机或大光圈相机', lens: '等效 35 mm', sourceLabel: '推荐器材' },
    parameters: params(
      '推荐复刻参数',
      ['焦距', '等效 35 mm'],
      ['光圈', 'f/1.8–f/2.8'],
      ['快门', '1/125 s'],
      ['ISO', '800–1600'],
    ),
    recreation: {
      difficulty: '进阶',
      duration: '20 分钟',
      steps: [
        '找暖色摊位灯直射食物的位置。',
        '靠近拍摄且不使用闪光灯。',
        '对食物高光测光。',
        '等待摊主的手或蒸汽进入画面。',
      ],
    },
    credit: pexels('Hatice Dinç', '37205223'),
  },
  {
    id: 'seed-pet-cat-window',
    category: '宠物',
    title: '猫咪看窗外时，先别叫它',
    hook: '安静等待，比拿零食逗它更容易拍到专注的侧脸。',
    image: images.petCatWindow,
    likes: 5368,
    location: { label: '窗边室内', sourceLabel: '推荐场景' },
    time: { label: '2017 年 9 月 2 日', sourceLabel: '原始拍摄日期' },
    gear: {
      camera: 'Apple iPhone SE（第一代）',
      lens: '内置广角镜头',
      sourceLabel: '原始拍摄信息',
    },
    parameters: params(
      '原始拍摄信息',
      ['快门', '1/50 s'],
      ['光圈', 'f/2.2'],
      ['ISO', '32'],
    ),
    recreation: {
      difficulty: '入门',
      duration: '10 分钟',
      steps: [
        '提前清理窗边背景。',
        '把手机降到猫眼高度。',
        '锁定眼睛附近的对焦与曝光。',
        '等待耳朵和视线舒展时连拍。',
      ],
    },
    credit: {
      creator: 'Acagastya',
      source: 'Wikimedia Commons',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Cat_looking_outside_the_window.jpg',
      license: 'CC0 1.0',
      licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
    },
  },
  {
    id: 'seed-pet-dog-run',
    category: '宠物',
    title: '让奔跑的狗狗冲进焦点',
    hook: '别追着它横移，预判路线并在终点前守株待兔。',
    image: images.petDogRun,
    likes: 4480,
    location: { label: '安全、开阔的草地', sourceLabel: '推荐场景' },
    time: { label: '清晨或傍晚', sourceLabel: '推荐拍摄时段' },
    gear: { camera: '支持连续对焦的相机', lens: '70–200 mm 或等效中长焦', sourceLabel: '推荐器材' },
    parameters: params(
      '推荐复刻参数',
      ['焦距', '135 mm'],
      ['光圈', 'f/2.8–f/4'],
      ['快门', '1/1600 s'],
      ['ISO', '自动，上限 1600'],
    ),
    recreation: {
      difficulty: '挑战',
      duration: '30 分钟',
      steps: [
        '先观察狗狗反复奔跑的路线。',
        '蹲低并预对焦必经位置。',
        '开启高速连拍和连续追焦。',
        '挑选四脚舒展且眼睛清晰的一帧。',
      ],
    },
    credit: pexels('Gili Pup', '11545921'),
  },
  {
    id: 'seed-pet-hug',
    category: '宠物',
    title: '拥抱发生时，把镜头放低',
    hook: '亲密感不是摆出来的，先让人和宠物忘记相机。',
    image: images.petHug,
    likes: 3896,
    location: { label: '光线柔和的家中', sourceLabel: '推荐场景' },
    time: { label: '午后窗边自然光', sourceLabel: '推荐拍摄时段' },
    gear: { camera: '相机或手机主摄', lens: '等效 35–50 mm', sourceLabel: '推荐器材' },
    parameters: params(
      '推荐复刻参数',
      ['焦距', '等效 50 mm'],
      ['光圈', 'f/2.8'],
      ['快门', '1/250 s'],
      ['ISO', '400–800'],
    ),
    recreation: {
      difficulty: '入门',
      duration: '20 分钟',
      steps: [
        '先让人和宠物自然互动。',
        '把镜头降到宠物眼睛高度。',
        '对焦靠近镜头的一双眼睛。',
        '保留手臂与毛发形成的环形构图。',
      ],
    },
    credit: pexels('cottonbro studio', '6568486'),
  },
];

export const SEED_POST_BY_ID = Object.fromEntries(
  SEED_POSTS.map((post) => [post.id, post]),
) as Readonly<Record<string, SeedPost>>;

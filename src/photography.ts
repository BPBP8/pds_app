import type { DeviceKind } from './app-preferences-context';
import type { SeedPost } from './data/seed-posts';

export type Composition = 'thirds' | 'symmetry' | 'frame' | 'leading';
export type LightCondition = 'normal' | 'bright' | 'dark';

export const COMPOSITIONS: { id: Composition; title: string; instruction: string }[] = [
  { id: 'thirds', title: '三分构图', instruction: '让主体靠近交点，把地平线放在上方或下方的横线上。' },
  { id: 'symmetry', title: '中轴对称', instruction: '先站到建筑中线，让左右边缘保持平衡，打开网格检查水平。' },
  { id: 'frame', title: '前景取框', instruction: '借门洞、树枝或窗框围住主体，留出前后层次。' },
  { id: 'leading', title: '引导线', instruction: '让道路、城墙或栏杆从画面下方延伸到主体附近。' },
];

export function recommendedComposition(postId: string): Composition {
  if (/temple|birdnest/.test(postId)) return 'symmetry';
  if (/mutianyu/.test(postId)) return 'leading';
  if (/hutong|summer-palace/.test(postId)) return 'frame';
  return 'thirds';
}

export function getShootingSetup(post: SeedPost, device: DeviceKind, light: LightCondition) {
  const isNight = /birdnest|night|blue-hour/.test(post.id);
  const isMotion = post.category === '宠物';
  const compensation = light === 'bright' ? '-0.7 EV' : light === 'dark' ? '+0.3 EV' : '-0.3 EV';
  if (device === 'phone') return [
    { label: '镜头', value: post.category === '人像' ? '2×；没有光学长焦就用 1×' : '先用 1× 主摄' },
    { label: '曝光', value: compensation },
    { label: '模式', value: isMotion ? '连拍，等动作进入画面' : isNight ? '夜景模式，靠稳后拍摄' : '普通拍照，打开九宫格' },
    { label: '对焦', value: post.category === '人像' || isMotion ? '点击人物眼睛或宠物眼睛' : '点击主要建筑或远处主体' },
  ];
  if (device === 'camera') return [
    { label: '拍摄模式', value: isMotion ? '快门优先，连续对焦' : '光圈优先；参数随现场光线调整' },
    { label: '光圈起点', value: post.category === '人像' ? 'f/2.8–f/4' : 'f/5.6–f/8' },
    { label: '快门起点', value: isMotion ? '1/1000 秒起' : isNight ? '手持 1/60 秒起，注意防抖' : '手持 1/125 秒起' },
    { label: '感光度', value: '自动 ISO，优先保证画面不糊' },
    { label: '曝光补偿起点', value: compensation },
  ];
  return [
    { label: '设备选择', value: device === 'action' ? '适合第一视角和行走记录' : '先确认机位是否适合航拍' },
    { label: '与本机位的关系', value: post.deviceKinds.includes(device) ? '可以参考本机位的主体和构图' : '此机位优先使用手机或相机，建议切换设备' },
    { label: '使用建议', value: device === 'action' ? '保持地平线水平，主体靠近画面中央' : '确认允许飞行后再制定航拍路线' },
  ];
}

export function getPoseTips(post: SeedPost) {
  if (post.category === '美食') return ['把餐盘放到窗边，让光从侧面照进来。', '先移开杂物，保留一两件能说明用餐场景的物品。', '俯拍时保持镜头与桌面平行；侧拍时把背景压简洁。'];
  if (post.category === '宠物') return ['先蹲低到宠物眼睛附近的高度。', '请同伴在镜头旁吸引注意，给运动方向留出空间。', '使用连拍，从清晰的表情和动作中选一张。'];
  return ['让人物站在一侧交点，给建筑或景物留出空间。', '侧身看向景物，或缓慢走过画面，先用自然动作代替僵硬摆拍。', '拍摄者稍微退后；拍半身时优先用 2× 或相机中焦，减少近距离广角变形。'];
}

export function navigationUrl(post: SeedPost, origin?: { latitude: number; longitude: number }) {
  const source = 'webapp.bpbp8.pdsapp';
  const target = post.location.coordinates;
  if (target && origin) {
    return 'https://api.map.baidu.com/direction?origin=' + encodeURIComponent(origin.latitude + ',' + origin.longitude)
      + '&destination=' + encodeURIComponent(target.latitude + ',' + target.longitude)
      + '&mode=walking&region=' + encodeURIComponent('北京') + '&coord_type=wgs84&output=html&src=' + source;
  }
  if (target) {
    return 'https://api.map.baidu.com/marker?location=' + encodeURIComponent(target.latitude + ',' + target.longitude)
      + '&title=' + encodeURIComponent(post.location.shortLabel) + '&content=' + encodeURIComponent(post.location.label)
      + '&coord_type=wgs84&output=html&src=' + source;
  }
  return 'https://api.map.baidu.com/geocoder?address=' + encodeURIComponent('北京 ' + post.location.label)
    + '&output=html&src=' + source;
}

export function matchingSamples(posts: readonly SeedPost[], device: DeviceKind) {
  return posts.filter(post => post.deviceKinds.includes(device));
}

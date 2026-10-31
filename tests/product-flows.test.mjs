import assert from 'node:assert/strict';
import test from 'node:test';
import { getPoseTips, getShootingSetup, matchingSamples, navigationUrl, recommendedComposition } from '../src/photography.ts';

const architecture = { id: 'beijing-temple-symmetry', category: '旅行', deviceKinds: ['phone', 'camera'], location: { shortLabel: '天坛', label: '北京 · 天坛', coordinates: { latitude: 39.8822, longitude: 116.4066 } } };
const portrait = { ...architecture, id: 'beijing-portrait', category: '人像' };

test('Navigation preserves GPS coordinates and declares their coordinate system', () => {
  const url = new URL(navigationUrl(architecture));
  assert.equal(url.origin, 'https://api.map.baidu.com');
  assert.equal(url.searchParams.get('coord_type'), 'wgs84');
  assert.equal(url.searchParams.get('location'), '39.8822,116.4066');
  assert.equal(url.searchParams.get('title'), '天坛');
});
test('Directions use the actual user position, and places without GPS use address search', () => {
  const url = new URL(navigationUrl(architecture, { latitude: 39.9, longitude: 116.4 }));
  assert.equal(url.searchParams.get('origin'), '39.9,116.4');
  assert.equal(url.searchParams.get('destination'), '39.8822,116.4066');
  const reference = { ...architecture, location: { label: '胡同窗边', shortLabel: '胡同' } };
  const referenceUrl = new URL(navigationUrl(reference));
  assert.equal(referenceUrl.pathname, '/geocoder');
  assert.equal(referenceUrl.searchParams.has('location'), false);
});
test('Device-specific guidance gives usable phone and camera controls', () => {
  const phone = getShootingSetup(portrait, 'phone', 'bright');
  const camera = getShootingSetup(portrait, 'camera', 'normal');
  assert.ok(phone.some(item => item.value.includes('2×')));
  assert.ok(phone.some(item => item.value.includes('-0.7')));
  assert.ok(camera.some(item => item.value.includes('f/2.8')));
  assert.ok(!phone.some(item => item.value.includes('f/2.8')));
});
test('Motion and night scenes change capture advice instead of reusing a single parameter preset', () => {
  const motion = getShootingSetup({ ...architecture, category: '宠物' }, 'camera', 'normal');
  const night = getShootingSetup({ ...architecture, id: 'beijing-birdnest-blue-hour' }, 'phone', 'normal');
  assert.ok(motion.some(item => item.value.includes('1/1000')));
  assert.ok(night.some(item => item.value.includes('夜景')));
  assert.ok(getPoseTips({ ...architecture, category: '宠物' }).some(tip => tip.includes('蹲低')));
});
test('Architectural scenes have an appropriate initial framing and unsupported devices are not labeled as matching', () => {
  assert.equal(recommendedComposition(architecture.id), 'symmetry');
  assert.equal(recommendedComposition('beijing-mutianyu-layers'), 'leading');
  assert.deepEqual(matchingSamples([architecture], 'drone'), []);
});

import { readPhotoMetadata, sourceDeviceKind } from '../src/photo-metadata.ts';
test('Photo metadata handles browser EXIF and never invents missing camera values', () => {
  const original = readPhotoMetadata({ Make: 'Canon', Model: 'Canon EOS R', ExposureTime: 0.004, ISO: 200, DateTimeOriginal: new Date('2024-01-02T03:04:05Z') }, '手机');
  assert.equal(original.deviceName, 'Canon EOS R');
  assert.equal(original.params.shutter, '1/250 s');
  assert.equal(original.params.iso, '200');
  assert.ok(original.capturedAt);
  assert.deepEqual(readPhotoMetadata({}, '我的手机'), { deviceName: '我的手机', capturedAt: '', params: {} });
});

test('Equipment sample classification uses the original camera, not guide compatibility', () => {
 assert.equal(sourceDeviceKind('Apple iPhone 6s Plus'), 'phone');
 assert.equal(sourceDeviceKind('Canon EOS 5D Mark III'), 'camera');
 assert.equal(sourceDeviceKind('Sony Ericsson Xperia S'), 'phone');
});

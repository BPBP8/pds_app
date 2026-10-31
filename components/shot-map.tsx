import React from 'react';
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { navigationUrl } from '@/src/photography';
import type { ShotMapProps } from './shot-map.types';

export default function ShotMap({ posts, selectedId, coordinates }: ShotMapProps) {
  const selected = posts.find(post => post.id === selectedId) ?? posts[0];
  return <View style={styles.box}>
    <Text style={styles.title}>在地图中查看机位</Text>
    <Text style={styles.copy}>选择下方机位，可以打开实际地图查看位置和路线。</Text>
    {selected ? <TouchableOpacity onPress={() => void Linking.openURL(navigationUrl(selected, coordinates))} style={styles.button}>
      <Text style={styles.buttonText}>打开地图 · {selected.location.shortLabel}</Text>
    </TouchableOpacity> : null}
  </View>;
}
const styles = StyleSheet.create({ box: { minHeight: 200, justifyContent: 'center', padding: 22, backgroundColor: '#F4F1EC', borderRadius: 18 }, title: { fontSize: 20, fontWeight: '700', color: '#272325' }, copy: { color: '#766F72', lineHeight: 22, marginVertical: 12 }, button: { padding: 14, borderRadius: 12, backgroundColor: '#D85331' }, buttonText: { color: '#FFF', fontWeight: '700' } });

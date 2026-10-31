import { Asset } from 'expo-asset';
import React, { useEffect, useRef, useState } from 'react';
import type { Map as LeafletMap, Marker } from 'leaflet';
import { StyleSheet, Text, View } from 'react-native';
import type { ShotMapProps } from './shot-map.types';
import './leaflet-base.css';
import './shot-map.css';

export default function ShotMap({ posts, selectedId, onSelect, coordinates }: ShotMapProps) {
  const node = useRef<HTMLDivElement | null>(null);
  const map = useRef<LeafletMap | null>(null);
  const markers = useRef(new Map<string, Marker>());
  const onSelectRef = useRef(onSelect);
  const selectedRef = useRef(selectedId);
  const [status, setStatus] = useState('');
  onSelectRef.current = onSelect;
  selectedRef.current = selectedId;
  const pointKey = posts.filter(post => post.location.coordinates).map(post => post.id).join('|');

  useEffect(() => {
    let disposed = false;
    let instance: LeafletMap | null = null;
    const currentMarkers = markers.current;
    async function start() {
      try {
        const L = await import('leaflet');
        if (!node.current || disposed) return;
        instance = L.map(node.current, { scrollWheelZoom: false, zoomControl: true }).setView([39.92, 116.4], 11);
        map.current = instance;
        const tile = L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
          subdomains: 'ab', maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors · Tiles: <a href="https://www.hotosm.org/">HOT</a>, hosted by OSM France',
        }).addTo(instance);
        let errors = 0;
        tile.on('tileerror', () => { errors += 1; if (errors >= 3 && !disposed) setStatus('地图底图暂时无法加载，你仍可以从下方选择机位并打开导航。'); });
        tile.on('tileload', () => { if (!disposed) setStatus(''); });
        const bounds: [number, number][] = [];
        for (const post of posts) {
          const point = post.location.coordinates;
          if (!point) continue;
          bounds.push([point.latitude, point.longitude]);
          const wrapper = document.createElement('div');
          wrapper.className = 'pds-photo-marker' + (post.id === selectedRef.current ? ' is-selected' : '');
          const image = document.createElement('img');
          image.src = Asset.fromModule(post.image.source as number).uri;
          image.alt = post.title;
          wrapper.appendChild(image);
          const marker = L.marker([point.latitude, point.longitude], {
            icon: L.divIcon({ html: wrapper, className: 'pds-map-marker', iconSize: [48, 48], iconAnchor: [24, 24] }),
            title: post.location.shortLabel, keyboard: true,
          }).addTo(instance);
          marker.on('click', () => onSelectRef.current(post.id));
          marker.bindTooltip(post.location.shortLabel, { direction: 'top', offset: [0, -25] });
          currentMarkers.set(post.id, marker);
        }
        if (bounds.length) instance.fitBounds(bounds, { padding: [34, 34], maxZoom: 13 });
        if (!bounds.length) setStatus('本分类暂未提供精确机位，参考场景仍可在下方浏览。');
        if (coordinates) L.circleMarker([coordinates.latitude, coordinates.longitude], { radius: 7, color: '#FFF', weight: 3, fillColor: '#3A82D7', fillOpacity: 1 }).addTo(instance).bindTooltip('你的位置');
      } catch {
        if (!disposed) setStatus('地图暂时无法加载，请使用下方机位列表或导航入口。');
      }
    }
    void start();
    return () => { disposed = true; instance?.remove(); map.current = null; currentMarkers.clear(); };
    // The key changes when the filtered set of real locations changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pointKey, coordinates?.latitude, coordinates?.longitude]);

  useEffect(() => {
    markers.current.forEach((marker, id) => {
      marker.getElement()?.querySelector('.pds-photo-marker')?.classList.toggle('is-selected', id === selectedId);
      marker.setZIndexOffset(id === selectedId ? 100 : 0);
    });
  }, [selectedId]);

  return <View><div className="pds-live-map" ref={node} role="region" aria-label="北京摄影机位地图" />{status ? <Text style={styles.status}>{status}</Text> : null}</View>;
}
const styles = StyleSheet.create({ status: { fontSize: 12, color: '#8F5B41', lineHeight: 20, padding: 10, backgroundColor: '#FFF3E8', marginTop: 6, borderRadius: 10 } });

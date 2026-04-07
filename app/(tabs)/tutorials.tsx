import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, FlatList, Image, Dimensions, ActivityIndicator, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../src/config/firebase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Tutorial {
    id: string;
    title: string;
    description: string;
    coverImage: string;
    authorName: string;
    authorAvatar: string;
    createdAt?: any;
    category: 'composition' | 'parameters' | 'lighting' | 'post-processing';
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    duration: number;
    likes: number;
}

const MOCK_TUTORIALS: Tutorial[] = [
    {
        id: 'tut1',
        title: '三分法构图完全指南',
        description: '掌握摄影最基础的构图法则，让你的照片更具视觉冲击力',
        coverImage: 'https://images.unsplash.com/photo-1500051638674-ff996a0ec29e?q=80&w=800',
        authorName: '摄影导师',
        authorAvatar: 'https://i.pravatar.cc/150?u=t1',
        category: 'composition',
        difficulty: 'beginner',
        duration: 15,
        likes: 328,
    },
    {
        id: 'tut2',
        title: '夜景人像参数设置',
        description: '如何在暗光环境下设置相机参数，捕捉完美人像',
        coverImage: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=800',
        authorName: '夜景大师',
        authorAvatar: 'https://i.pravatar.cc/150?u=t2',
        category: 'parameters',
        difficulty: 'intermediate',
        duration: 20,
        likes: 256,
    },
    {
        id: 'tut3',
        title: '自然光摄影技巧',
        description: '利用自然光创作出专业级摄影作品',
        coverImage: 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?q=80&w=800',
        authorName: '光影探索者',
        authorAvatar: 'https://i.pravatar.cc/150?u=t3',
        category: 'lighting',
        difficulty: 'beginner',
        duration: 12,
        likes: 412,
    },
    {
        id: 'tut4',
        title: '日系调色入门',
        description: '调出清新淡雅的日系风格照片',
        coverImage: 'https://images.unsplash.com/photo-1493863641943-9b68992a8d07?q=80&w=800',
        authorName: '后期达人',
        authorAvatar: 'https://i.pravatar.cc/150?u=t4',
        category: 'post-processing',
        difficulty: 'beginner',
        duration: 18,
        likes: 567,
    },
];

const CATEGORIES = [
    { key: '全部', label: '全部', color: '#1D1D1F' },
    { key: 'composition', label: '构图', color: '#FF6B6B' },
    { key: 'parameters', label: '参数', color: '#4ECDC4' },
    { key: 'lighting', label: '光影', color: '#FFE66D' },
    { key: 'post-processing', label: '后期', color: '#95E1D3' },
];

const DIFFICULTY_MAP: Record<string, string> = {
    beginner: '入门',
    intermediate: '进阶',
    advanced: '高级',
};

export default function TutorialsScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const [tutorials, setTutorials] = useState<Tutorial[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState('全部');

    useEffect(() => {
        let isMounted = true;

        try {
            const q = query(collection(db, 'tutorials'), orderBy('createdAt', 'desc'));
            const unsubscribe = onSnapshot(q, (querySnapshot) => {
                if (!isMounted) return;
                const data: Tutorial[] = [];
                querySnapshot.forEach((doc) => {
                    data.push({ id: doc.id, ...doc.data() });
                });
                setTutorials(data.length > 0 ? data : MOCK_TUTORIALS);
                setLoading(false);
            }, (error) => {
                if (!isMounted) return;
                setTutorials(MOCK_TUTORIALS);
                setLoading(false);
            });

            return () => {
                isMounted = false;
                unsubscribe();
            };
        } catch (e) {
            if (isMounted) {
                setTutorials(MOCK_TUTORIALS);
                setLoading(false);
            }
        }
    }, []);

    const filteredTutorials = selectedCategory === '全部'
        ? tutorials
        : tutorials.filter(t => t.category === selectedCategory);

    const renderItem = ({ item }: { item: Tutorial }) => (
        <TouchableOpacity
            style={styles.cardWrapper}
            activeOpacity={0.9}
            onPress={() => router.push({ pathname: '/tutorial/[id]', params: { id: item.id } })}
        >
            <View style={styles.card}>
                <Image
                    source={{ uri: item.coverImage }}
                    style={styles.coverImage}
                    resizeMode="cover"
                />
                <View style={styles.cardContent}>
                    <View style={styles.metaRow}>
                        <View style={[styles.categoryBadge, { backgroundColor: CATEGORIES.find(c => c.key === item.category)?.color || '#1D1D1F' }]}>
                            <Text style={styles.categoryText}>
                                {CATEGORIES.find(c => c.key === item.category)?.label || item.category}
                            </Text>
                        </View>
                        <Text style={styles.difficultyText}>
                            {DIFFICULTY_MAP[item.difficulty] || item.difficulty}
                        </Text>
                        <Text style={styles.durationText}>{item.duration}分钟</Text>
                    </View>
                    <Text style={styles.tutorialTitle}>{item.title}</Text>
                    <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
                    <View style={styles.authorRow}>
                        <Image source={{ uri: item.authorAvatar }} style={styles.authorAvatar} />
                        <Text style={styles.authorName}>{item.authorName}</Text>
                        <View style={{ flex: 1 }} />
                        <Text style={styles.likesText}>{item.likes} 收藏</Text>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <Text style={styles.title}>拍照教程</Text>
                <Text style={styles.subtitle}>从入门到进阶，系统学习摄影</Text>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                    {CATEGORIES.map((cat) => (
                        <TouchableOpacity
                            key={cat.key}
                            style={[
                                styles.categoryTag,
                                selectedCategory === cat.key && { backgroundColor: cat.color }
                            ]}
                            onPress={() => setSelectedCategory(cat.key)}
                        >
                            <Text style={[
                                styles.categoryTagText,
                                selectedCategory === cat.key && styles.categoryTagTextActive
                            ]}>
                                {cat.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {loading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#FF2D55" />
                </View>
            ) : (
                <FlatList
                    data={filteredTutorials}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F8F8',
    },
    header: {
        paddingHorizontal: 20,
        paddingBottom: 20,
        backgroundColor: '#FFFFFF',
    },
    title: {
        fontSize: 34,
        fontWeight: '900',
        color: '#1D1D1F',
        letterSpacing: -1,
    },
    subtitle: {
        fontSize: 15,
        color: '#86868B',
        marginTop: 4,
        fontWeight: '500',
    },
    categoryScroll: {
        marginTop: 16,
    },
    categoryTag: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#F0F0F5',
        marginRight: 10,
    },
    categoryTagText: {
        color: '#636366',
        fontWeight: '600',
        fontSize: 13,
    },
    categoryTagTextActive: {
        color: '#FFFFFF',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContainer: {
        padding: 20,
        paddingBottom: 100,
    },
    cardWrapper: {
        marginBottom: 20,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    coverImage: {
        width: '100%',
        height: 160,
        backgroundColor: '#F5F5F7',
    },
    cardContent: {
        padding: 16,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    categoryBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
    },
    categoryText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: 'bold',
    },
    difficultyText: {
        color: '#86868B',
        fontSize: 12,
        marginLeft: 12,
    },
    durationText: {
        color: '#86868B',
        fontSize: 12,
        marginLeft: 12,
    },
    tutorialTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#1D1D1F',
        marginBottom: 6,
    },
    description: {
        fontSize: 14,
        color: '#636366',
        lineHeight: 20,
        marginBottom: 12,
    },
    authorRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    authorAvatar: {
        width: 20,
        height: 20,
        borderRadius: 10,
    },
    authorName: {
        fontSize: 12,
        color: '#636366',
        marginLeft: 8,
    },
    likesText: {
        fontSize: 12,
        color: '#FF6B6B',
        fontWeight: '600',
    },
});

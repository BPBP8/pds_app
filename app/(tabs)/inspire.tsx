import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, FlatList, Image, Dimensions, ActivityIndicator, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, increment, getDocs } from 'firebase/firestore';
import { db } from '../../src/config/firebase';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useSafeAreaInsets } from 'react-native-safe-area-context';



interface Post {
    id: string;
    imageUrl?: string;
    imageUrls?: string[];
    userId?: string;
    createdAt?: any;
    likes?: number;
    title?: string;
    avatar?: string;
    motivation?: string;
    mood?: string;
    methods?: string[];
    notes?: string;
    params?: any;
    tutorial?: any;
    tags?: string[];
}

// Stunning mock data for empty state
// Stunning mock data for empty state
const MOCK_POSTS: Post[] = [
    {
        id: 'mock1',
        imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1000&auto=format&fit=crop',
        imageUrls: ['https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1000', 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?q=80&w=1000'],
        userId: 'ArtLover99',
        title: 'Neon Nights',
        likes: 1240,
        avatar: 'https://i.pravatar.cc/150?u=1',
        motivation: '色彩练习',
        mood: '热烈',
        methods: ['环境光', '极简构图'],
        notes: '在霓虹灯下寻找那一抹纯净的色彩对比。',
        params: { camera: 'Sony A7R4', lens: '35mm f/1.4', focalLength: '35mm', aperture: 'f/1.4' }
    },
    {
        id: 'mock2',
        imageUrl: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=1000&auto=format&fit=crop',
        userId: 'Visionary',
        title: 'Abstract Fluid',
        likes: 382,
        avatar: 'https://i.pravatar.cc/150?u=2',
        motivation: '唯美主义',
        mood: '超现实',
        methods: ['实验创作'],
        params: { camera: 'Fujifilm X-T4', focalLength: '56mm' }
    },
    {
        id: 'mock3',
        imageUrl: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?q=80&w=1000&auto=format&fit=crop',
        userId: 'ColorPop',
        title: 'Geometric Harmony',
        likes: 89,
        avatar: 'https://i.pravatar.cc/150?u=3',
        motivation: '影调探索',
        mood: '客观',
        methods: ['对称美学'],
    },
];

export default function InspireScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedTag, setSelectedTag] = useState('全部');

    useEffect(() => {
        let isMounted = true;
        let unsubscribe: any = null;

        const fallbackTimeout = setTimeout(() => {
            if (isMounted && loading) {
                setPosts(MOCK_POSTS);
                setLoading(false);
            }
        }, 1500);

        try {
            const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
            unsubscribe = onSnapshot(q, (querySnapshot) => {
                if (!isMounted) return;
                clearTimeout(fallbackTimeout);
                const postsData: Post[] = [];
                querySnapshot.forEach((doc) => {
                    postsData.push({ id: doc.id, ...doc.data() });
                });
                setPosts(postsData.length > 0 ? postsData : MOCK_POSTS);
                setLoading(false);
            }, (error) => {
                if (!isMounted) return;
                clearTimeout(fallbackTimeout);
                setPosts(MOCK_POSTS);
                setLoading(false);
            });
        } catch (e) {
            clearTimeout(fallbackTimeout);
            if (isMounted) {
                setPosts(MOCK_POSTS);
                setLoading(false);
            }
        }

        return () => {
            isMounted = false;
            clearTimeout(fallbackTimeout);
            if (unsubscribe) unsubscribe();
        };
    }, []);

    const onRefresh = async () => {
        setRefreshing(true);
        try {
            const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
            const querySnapshot = await getDocs(q);
            const postsData: Post[] = [];
            querySnapshot.forEach((doc) => {
                postsData.push({ id: doc.id, ...doc.data() });
            });
            setPosts(postsData.length > 0 ? postsData : MOCK_POSTS);
        } catch (error) {
            console.error("Refresh error:", error);
            setPosts(MOCK_POSTS);
        } finally {
            setRefreshing(false);
        }
    };

    const handleLike = async (postId: string) => {
        // Optimistic update
        setPosts(prev => prev.map(p => 
            p.id === postId ? { ...p, likes: (p.likes || 0) + 1 } : p
        ));

        // Sync with Firebase if not mock id
        if (!postId.startsWith('mock')) {
            try {
                const postRef = doc(db, 'posts', postId);
                await updateDoc(postRef, {
                    likes: increment(1)
                });
            } catch (error) {
                console.error("Like error:", error);
            }
        }
    };

    const filteredPosts = selectedTag === '全部' 
        ? posts 
        : posts.filter(p => p.motivation === selectedTag);

    const renderItem = ({ item }: { item: Post }) => (
        <TouchableOpacity 
            style={styles.cardWrapper} 
            activeOpacity={0.9}
            onPress={() => router.push({ pathname: '/post/[id]', params: { id: item.id } })}
        >
            <View style={styles.card}>
                <Image
                    source={{ uri: item.imageUrl }}
                    style={styles.image}
                    resizeMode="cover"
                />
                
                <View style={styles.cardInfo}>
                    <View style={styles.userRow}>
                        <Image source={{ uri: item.avatar || 'https://i.pravatar.cc/150?u=0' }} style={styles.avatar} />
                        <Text style={styles.author}>{item.userId?.substring(0, 12)}</Text>
                        <View style={{flex: 1}} />
                        <TouchableOpacity onPress={(e) => {
                            e.stopPropagation();
                            handleLike(item.id);
                        }}>
                            <IconSymbol name="heart.fill" size={14} color="#FF2D55" />
                        </TouchableOpacity>
                        <Text style={styles.likesCount}>{item.likes || 0}</Text>
                    </View>
                </View>

                {/* Status Badges */}
                <View style={styles.badgeContainer}>
                    {item.imageUrls && item.imageUrls.length > 1 && (
                        <View style={styles.iconBadge}>
                            <IconSymbol name="square.fill.on.square.fill" size={10} color="#666" />
                            <Text style={styles.badgeTextSmall}>{item.imageUrls.length}</Text>
                        </View>
                    )}
                </View>

                {/* Light Theme Tag */}
                <View style={styles.badge}>
                    <Text style={styles.badgeText}># {item.motivation || '摄影'}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            {/* Sunny Style Header */}
            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <View style={styles.headerTitleRow}>
                    <Text style={styles.title}>Explore</Text>
                    <View style={styles.sunnyDot} />
                </View>
                <Text style={styles.subtitle}>记录光影与创作的瞬间</Text>
                
                {/* Horizontal Category Tags */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagScroll}>
                    {['全部', '色彩练习', '唯美主义', '极简构图', '纪实摄影', '教程'].map((tag, i) => (
                        <TouchableOpacity
                            key={i}
                            style={[styles.tag, selectedTag === tag ? styles.activeTag : {}]}
                            onPress={() => {
                                if (tag === '教程') {
                                    router.push('/tutorials');
                                } else {
                                    setSelectedTag(tag);
                                }
                            }}
                        >
                            <Text style={[styles.tagText, selectedTag === tag ? styles.activeTagText : {}]}>{tag}</Text>
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
                    data={filteredPosts}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF', 
    },
    header: {
        paddingHorizontal: 20,
        paddingBottom: 20,
        backgroundColor: '#FFFFFF',
    },
    headerTitleRow: {
        flexDirection: 'row',
        alignItems: 'baseline'
    },
    title: {
        fontSize: 34,
        fontWeight: '900',
        color: '#1D1D1F',
        letterSpacing: -1,
    },
    sunnyDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#FFD60A', // Sunny yellow
        marginLeft: 4,
    },
    subtitle: {
        fontSize: 15,
        color: '#86868B',
        marginTop: 4,
        fontWeight: '500',
    },
    tagScroll: {
        marginTop: 20,
    },
    tag: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#F5F5F7',
        marginRight: 10,
    },
    activeTag: {
        backgroundColor: '#1D1D1F',
    },
    tagText: {
        color: '#86868B',
        fontWeight: '600',
        fontSize: 13,
    },
    activeTagText: {
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
        marginBottom: 30,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#F2F2F2',
    },
    image: {
        width: '100%',
        aspectRatio: 1, 
        backgroundColor: '#F5F5F7',
    },
    cardInfo: {
        padding: 15,
        backgroundColor: '#FFFFFF',
    },
    postTitle: {
        color: '#1D1D1F',
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 8,
    },
    userRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 24,
        height: 24,
        borderRadius: 12,
        marginRight: 8,
    },
    author: {
        fontSize: 13,
        fontWeight: '600',
        color: '#3A3A3C',
    },
    likesCount: {
        color: '#86868B',
        fontSize: 12,
        fontWeight: '600',
        marginLeft: 4,
    },
    badge: {
        position: 'absolute',
        bottom: 60,
        right: 15,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 6,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
    },
    badgeText: {
        color: '#1D1D1F',
        fontSize: 11,
        fontWeight: 'bold',
    },
    badgeContainer: {
        position: 'absolute',
        top: 15,
        left: 15,
        flexDirection: 'row',
        gap: 8,
    },
    iconBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
    },
    badgeTextSmall: {
        color: '#666',
        fontSize: 10,
        fontWeight: 'bold',
        marginLeft: 4,
    }
});

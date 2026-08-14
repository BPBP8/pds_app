import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, Image, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../src/config/firebase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface TutorialSection {
    heading: string;
    body: string;
    imageUrls?: string[];
}

interface Tutorial {
    id: string;
    title: string;
    description: string;
    coverImage: string;
    authorName: string;
    authorAvatar: string;
    createdAt?: any;
    category: string;
    difficulty: string;
    duration: number;
    likes: number;
    content: TutorialSection[];
}

const MOCK_TUTORIAL: Tutorial = {
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
    content: [
        {
            heading: '什么是三分法？',
            body: '三分法是一种构图技巧，将画面水平或垂直分成三等份，形成四个交叉点或两条水平/垂直线。\n\n将画面中的主要元素放置在这些交叉点或线上，可以创造出更具视觉吸引力和平衡感的照片。\n\n这种构图方法简单易学，却能显著提升照片的视觉效果，是摄影入门的必备技能。',
            imageUrls: ['https://images.unsplash.com/photo-1500051638674-ff996a0ec29e?q=80&w=800'],
        },
        {
            heading: '如何开启三分网格线？',
            body: '大多数相机和手机都支持显示三分网格线：\n\n• 手机相机：设置 → 网格 → 三分格\n• 单反/无反：菜单 → 显示设置 → 网格线\n\n建议新手在拍摄时开启网格线辅助，帮助你更好地掌握三分法构图。',
        },
        {
            heading: '三分法的应用场景',
            body: '三分法适用于大多数拍摄场景：\n\n• 风景摄影：将地平线放在上三分之一或下三分之一处\n• 人像摄影：将人物的眼睛或身体放置在交叉点上\n• 建筑摄影：将建筑的主要线条与网格线对齐\n• 街头摄影：将主体放置在交叉点，增加画面张力',
            imageUrls: ['https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=800'],
        },
        {
            heading: '练习建议',
            body: '1. 每天用手机拍摄3-5张照片刻意思考三分法\n2. 尝试将同一场景用不同三分法构图对比\n3. 后期裁剪时也可以重新调整构图\n4. 多参考优秀摄影作品，分析它们的三分法应用',
        },
    ],
};

const DIFFICULTY_MAP: Record<string, string> = {
    beginner: '入门',
    intermediate: '进阶',
    advanced: '高级',
};

const CATEGORY_MAP: Record<string, string> = {
    composition: '构图',
    parameters: '参数',
    lighting: '光影',
    'post-processing': '后期',
};

export default function TutorialDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const [tutorial, setTutorial] = useState<Tutorial | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchTutorial() {
            if (!id) return;

            try {
                const docRef = doc(db, 'tutorials', id);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    setTutorial({ id: docSnap.id, ...docSnap.data() } as Tutorial);
                } else {
                    // Fallback to mock data
                    setTutorial(MOCK_TUTORIAL);
                }
            } catch {
                setTutorial(MOCK_TUTORIAL);
            } finally {
                setLoading(false);
            }
        }

        fetchTutorial();
    }, [id]);

    if (loading) {
        return (
            <View style={[styles.container, styles.centerContainer]}>
                <ActivityIndicator size="large" color="#FF2D55" />
            </View>
        );
    }

    if (!tutorial) {
        return (
            <View style={[styles.container, styles.centerContainer]}>
                <Text style={styles.errorText}>教程不存在</Text>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Text style={styles.backButtonText}>返回</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
            >
                {/* Header Image */}
                <Image
                    source={{ uri: tutorial.coverImage }}
                    style={styles.coverImage}
                    resizeMode="cover"
                />

                {/* Back Button */}
                <TouchableOpacity
                    style={[styles.backButtonOverlay, { top: insets.top + 10 }]}
                    onPress={() => router.back()}
                >
                    <View style={styles.backButtonCircle}>
                        <Text style={styles.backButtonIcon}>←</Text>
                    </View>
                </TouchableOpacity>

                {/* Content */}
                <View style={styles.content}>
                    {/* Meta */}
                    <View style={styles.metaRow}>
                        <View style={styles.categoryBadge}>
                            <Text style={styles.categoryText}>
                                {CATEGORY_MAP[tutorial.category] || tutorial.category}
                            </Text>
                        </View>
                        <Text style={styles.metaText}>
                            {DIFFICULTY_MAP[tutorial.difficulty]} · {tutorial.duration}分钟阅读
                        </Text>
                    </View>

                    {/* Title */}
                    <Text style={styles.title}>{tutorial.title}</Text>

                    {/* Description */}
                    <Text style={styles.description}>{tutorial.description}</Text>

                    {/* Author */}
                    <View style={styles.authorRow}>
                        <Image source={{ uri: tutorial.authorAvatar }} style={styles.authorAvatar} />
                        <View>
                            <Text style={styles.authorName}>{tutorial.authorName}</Text>
                            <Text style={styles.authorLabel}>教程作者</Text>
                        </View>
                        <View style={{ flex: 1 }} />
                        <TouchableOpacity style={styles.likeButton}>
                            <Text style={styles.likeIcon}>♥</Text>
                            <Text style={styles.likeText}>{tutorial.likes}</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Divider */}
                    <View style={styles.divider} />

                    {/* Tutorial Content */}
                    {tutorial.content.map((section, index) => (
                        <View key={index} style={styles.section}>
                            <Text style={styles.sectionHeading}>{section.heading}</Text>
                            <Text style={styles.sectionBody}>{section.body}</Text>
                            {section.imageUrls && section.imageUrls.length > 0 && (
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    style={styles.imageScroll}
                                >
                                    {section.imageUrls.map((url, imgIndex) => (
                                        <Image
                                            key={imgIndex}
                                            source={{ uri: url }}
                                            style={styles.sectionImage}
                                            resizeMode="cover"
                                        />
                                    ))}
                                </ScrollView>
                            )}
                        </View>
                    ))}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    centerContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollView: {
        flex: 1,
    },
    coverImage: {
        width: '100%',
        height: 280,
        backgroundColor: '#F5F5F7',
    },
    backButtonOverlay: {
        position: 'absolute',
        left: 20,
        zIndex: 10,
    },
    backButtonCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    backButtonIcon: {
        fontSize: 20,
        color: '#1D1D1F',
    },
    content: {
        padding: 20,
        marginTop: -20,
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    categoryBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: '#FF6B6B',
    },
    categoryText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: 'bold',
    },
    metaText: {
        color: '#86868B',
        fontSize: 13,
        marginLeft: 12,
    },
    title: {
        fontSize: 26,
        fontWeight: '900',
        color: '#1D1D1F',
        letterSpacing: -0.5,
        marginBottom: 12,
    },
    description: {
        fontSize: 16,
        color: '#636366',
        lineHeight: 24,
        marginBottom: 20,
    },
    authorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    authorAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
    },
    authorName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1D1D1F',
        marginLeft: 12,
    },
    authorLabel: {
        fontSize: 12,
        color: '#86868B',
        marginLeft: 12,
    },
    likeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#FFF5F5',
    },
    likeIcon: {
        fontSize: 16,
        color: '#FF6B6B',
        marginRight: 6,
    },
    likeText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FF6B6B',
    },
    divider: {
        height: 1,
        backgroundColor: '#F0F0F5',
        marginBottom: 24,
    },
    section: {
        marginBottom: 32,
    },
    sectionHeading: {
        fontSize: 19,
        fontWeight: '700',
        color: '#1D1D1F',
        marginBottom: 12,
    },
    sectionBody: {
        fontSize: 16,
        color: '#3A3A3C',
        lineHeight: 26,
    },
    imageScroll: {
        marginTop: 16,
        marginHorizontal: -20,
    },
    sectionImage: {
        width: 280,
        height: 180,
        marginRight: 12,
        borderRadius: 12,
        backgroundColor: '#F5F5F7',
    },
    errorText: {
        fontSize: 16,
        color: '#86868B',
        marginBottom: 16,
    },
    backButton: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        backgroundColor: '#FF2D55',
        borderRadius: 8,
    },
    backButtonText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '600',
    },
});

import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../src/config/firebase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Question {
    id: string;
    title: string;
    description: string;
    budget?: string;
    useCase?: string;
    authorId: string;
    authorName: string;
    authorAvatar: string;
    createdAt?: any;
    answersCount: number;
    upvotes: number;
    isResolved: boolean;
    tags: string[];
}

const MOCK_QUESTIONS: Question[] = [
    {
        id: 'qa1',
        title: '预算1万5，想入手一台拍人像为主的相机，有什么推荐？',
        description: '主要拍人像，偶尔拍拍风景，不怎么拍视频。希望对焦快，直出肤色好看。',
        budget: '1万-2万',
        useCase: '人像摄影',
        authorId: 'user1',
        authorName: '摄影小白',
        authorAvatar: 'https://i.pravatar.cc/150?u=q1',
        answersCount: 12,
        upvotes: 45,
        isResolved: true,
        tags: ['人像', 'Sony', 'Canon'],
    },
    {
        id: 'qa2',
        title: 'Sony A7M4 和 Canon R6 Mark II 怎么选？',
        description: '这两台相机价格差不多，主要拍照片和偶尔拍视频，不知道该怎么选。',
        budget: '2万以上',
        useCase: '综合使用',
        authorId: 'user2',
        authorName: '器材纠结党',
        authorAvatar: 'https://i.pravatar.cc/150?u=q2',
        answersCount: 8,
        upvotes: 32,
        isResolved: false,
        tags: ['Sony', 'Canon', '全画幅'],
    },
    {
        id: 'qa3',
        title: '手机拍照和相机拍照差别大吗？',
        description: '新手入门，不知道是先用手机拍还是攒钱买相机，想问问两者的实际差别。',
        authorId: 'user3',
        authorName: '新手咨询',
        authorAvatar: 'https://i.pravatar.cc/150?u=q3',
        answersCount: 23,
        upvotes: 67,
        isResolved: false,
        tags: ['新手入门', '手机摄影'],
    },
    {
        id: 'qa4',
        title: '富士X100V值得买吗？适合什么场景？',
        description: '被它的复古外观吸引了，但不知道实际使用体验如何。',
        budget: '1万-2万',
        useCase: '街头摄影',
        authorId: 'user4',
        authorName: '街拍爱好者',
        authorAvatar: 'https://i.pravatar.cc/150?u=q4',
        answersCount: 15,
        upvotes: 28,
        isResolved: true,
        tags: ['Fujifilm', '街头摄影', '便携'],
    },
];

const FILTER_OPTIONS = ['全部', '未解决', '已解决', '热门'];

export default function QuestionsScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedFilter, setSelectedFilter] = useState('全部');
    const [searchText, setSearchText] = useState('');

    useEffect(() => {
        let isMounted = true;

        try {
            const q = query(collection(db, 'questions'), orderBy('createdAt', 'desc'));
            const unsubscribe = onSnapshot(q, (querySnapshot) => {
                if (!isMounted) return;
                const data: Question[] = [];
                querySnapshot.forEach((doc) => {
                    data.push({ id: doc.id, ...doc.data() });
                });
                setQuestions(data.length > 0 ? data : MOCK_QUESTIONS);
                setLoading(false);
            }, (error) => {
                if (!isMounted) return;
                setQuestions(MOCK_QUESTIONS);
                setLoading(false);
            });

            return () => {
                isMounted = false;
                unsubscribe();
            };
        } catch (e) {
            if (isMounted) {
                setQuestions(MOCK_QUESTIONS);
                setLoading(false);
            }
        }
    }, []);

    const filteredQuestions = questions.filter(q => {
        if (selectedFilter === '未解决') return !q.isResolved;
        if (selectedFilter === '已解决') return q.isResolved;
        if (selectedFilter === '热门') return q.upvotes > 30;
        return true;
    }).filter(q =>
        q.title.toLowerCase().includes(searchText.toLowerCase()) ||
        q.description.toLowerCase().includes(searchText.toLowerCase())
    );

    const renderItem = ({ item }: { item: Question }) => (
        <TouchableOpacity
            style={styles.questionCard}
            activeOpacity={0.9}
            onPress={() => router.push({ pathname: '/question/[id]', params: { id: item.id } })}
        >
            <View style={styles.cardHeader}>
                <View style={styles.authorInfo}>
                    <Text style={styles.authorName}>{item.authorName}</Text>
                    {item.isResolved && (
                        <View style={styles.resolvedBadge}>
                            <Text style={styles.resolvedText}>已解决</Text>
                        </View>
                    )}
                </View>
                <Text style={styles.answersCount}>{item.answersCount} 回答</Text>
            </View>
            <Text style={styles.questionTitle}>{item.title}</Text>
            <Text style={styles.questionDesc} numberOfLines={2}>{item.description}</Text>
            <View style={styles.cardFooter}>
                <View style={styles.tags}>
                    {item.tags.slice(0, 3).map((tag, i) => (
                        <View key={i} style={styles.tag}>
                            <Text style={styles.tagText}>{tag}</Text>
                        </View>
                    ))}
                </View>
                <Text style={styles.upvotes}>↑ {item.upvotes}</Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <Text style={styles.title}>器材问答</Text>
                <Text style={styles.subtitle}>提出问题，获得专业建议</Text>

                {/* Filter Chips */}
                <View style={styles.filterRow}>
                    {FILTER_OPTIONS.map((filter) => (
                        <TouchableOpacity
                            key={filter}
                            style={[styles.filterChip, selectedFilter === filter && styles.filterChipActive]}
                            onPress={() => setSelectedFilter(filter)}
                        >
                            <Text style={[styles.filterText, selectedFilter === filter && styles.filterTextActive]}>
                                {filter}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Search */}
                <TextInput
                    style={styles.searchInput}
                    placeholder="搜索问题..."
                    placeholderTextColor="#86868B"
                    value={searchText}
                    onChangeText={setSearchText}
                />
            </View>

            {loading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#FF2D55" />
                </View>
            ) : (
                <FlatList
                    data={filteredQuestions}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                />
            )}

            {/* FAB - Ask Question */}
            <TouchableOpacity
                style={[styles.fab, { bottom: insets.bottom + 90 }]}
                onPress={() => router.push('/ask-question')}
            >
                <Text style={styles.fabText}>+</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F8F8',
    },
    header: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 20,
        paddingBottom: 16,
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
    filterRow: {
        flexDirection: 'row',
        marginTop: 16,
    },
    filterChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#F0F0F5',
        marginRight: 10,
    },
    filterChipActive: {
        backgroundColor: '#1D1D1F',
    },
    filterText: {
        color: '#636366',
        fontWeight: '600',
        fontSize: 13,
    },
    filterTextActive: {
        color: '#FFFFFF',
    },
    searchInput: {
        marginTop: 16,
        backgroundColor: '#F5F5F7',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        fontSize: 15,
        color: '#1D1D1F',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContainer: {
        padding: 20,
        paddingBottom: 120,
    },
    questionCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 18,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    authorInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    authorName: {
        fontSize: 13,
        color: '#636366',
        fontWeight: '600',
    },
    resolvedBadge: {
        backgroundColor: '#34C759',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
        marginLeft: 8,
    },
    resolvedText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: 'bold',
    },
    answersCount: {
        fontSize: 13,
        color: '#FF6B6B',
        fontWeight: '600',
    },
    questionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1D1D1F',
        lineHeight: 22,
        marginBottom: 8,
    },
    questionDesc: {
        fontSize: 14,
        color: '#636366',
        lineHeight: 20,
        marginBottom: 12,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    tags: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    tag: {
        backgroundColor: '#F0F0F5',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        marginRight: 6,
    },
    tagText: {
        fontSize: 11,
        color: '#636366',
        fontWeight: '600',
    },
    upvotes: {
        fontSize: 13,
        color: '#34C759',
        fontWeight: '700',
    },
    fab: {
        position: 'absolute',
        right: 20,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#FF2D55',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#FF2D55',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    fabText: {
        fontSize: 28,
        color: '#FFFFFF',
        fontWeight: '300',
    },
});

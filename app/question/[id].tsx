import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, Image, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../src/config/firebase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Answer {
    id: string;
    questionId: string;
    answerText: string;
    authorId: string;
    authorName: string;
    authorAvatar: string;
    createdAt?: any;
    upvotes: number;
    isAccepted: boolean;
}

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

const MOCK_QUESTION: Question = {
    id: 'qa1',
    title: '预算1万5，想入手一台拍人像为主的相机，有什么推荐？',
    description: '主要拍人像，偶尔拍拍风景，不怎么拍视频。希望对焦快，直出肤色好看。',
    budget: '1万-2万',
    useCase: '人像摄影',
    authorId: 'user1',
    authorName: '摄影小白',
    authorAvatar: 'https://i.pravatar.cc/150?u=q1',
    answersCount: 3,
    upvotes: 45,
    isResolved: true,
    tags: ['人像', 'Sony', 'Canon'],
};

const MOCK_ANSWERS: Answer[] = [
    {
        id: 'a1',
        questionId: 'qa1',
        answerText: '这个预算推荐 Sony A7M4， 对焦性能非常出色，特别是人眼对焦，拍人像很方便。直出颜色通过创意外观也能调出很好看的肤色。',
        authorId: 'user10',
        authorName: '器材老玩家',
        authorAvatar: 'https://i.pravatar.cc/150?u=a1',
        upvotes: 23,
        isAccepted: true,
    },
    {
        id: 'a2',
        questionId: 'qa1',
        answerText: 'Canon R6 Mark II 也很好，直出肤色是业界标杆，拍人像非常省心。就是价格可能稍微超预算一点点。',
        authorId: 'user11',
        authorName: 'Canon粉',
        authorAvatar: 'https://i.pravatar.cc/150?u=a2',
        upvotes: 12,
        isAccepted: false,
    },
    {
        id: 'a3',
        questionId: 'qa1',
        answerText: '如果不介意aps-c画幅，富士X-T5也是很好的选择。胶片模拟拍人像很有味道，而且性价比很高。',
        authorId: 'user12',
        authorName: '富士用户',
        authorAvatar: 'https://i.pravatar.cc/150?u=a3',
        upvotes: 8,
        isAccepted: false,
    },
];

export default function QuestionDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const [question, setQuestion] = useState<Question | null>(null);
    const [answers, setAnswers] = useState<Answer[]>([]);
    const [loading, setLoading] = useState(true);
    const [answerText, setAnswerText] = useState('');

    useEffect(() => {
        async function fetchData() {
            if (!id) return;

            try {
                const docRef = doc(db, 'questions', id);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    setQuestion({ id: docSnap.id, ...docSnap.data() } as Question);
                } else {
                    setQuestion(MOCK_QUESTION);
                }
            } catch (e) {
                setQuestion(MOCK_QUESTION);
            } finally {
                // Mock answers for now
                setAnswers(MOCK_ANSWERS);
                setLoading(false);
            }
        }

        fetchData();
    }, [id]);

    const handleSubmitAnswer = async () => {
        if (!answerText.trim()) return;

        // In real app, this would add to Firestore
        const newAnswer: Answer = {
            id: `a${Date.now()}`,
            questionId: id || 'qa1',
            answerText: answerText.trim(),
            authorId: 'currentUser',
            authorName: '当前用户',
            authorAvatar: 'https://i.pravatar.cc/150?u=current',
            upvotes: 0,
            isAccepted: false,
        };

        setAnswers(prev => [...prev, newAnswer]);
        setAnswerText('');
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.centerContainer]}>
                <ActivityIndicator size="large" color="#FF2D55" />
            </View>
        );
    }

    if (!question) {
        return (
            <View style={[styles.container, styles.centerContainer]}>
                <Text style={styles.errorText}>问题不存在</Text>
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
                contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
            >
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                        <Text style={styles.backBtnText}>←</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>问答详情</Text>
                    <View style={{ width: 40 }} />
                </View>

                {/* Question */}
                <View style={styles.questionSection}>
                    <View style={styles.questionHeader}>
                        <Text style={styles.authorName}>{question.authorName}</Text>
                        {question.isResolved && (
                            <View style={styles.resolvedBadge}>
                                <Text style={styles.resolvedText}>已解决</Text>
                            </View>
                        )}
                    </View>
                    <Text style={styles.questionTitle}>{question.title}</Text>
                    <Text style={styles.questionDesc}>{question.description}</Text>

                    <View style={styles.metaRow}>
                        {question.budget && (
                            <View style={styles.metaBadge}>
                                <Text style={styles.metaText}>预算: {question.budget}</Text>
                            </View>
                        )}
                        {question.useCase && (
                            <View style={styles.metaBadge}>
                                <Text style={styles.metaText}>用途: {question.useCase}</Text>
                            </View>
                        )}
                    </View>

                    <View style={styles.tagsRow}>
                        {question.tags.map((tag, i) => (
                            <View key={i} style={styles.tag}>
                                <Text style={styles.tagText}>{tag}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Divider */}
                <View style={styles.divider}>
                    <Text style={styles.dividerText}>{answers.length} 个回答</Text>
                </View>

                {/* Answers */}
                {answers.map((answer) => (
                    <View key={answer.id} style={[styles.answerCard, answer.isAccepted && styles.acceptedAnswer]}>
                        {answer.isAccepted && (
                            <View style={styles.acceptedBanner}>
                                <Text style={styles.acceptedBannerText}>最佳答案</Text>
                            </View>
                        )}
                        <View style={styles.answerHeader}>
                            <Image source={{ uri: answer.authorAvatar }} style={styles.answerAvatar} />
                            <Text style={styles.answerAuthor}>{answer.authorName}</Text>
                        </View>
                        <Text style={styles.answerText}>{answer.answerText}</Text>
                        <TouchableOpacity style={styles.upvoteBtn}>
                            <Text style={styles.upvoteText}>↑ {answer.upvotes}</Text>
                        </TouchableOpacity>
                    </View>
                ))}
            </ScrollView>

            {/* Answer Input */}
            <View style={[styles.inputContainer, { paddingBottom: insets.bottom + 20 }]}>
                <TextInput
                    style={styles.input}
                    placeholder="写下你的回答..."
                    placeholderTextColor="#86868B"
                    multiline
                    value={answerText}
                    onChangeText={setAnswerText}
                />
                <TouchableOpacity
                    style={[styles.submitBtn, !answerText.trim() && styles.submitBtnDisabled]}
                    onPress={handleSubmitAnswer}
                    disabled={!answerText.trim()}
                >
                    <Text style={styles.submitBtnText}>发送</Text>
                </TouchableOpacity>
            </View>
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 50,
        paddingBottom: 16,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F5',
    },
    backBtn: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    backBtnText: {
        fontSize: 24,
        color: '#1D1D1F',
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#1D1D1F',
    },
    questionSection: {
        padding: 20,
        backgroundColor: '#FFFFFF',
    },
    questionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    authorName: {
        fontSize: 14,
        color: '#636366',
        fontWeight: '600',
    },
    resolvedBadge: {
        backgroundColor: '#34C759',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
        marginLeft: 10,
    },
    resolvedText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: 'bold',
    },
    questionTitle: {
        fontSize: 22,
        fontWeight: '900',
        color: '#1D1D1F',
        lineHeight: 30,
        marginBottom: 12,
    },
    questionDesc: {
        fontSize: 16,
        color: '#636366',
        lineHeight: 24,
        marginBottom: 16,
    },
    metaRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 12,
    },
    metaBadge: {
        backgroundColor: '#F0F0F5',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        marginRight: 8,
    },
    metaText: {
        fontSize: 12,
        color: '#636366',
        fontWeight: '600',
    },
    tagsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    tag: {
        backgroundColor: '#FFF0F0',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
        marginRight: 8,
    },
    tagText: {
        fontSize: 12,
        color: '#FF6B6B',
        fontWeight: '600',
    },
    divider: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: '#F8F8F8',
    },
    dividerText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1D1D1F',
    },
    answerCard: {
        marginHorizontal: 20,
        marginBottom: 16,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 18,
        borderWidth: 1,
        borderColor: '#F0F0F5',
    },
    acceptedAnswer: {
        borderColor: '#34C759',
        borderWidth: 2,
    },
    acceptedBanner: {
        backgroundColor: '#34C759',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 6,
        alignSelf: 'flex-start',
        marginBottom: 12,
    },
    acceptedBannerText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: 'bold',
    },
    answerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    answerAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
    },
    answerAuthor: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1D1D1F',
        marginLeft: 10,
    },
    answerText: {
        fontSize: 15,
        color: '#3A3A3C',
        lineHeight: 24,
    },
    upvoteBtn: {
        marginTop: 12,
        paddingVertical: 6,
        paddingHorizontal: 12,
        backgroundColor: '#F0F0F5',
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    upvoteText: {
        fontSize: 13,
        color: '#34C759',
        fontWeight: '700',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: 20,
        paddingTop: 16,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#F0F0F5',
    },
    input: {
        flex: 1,
        backgroundColor: '#F5F5F7',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 15,
        color: '#1D1D1F',
        maxHeight: 100,
    },
    submitBtn: {
        backgroundColor: '#FF2D55',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 12,
        marginLeft: 12,
    },
    submitBtnDisabled: {
        backgroundColor: '#F0F0F5',
    },
    submitBtnText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
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

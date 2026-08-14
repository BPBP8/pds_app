import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
    collection,
    doc,
    getDoc,
    increment,
    onSnapshot,
    orderBy,
    query,
    runTransaction,
    serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../src/config/firebase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getSafeAuthorName, useAuth } from '@/src/auth-context';

interface Answer {
    id: string;
    questionId: string;
    answerText: string;
    authorId: string;
    authorName: string;
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
    answersCount: number;
    upvotes: number;
    isResolved: boolean;
    tags: string[];
}

const asRecord = (value: unknown): Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value)
        ? value as Record<string, unknown>
        : {};

const asText = (value: unknown, fallback: string, maxLength: number) => {
    if (typeof value !== 'string') return fallback;
    const normalized = value.trim();
    return normalized ? normalized.slice(0, maxLength) : fallback;
};

const asOptionalText = (value: unknown, maxLength: number) => {
    if (typeof value !== 'string') return undefined;
    const normalized = value.trim();
    return normalized ? normalized.slice(0, maxLength) : undefined;
};

const asCount = (value: unknown) =>
    typeof value === 'number' && Number.isFinite(value)
        ? Math.max(0, Math.trunc(value))
        : 0;

const asTags = (value: unknown) =>
    Array.isArray(value)
        ? value
            .filter((tag): tag is string => typeof tag === 'string')
            .map((tag) => tag.trim().slice(0, 30))
            .filter(Boolean)
            .slice(0, 10)
        : [];

function normalizeQuestion(id: string, value: unknown): Question {
    const data = asRecord(value);
    return {
        id,
        title: asText(data.title, '未命名问题', 100),
        description: asText(data.description, '暂时没有问题描述。', 1200),
        budget: asOptionalText(data.budget, 40),
        useCase: asOptionalText(data.useCase, 40),
        authorId: asText(data.authorId, '', 128),
        authorName: asText(data.authorName, '拍点啥用户', 40),
        answersCount: asCount(data.answersCount),
        upvotes: asCount(data.upvotes),
        isResolved: data.isResolved === true,
        tags: asTags(data.tags),
    };
}

function normalizeAnswer(id: string, questionId: string, value: unknown): Answer {
    const data = asRecord(value);
    return {
        id,
        questionId: asText(data.questionId, questionId, 128),
        answerText: asText(data.answerText, '这条回答暂时无法显示。', 2000),
        authorId: asText(data.authorId, '', 128),
        authorName: asText(data.authorName, '拍点啥用户', 40),
        upvotes: asCount(data.upvotes),
        isAccepted: data.isAccepted === true,
    };
}

const getAuthorInitial = (authorName: string) =>
    Array.from(authorName.trim())[0]?.toUpperCase() || '拍';

const isNavigableAuthorId = (authorId: string) =>
    /^[A-Za-z0-9_-]{1,128}$/.test(authorId);

const MOCK_QUESTION: Question = {
    id: 'qa1',
    title: '预算1万5，想入手一台拍人像为主的相机，有什么推荐？',
    description: '主要拍人像，偶尔拍拍风景，不怎么拍视频。希望对焦快，直出肤色好看。',
    budget: '1万-2万',
    useCase: '人像摄影',
    authorId: 'user1',
    authorName: '摄影小白',
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
        upvotes: 23,
        isAccepted: true,
    },
    {
        id: 'a2',
        questionId: 'qa1',
        answerText: 'Canon R6 Mark II 也很好，直出肤色是业界标杆，拍人像非常省心。就是价格可能稍微超预算一点点。',
        authorId: 'user11',
        authorName: 'Canon粉',
        upvotes: 12,
        isAccepted: false,
    },
    {
        id: 'a3',
        questionId: 'qa1',
        answerText: '如果不介意aps-c画幅，富士X-T5也是很好的选择。胶片模拟拍人像很有味道，而且性价比很高。',
        authorId: 'user12',
        authorName: '富士用户',
        upvotes: 8,
        isAccepted: false,
    },
];

export default function QuestionDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { user } = useAuth();
    const [question, setQuestion] = useState<Question | null>(null);
    const [answers, setAnswers] = useState<Answer[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCuratedExample, setIsCuratedExample] = useState(false);
    const [answerText, setAnswerText] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const openAnswerAuthor = (answer: Answer) => {
        if (isCuratedExample || !isNavigableAuthorId(answer.authorId)) return;
        router.push({
            pathname: '/user/[id]' as never,
            params: { id: answer.authorId, name: answer.authorName },
        });
    };

    useEffect(() => {
        let unsubscribeAnswers: (() => void) | undefined;
        let active = true;
        async function fetchData() {
            if (!id) {
                if (active) setLoading(false);
                return;
            }

            try {
                const docRef = doc(db, 'questions', id);
                const docSnap = await getDoc(docRef);
                if (!active) return;

                if (docSnap.exists()) {
                    setIsCuratedExample(false);
                    setQuestion(normalizeQuestion(docSnap.id, docSnap.data()));
                    const answersQuery = query(
                        collection(db, 'questions', id, 'answers'),
                        orderBy('createdAt', 'asc'),
                    );
                    const unsubscribe = onSnapshot(answersQuery, (snapshot) => {
                        if (!active) return;
                        setAnswers(snapshot.docs.map((answerDoc) =>
                            normalizeAnswer(answerDoc.id, id, answerDoc.data()),
                        ));
                    });
                    if (!active) {
                        unsubscribe();
                        return;
                    }
                    unsubscribeAnswers = unsubscribe;
                } else {
                    setIsCuratedExample(true);
                    setQuestion(MOCK_QUESTION);
                    setAnswers(MOCK_ANSWERS);
                }
            } catch {
                if (!active) return;
                setIsCuratedExample(true);
                setQuestion(MOCK_QUESTION);
                setAnswers(MOCK_ANSWERS);
            } finally {
                if (active) setLoading(false);
            }
        }

        void fetchData();
        return () => {
            active = false;
            unsubscribeAnswers?.();
        };
    }, [id]);

    const handleSubmitAnswer = async () => {
        if (!answerText.trim() || !id || submitting) return;
        if (!user) {
            router.push({ pathname: '/auth' as never, params: { returnTo: `/question/${id}` } });
            return;
        }

        setSubmitting(true);
        try {
            const questionRef = doc(db, 'questions', id);
            const answerRef = doc(collection(db, 'questions', id, 'answers'));
            await runTransaction(db, async (transaction) => {
                const questionSnapshot = await transaction.get(questionRef);
                if (!questionSnapshot.exists()) throw new Error('question-not-found');
                transaction.set(answerRef, {
                    questionId: id,
                    answerText: answerText.trim(),
                    authorId: user.uid,
                    authorName: getSafeAuthorName(user.displayName),
                    authorAvatar: '',
                    createdAt: serverTimestamp(),
                    upvotes: 0,
                    isAccepted: false,
                });
                transaction.update(questionRef, {
                    answersCount: increment(1),
                    lastAnswerId: answerRef.id,
                });
            });
            setAnswerText('');
        } catch {
            Alert.alert('发送失败', '请检查网络后重试。');
        } finally {
            setSubmitting(false);
        }
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
                        <TouchableOpacity
                            style={styles.answerHeader}
                            activeOpacity={0.72}
                            disabled={isCuratedExample || !isNavigableAuthorId(answer.authorId)}
                            onPress={() => openAnswerAuthor(answer)}
                            accessibilityRole={
                                !isCuratedExample && isNavigableAuthorId(answer.authorId)
                                    ? 'button'
                                    : undefined
                            }
                            accessibilityLabel={
                                !isCuratedExample && isNavigableAuthorId(answer.authorId)
                                    ? `查看${answer.authorName}的作品`
                                    : undefined
                            }
                        >
                            <View style={styles.answerAvatar}>
                                <Text style={styles.answerAvatarText}>
                                    {getAuthorInitial(answer.authorName)}
                                </Text>
                            </View>
                            <Text style={styles.answerAuthor}>{answer.authorName}</Text>
                            {!isCuratedExample && isNavigableAuthorId(answer.authorId) ? (
                                <Text style={styles.answerWorksLink}>看作品 ›</Text>
                            ) : null}
                        </TouchableOpacity>
                        <Text style={styles.answerText}>{answer.answerText}</Text>
                        <View style={styles.upvoteBtn}>
                            <Text style={styles.upvoteText}>↑ {answer.upvotes}</Text>
                        </View>
                    </View>
                ))}
            </ScrollView>

            {/* Answer Input */}
            <View style={[styles.inputContainer, { paddingBottom: insets.bottom + 20 }]}>
                {isCuratedExample ? (
                    <TouchableOpacity
                        style={styles.curatedButton}
                        onPress={() => router.push('/ask-question')}
                    >
                        <Text style={styles.curatedButtonText}>这是精选示例，去发布一个真实问题</Text>
                    </TouchableOpacity>
                ) : (
                    <>
                        <TextInput
                            style={styles.input}
                            placeholder="写下你的回答..."
                            placeholderTextColor="#86868B"
                            multiline
                            maxLength={2000}
                            value={answerText}
                            onChangeText={setAnswerText}
                        />
                        <TouchableOpacity
                            style={[styles.submitBtn, !answerText.trim() && styles.submitBtnDisabled]}
                            onPress={handleSubmitAnswer}
                            disabled={!answerText.trim() || submitting}
                        >
                            <Text style={styles.submitBtnText}>{submitting ? '发送中' : '发送'}</Text>
                        </TouchableOpacity>
                    </>
                )}
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
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#D85331',
    },
    answerAvatarText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '800',
    },
    answerAuthor: {
        flex: 1,
        fontSize: 14,
        fontWeight: '600',
        color: '#1D1D1F',
        marginLeft: 10,
    },
    answerWorksLink: {
        marginLeft: 10,
        color: '#C64C2F',
        fontSize: 12,
        fontWeight: '800',
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
    curatedButton: {
        flex: 1,
        minHeight: 48,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
        borderRadius: 12,
        backgroundColor: '#FFF0E9',
    },
    curatedButtonText: {
        color: '#C64C2F',
        fontSize: 13,
        fontWeight: '800',
        textAlign: 'center',
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

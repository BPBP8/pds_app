import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

const BUDGET_OPTIONS = ['5千以内', '5千-1万', '1万-2万', '2万以上', '不限预算'];
const USE_CASE_OPTIONS = ['人像摄影', '风光摄影', '街头摄影', '建筑摄影', '纪实摄影', '视频拍摄', '综合使用'];

export default function AskQuestionScreen() {
    const router = useRouter();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [budget, setBudget] = useState('');
    const [useCase, setUseCase] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!title.trim()) {
            Alert.alert('提示', '请输入问题标题');
            return;
        }
        if (!description.trim()) {
            Alert.alert('提示', '请输入问题描述');
            return;
        }

        setIsSubmitting(true);

        // In real app, this would save to Firestore
        setTimeout(() => {
            setIsSubmitting(false);
            Alert.alert('成功', '问题已发布', [
                { text: '确定', onPress: () => router.back() }
            ]);
        }, 1000);
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Text style={styles.cancelBtn}>取消</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>发布问题</Text>
                <TouchableOpacity
                    onPress={handleSubmit}
                    disabled={isSubmitting}
                >
                    <Text style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}>
                        {isSubmitting ? '发布中...' : '发布'}
                    </Text>
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
                {/* Title */}
                <View style={styles.section}>
                    <Text style={styles.label}>问题标题 *</Text>
                    <TextInput
                        style={styles.titleInput}
                        placeholder="例如：预算1万5，想入手一台拍人像为主的相机，有什么推荐？"
                        placeholderTextColor="#A0A0A5"
                        multiline
                        value={title}
                        onChangeText={setTitle}
                    />
                </View>

                {/* Description */}
                <View style={styles.section}>
                    <Text style={styles.label}>详细描述 *</Text>
                    <TextInput
                        style={styles.descInput}
                        placeholder="描述你的需求：主要拍什么？预算多少？有没有特别偏好？"
                        placeholderTextColor="#A0A0A5"
                        multiline
                        numberOfLines={6}
                        value={description}
                        onChangeText={setDescription}
                    />
                </View>

                {/* Budget */}
                <View style={styles.section}>
                    <Text style={styles.label}>预算范围</Text>
                    <View style={styles.optionsRow}>
                        {BUDGET_OPTIONS.map((option) => (
                            <TouchableOpacity
                                key={option}
                                style={[styles.optionChip, budget === option && styles.optionChipActive]}
                                onPress={() => setBudget(budget === option ? '' : option)}
                            >
                                <Text style={[styles.optionText, budget === option && styles.optionTextActive]}>
                                    {option}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Use Case */}
                <View style={styles.section}>
                    <Text style={styles.label}>主要用途</Text>
                    <View style={styles.optionsRow}>
                        {USE_CASE_OPTIONS.map((option) => (
                            <TouchableOpacity
                                key={option}
                                style={[styles.optionChip, useCase === option && styles.optionChipActive]}
                                onPress={() => setUseCase(useCase === option ? '' : option)}
                            >
                                <Text style={[styles.optionText, useCase === option && styles.optionTextActive]}>
                                    {option}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Tips */}
                <View style={styles.tipsSection}>
                    <Text style={styles.tipsTitle}>提问小贴士</Text>
                    <Text style={styles.tipsText}>• 具体的问题能得到更准确的回答</Text>
                    <Text style={styles.tipsText}>• 说明你的预算和使用场景</Text>
                    <Text style={styles.tipsText}>• 可以提及你考虑过的机型</Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F5',
    },
    cancelBtn: {
        fontSize: 16,
        color: '#636366',
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#1D1D1F',
    },
    submitBtn: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FF2D55',
    },
    submitBtnDisabled: {
        color: '#C0C0C5',
    },
    form: {
        flex: 1,
        padding: 20,
    },
    section: {
        marginBottom: 28,
    },
    label: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1D1D1F',
        marginBottom: 12,
    },
    titleInput: {
        backgroundColor: '#F8F8F8',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: '#1D1D1F',
        minHeight: 50,
    },
    descInput: {
        backgroundColor: '#F8F8F8',
        borderRadius: 12,
        padding: 16,
        fontSize: 15,
        color: '#1D1D1F',
        minHeight: 120,
        textAlignVertical: 'top',
    },
    optionsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    optionChip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: '#F0F0F5',
        marginRight: 10,
        marginBottom: 10,
    },
    optionChipActive: {
        backgroundColor: '#FF2D55',
    },
    optionText: {
        fontSize: 14,
        color: '#636366',
        fontWeight: '600',
    },
    optionTextActive: {
        color: '#FFFFFF',
    },
    tipsSection: {
        backgroundColor: '#FFF9E6',
        borderRadius: 12,
        padding: 16,
        marginTop: 20,
        marginBottom: 40,
    },
    tipsTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#996600',
        marginBottom: 8,
    },
    tipsText: {
        fontSize: 13,
        color: '#996600',
        lineHeight: 22,
    },
});

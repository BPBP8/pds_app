import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, Alert, Image, Dimensions, FlatList, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db, storage, auth } from '../../src/config/firebase';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ProfileScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const [uploading, setUploading] = useState(false);
    const [posts, setPosts] = useState<any[]>([]);

    useEffect(() => {
        const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedPosts: any[] = [];
            snapshot.forEach(doc => {
                fetchedPosts.push({ id: doc.id, ...doc.data() });
            });
            setPosts(fetchedPosts);
        });
        return () => unsubscribe();
    }, []);

    // MOCK DATA FALLBACK FOR GRID
    const displayPosts = posts.length > 0 ? posts : [
        { id: '1', imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400' },
        { id: '2', imageUrl: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=400' },
        { id: '3', imageUrl: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=400' },
        { id: '4', imageUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=400' },
        { id: '5', imageUrl: 'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=400' },
    ];

    const renderHeader = () => (
        <View style={styles.headerContainer}>
            <View style={styles.profileHeader}>
                <View style={styles.avatarContainer}>
                    <Image source={{ uri: 'https://i.pravatar.cc/150?img=47' }} style={styles.avatar} />
                    <View style={styles.onlineDot} />
                </View>
                <View style={styles.statsContainer}>
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>{displayPosts.length}</Text>
                        <Text style={styles.statLabel}>作品</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>12.4k</Text>
                        <Text style={styles.statLabel}>获赞</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>892</Text>
                        <Text style={styles.statLabel}>关注</Text>
                    </View>
                </View>
            </View>

            <View style={styles.bioContainer}>
                <Text style={styles.username}>光影捕手</Text>
                <Text style={styles.bioText}>独立摄影师 / 极简主义爱好者 ✨</Text>
                <Text style={styles.bioTextLink}>www.photography.art</Text>
            </View>

            <View style={styles.actionButtons}>
                <TouchableOpacity style={styles.editButton}>
                    <Text style={styles.editButtonText}>编辑资料</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={styles.shareButton} 
                    onPress={() => router.push('/modal')}
                >
                    <IconSymbol name="camera.fill" size={16} color="#FFF" />
                    <Text style={styles.shareButtonText}>发布作品</Text>
                </TouchableOpacity>
            </View>

            {/* Grid Tabs */}
            <View style={styles.gridTabs}>
                <View style={[styles.gridTab, styles.gridTabActive]}>
                    <IconSymbol name="square.grid.2x2.fill" size={24} color="#1D1D1F" />
                </View>
                <View style={styles.gridTab}>
                    <IconSymbol name="heart.fill" size={24} color="#666" />
                </View>
                <View style={styles.gridTab}>
                    <IconSymbol name="bookmark.fill" size={24} color="#666" />
                </View>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
                <IconSymbol name="lock.fill" size={16} color="#1D1D1F" />
                <Text style={styles.topBarTitle}>光影捕手</Text>
                <IconSymbol name="line.3.horizontal" size={24} color="#1D1D1F" />
            </View>
            
            <FlatList
                data={displayPosts}
                keyExtractor={(item, index) => item.id || index.toString()}
                numColumns={3}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={renderHeader}
                renderItem={({ item }) => (
                    <View style={styles.imageGridItem}>
                        <Image source={{ uri: item.imageUrl }} style={styles.gridImage} />
                    </View>
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 15,
        backgroundColor: '#FFFFFF',
    },
    topBarTitle: {
        color: '#1D1D1F',
        fontSize: 18,
        fontWeight: 'bold',
    },
    headerContainer: {
        paddingHorizontal: 20,
        paddingTop: 10,
    },
    profileHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    avatarContainer: {
        position: 'relative',
        padding: 3,
        borderRadius: 48,
        borderWidth: 1,
        borderColor: '#F2F2F2',
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
    },
    onlineDot: {
        position: 'absolute',
        bottom: 5,
        right: 5,
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: '#34C759',
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    statsContainer: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginLeft: 20,
    },
    statItem: {
        alignItems: 'center',
    },
    statNumber: {
        color: '#1D1D1F',
        fontSize: 18,
        fontWeight: 'bold',
    },
    statLabel: {
        color: '#86868B',
        fontSize: 12,
        marginTop: 4,
    },
    bioContainer: {
        marginTop: 15,
    },
    username: {
        color: '#1D1D1F',
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    bioText: {
        color: '#3A3A3C',
        fontSize: 14,
        lineHeight: 20,
    },
    bioTextLink: {
        color: '#0066CC',
        fontSize: 14,
        marginTop: 2,
    },
    actionButtons: {
        flexDirection: 'row',
        marginTop: 20,
        justifyContent: 'space-between',
    },
    editButton: {
        flex: 1,
        backgroundColor: '#F5F5F7',
        paddingVertical: 10,
        borderRadius: 10,
        alignItems: 'center',
        marginRight: 10,
    },
    editButtonText: {
        color: '#1D1D1F',
        fontWeight: 'bold',
        fontSize: 14,
    },
    shareButton: {
        flex: 1,
        backgroundColor: '#1D1D1F',
        flexDirection: 'row',
        paddingVertical: 10,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    shareButtonText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: 14,
        marginLeft: 6,
    },
    gridTabs: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: 30,
        borderTopWidth: 1,
        borderTopColor: '#F2F2F2',
    },
    gridTab: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 15,
    },
    gridTabActive: {
        borderBottomWidth: 2,
        borderBottomColor: '#1D1D1F',
    },
    imageGridItem: {
        flex: 1 / 3,
        aspectRatio: 1,
        padding: 1,
    },
    gridImage: {
        width: '100%',
        height: '100%',
        backgroundColor: '#F5F5F7',
    }
});

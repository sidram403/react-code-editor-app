import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet,
    ScrollView, Alert, StatusBar, SafeAreaView,
    Animated, Dimensions,
} from 'react-native';
import { loadProjects, deleteProject } from '../utils/storage';
import { DEFAULT_FILES } from '../templates/reactTemplate';

const { width } = Dimensions.get('window');

export default function HomeScreen({ navigation }) {
    const [projects, setProjects] = useState([]);
    const fadeAnim = useRef(new Animated.Value(0)).current;

    const fetchProjects = useCallback(async () => {
        const data = await loadProjects();
        setProjects(data);
    }, []);

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1, duration: 400, useNativeDriver: true,
        }).start();
        const unsub = navigation.addListener('focus', fetchProjects);
        return unsub;
    }, [navigation, fetchProjects]);

    const handleNew = () => {
        navigation.navigate('Editor', {
            project: {
                id: `project_${Date.now()}`,
                name: `Project ${projects.length + 1}`,
                files: { ...DEFAULT_FILES },
            },
        });
    };

    const handleOpen = (p) => navigation.navigate('Editor', { project: p });

    const handleDelete = (p) => {
        Alert.alert('Delete', `Delete "${p.name}"?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive',
                onPress: async () => { await deleteProject(p.id); fetchProjects(); }
            },
        ]);
    };

    const fmt = (ts) => {
        if (!ts) return '';
        const d = new Date(ts);
        const now = new Date();
        const diff = (now - d) / 1000;
        if (diff < 60) return 'Just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    return (
        <SafeAreaView style={s.safe}>
            <StatusBar barStyle="light-content" backgroundColor="#0d1117" />

            <Animated.ScrollView
                style={{ flex: 1, opacity: fadeAnim }}
                contentContainerStyle={s.scroll}
                showsVerticalScrollIndicator={false}
            >
                {/* ── Top Brand Bar ── */}
                <View style={s.topBar}>
                    <View style={s.logoWrap}>
                        <Text style={s.logoIcon}>⚛</Text>
                    </View>
                    <View style={s.topBarText}>
                        <Text style={s.appName}>ReactCode</Text>
                        <Text style={s.appTagline}>Mobile IDE · Practice React</Text>
                    </View>
                </View>

                {/* ── Quick Start Card ── */}
                <TouchableOpacity style={s.heroCard} onPress={handleNew} activeOpacity={0.88}>
                    <View style={s.heroCardLeft}>
                        <View style={s.heroIconWrap}>
                            <Text style={s.heroIcon}>✦</Text>
                        </View>
                        <View>
                            <Text style={s.heroCardTitle}>New Project</Text>
                            <Text style={s.heroCardSub}>React · JSX · CSS template</Text>
                        </View>
                    </View>
                    <Text style={s.heroCardArrow}>›</Text>
                </TouchableOpacity>

                {/* ── Feature Chips ── */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false}
                    style={s.chipsRow} contentContainerStyle={s.chipsContent}>
                    {[
                        ['✏️', 'Syntax Highlight'],
                        ['⚡', 'Babel Compile'],
                        ['👁', 'Live Preview'],
                        ['💾', 'Auto Save'],
                        ['🎨', 'CSS Support'],
                    ].map(([icon, txt]) => (
                        <View key={txt} style={s.chip}>
                            <Text style={s.chipIcon}>{icon}</Text>
                            <Text style={s.chipText}>{txt}</Text>
                        </View>
                    ))}
                </ScrollView>

                {/* ── Recent projects ── */}
                <View style={s.section}>
                    <View style={s.sectionHead}>
                        <Text style={s.sectionTitle}>Recent Projects</Text>
                        {projects.length > 0 && (
                            <View style={s.badge}>
                                <Text style={s.badgeTxt}>{projects.length}</Text>
                            </View>
                        )}
                    </View>

                    {projects.length === 0 ? (
                        <View style={s.empty}>
                            <Text style={s.emptyIcon}>📂</Text>
                            <Text style={s.emptyTitle}>No projects yet</Text>
                            <Text style={s.emptySub}>Tap "New Project" to get started</Text>
                        </View>
                    ) : (
                        projects.map((item) => (
                            <View
                                key={item.id}
                                style={s.projCard}
                            >
                                <View style={s.projLeft}>
                                    <View style={s.projDot} />
                                    <View style={s.projIcon}>
                                        <Text style={s.projIconTxt}>⚛</Text>
                                    </View>
                                    <View style={s.projInfo}>
                                        <Text style={s.projName} numberOfLines={1}>{item.name}</Text>
                                        <Text style={s.projTime}>
                                            🕐 {fmt(item.updatedAt || item.createdAt) || 'Edited recently'}
                                        </Text>
                                    </View>
                                </View>
                                <View style={s.projRight}>
                                    <TouchableOpacity
                                        style={s.openBtn}
                                        onPress={() => handleOpen(item)}
                                    >
                                        <Text style={s.openBtnTxt}>Open</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={s.delBtn}
                                        onPress={() => handleDelete(item)}
                                    >
                                        <Text style={s.delTxt}>🗑</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))
                    )}
                </View>

                {/* bottom padding so content clears the FAB */}
                <View style={{ height: 96 }} />
            </Animated.ScrollView>

            {/* ── Floating Action Button ── */}
            <View style={s.fabWrap}>
                <TouchableOpacity style={s.fab} onPress={handleNew} activeOpacity={0.88}>
                    <Text style={s.fabPlus}>+</Text>
                    <Text style={s.fabTxt}>New Project</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#0d1117' },
    scroll: { paddingBottom: 20 },

    // ── Top bar ──
    topBar: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, gap: 14,
    },
    logoWrap: {
        width: 48, height: 48, borderRadius: 14,
        backgroundColor: '#0d419d',
        alignItems: 'center', justifyContent: 'center',
        shadowColor: '#388bfd', shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6, shadowRadius: 12, elevation: 6,
    },
    logoIcon: { fontSize: 26 },
    appName: { fontSize: 22, fontWeight: '800', color: '#e6edf3' },
    appTagline: { fontSize: 11, color: '#8b949e', marginTop: 1 },

    // ── Hero card ──
    heroCard: {
        marginHorizontal: 16, marginBottom: 16,
        backgroundColor: '#161b22',
        borderRadius: 16, padding: 18,
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1, borderColor: '#238636',
        shadowColor: '#2ea043', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25, shadowRadius: 10, elevation: 5,
    },
    heroCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    heroIconWrap: {
        width: 44, height: 44, borderRadius: 12,
        backgroundColor: '#238636',
        alignItems: 'center', justifyContent: 'center',
    },
    heroIcon: { fontSize: 22, color: '#fff' },
    heroCardTitle: { fontSize: 16, fontWeight: '700', color: '#e6edf3' },
    heroCardSub: { fontSize: 12, color: '#7ee787', marginTop: 2 },
    heroCardArrow: { fontSize: 26, color: '#238636', fontWeight: '300' },

    // ── Feature chips ──
    chipsRow: { marginBottom: 24 },
    chipsContent: { paddingHorizontal: 16, gap: 8 },
    chip: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: '#161b22',
        borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7,
        borderWidth: 1, borderColor: '#21262d',
    },
    chipIcon: { fontSize: 14 },
    chipText: { fontSize: 12, color: '#8b949e', fontWeight: '500' },

    // ── Section ──
    section: { paddingHorizontal: 16 },
    sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    sectionTitle: { fontSize: 14, fontWeight: '700', color: '#8b949e', letterSpacing: 0.8 },
    badge: {
        backgroundColor: '#21262d', borderRadius: 10,
        paddingHorizontal: 8, paddingVertical: 2,
        borderWidth: 1, borderColor: '#30363d',
    },
    badgeTxt: { fontSize: 11, color: '#58a6ff', fontWeight: '700' },

    // ── Project card ──
    projCard: {
        backgroundColor: '#161b22',
        borderRadius: 14, marginBottom: 8,
        paddingVertical: 14, paddingHorizontal: 14,
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1, borderColor: '#21262d',
    },
    projLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
    projDot: {
        width: 3, height: '100%', position: 'absolute', left: 0,
        borderRadius: 2, backgroundColor: '#388bfd',
    },
    projIcon: {
        width: 40, height: 40, borderRadius: 12,
        backgroundColor: '#0d419d',
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1.5, borderColor: '#388bfd',
        shadowColor: '#388bfd', shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4, shadowRadius: 6, elevation: 4,
    },
    projIconTxt: { fontSize: 20 },
    projInfo: { flex: 1 },
    projName: { fontSize: 14, fontWeight: '600', color: '#e6edf3' },
    projTime: { fontSize: 11, color: '#8b949e', marginTop: 3 },
    projRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    openBtn: {
        backgroundColor: '#238636',
        paddingHorizontal: 14, paddingVertical: 7,
        borderRadius: 8, borderWidth: 1, borderColor: '#2ea043',
    },
    openBtnTxt: { color: '#fff', fontSize: 12, fontWeight: '700' },
    delBtn: {
        backgroundColor: '#21262d',
        paddingHorizontal: 10, paddingVertical: 7,
        borderRadius: 8, borderWidth: 1, borderColor: '#f8514940',
    },
    delTxt: { color: '#f85149', fontSize: 14 },

    // ── Empty ──
    empty: {
        alignItems: 'center', paddingVertical: 48,
        borderWidth: 1, borderColor: '#21262d',
        borderRadius: 16, borderStyle: 'dashed',
    },
    emptyIcon: { fontSize: 40, marginBottom: 12, opacity: 0.5 },
    emptyTitle: { fontSize: 15, fontWeight: '600', color: '#30363d', marginBottom: 6 },
    emptySub: { fontSize: 13, color: '#484f58' },

    // ── FAB ──
    fabWrap: {
        position: 'absolute', bottom: 24, left: 16, right: 16,
    },
    fab: {
        backgroundColor: '#238636',
        borderRadius: 16, paddingVertical: 16,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
        shadowColor: '#2ea043', shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.45, shadowRadius: 16, elevation: 8,
        borderWidth: 1, borderColor: '#2ea043',
    },
    fabPlus: { fontSize: 22, color: '#fff', fontWeight: '300', lineHeight: 26 },
    fabTxt: { fontSize: 16, fontWeight: '700', color: '#fff', letterSpacing: 0.3 },
});

import React, { useRef, useCallback, useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView,
    TouchableOpacity, Animated, Dimensions, Platform,
} from 'react-native';

const { height: SCREEN_H } = Dimensions.get('window');
const PANEL_HEIGHT = Math.floor(SCREEN_H * 0.48);

const LOG_COLORS = {
    log: '#c9d1d9',
    info: '#58a6ff',
    warn: '#d29922',
    error: '#f85149',
};

const MONO = Platform.OS === 'ios' ? 'Courier New' : 'monospace';

export default function ConsolePanel({ logs = [], onClear }) {
    const [open, setOpen] = useState(false);
    const animH = useRef(new Animated.Value(0)).current;

    const toggle = useCallback(() => {
        const toVal = open ? 0 : PANEL_HEIGHT;
        Animated.spring(animH, {
            toValue: toVal, tension: 70, friction: 12, useNativeDriver: false,
        }).start();
        setOpen((v) => !v);
    }, [open, animH]);

    const errorCount = logs.filter((l) => l.type === 'error').length;
    const warnCount = logs.filter((l) => l.type === 'warn').length;

    return (
        <View style={styles.wrapper}>
            {/* ── Console Tab Bar ── */}
            <TouchableOpacity style={styles.tabBar} onPress={toggle} activeOpacity={0.8}>
                <View style={styles.tabLeft}>
                    <Text style={styles.tabIcon}>⬛</Text>
                    <Text style={styles.tabLabel}>Console</Text>

                    {errorCount > 0 && (
                        <View style={[styles.pill, styles.errPill]}>
                            <Text style={[styles.pillTxt, { color: '#f85149' }]}>{errorCount} error{errorCount > 1 ? 's' : ''}</Text>
                        </View>
                    )}
                    {warnCount > 0 && (
                        <View style={[styles.pill, styles.warnPill]}>
                            <Text style={[styles.pillTxt, { color: '#d29922' }]}>{warnCount} warn{warnCount > 1 ? 's' : ''}</Text>
                        </View>
                    )}
                    {logs.length > 0 && errorCount === 0 && warnCount === 0 && (
                        <View style={[styles.pill, styles.logPill]}>
                            <Text style={[styles.pillTxt, { color: '#8b949e' }]}>{logs.length} log{logs.length > 1 ? 's' : ''}</Text>
                        </View>
                    )}
                </View>

                <View style={styles.tabRight}>
                    {logs.length > 0 && (
                        <TouchableOpacity
                            onPress={(e) => { e.stopPropagation?.(); onClear?.(); }}
                            style={styles.clearBtn}
                        >
                            <Text style={styles.clearTxt}>Clear</Text>
                        </TouchableOpacity>
                    )}
                    <Text style={styles.chevron}>{open ? '▾' : '▴'}</Text>
                </View>
            </TouchableOpacity>

            {/* ── Sliding log panel ── */}
            <Animated.View style={[styles.panel, { height: animH }]}>
                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator
                    indicatorStyle="white"
                >
                    {logs.length === 0 ? (
                        <View style={styles.empty}>
                            <Text style={styles.emptyTxt}>No output yet.{'\n'}Press ▶ Run to execute your code.</Text>
                        </View>
                    ) : (
                        logs.map((entry, i) => (
                            <View key={i} style={[styles.logRow, i % 2 === 1 && styles.logRowAlt]}>
                                <Text style={styles.logIndex}>{i + 1}</Text>
                                <Text style={[styles.logBadge, { color: LOG_COLORS[entry.type] || '#c9d1d9' }]}>
                                    {entry.type.toUpperCase()}
                                </Text>
                                <Text
                                    style={[styles.logMsg, { color: LOG_COLORS[entry.type] || '#c9d1d9' }]}
                                    selectable
                                >
                                    {entry.message}
                                </Text>
                            </View>
                        ))
                    )}
                </ScrollView>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        backgroundColor: '#0d1117',
        borderTopWidth: 1,
        borderTopColor: '#21262d',
    },

    tabBar: {
        height: 38,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        backgroundColor: '#010409',
        borderTopWidth: 1,
        borderTopColor: '#21262d',
    },
    tabLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    tabRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    tabIcon: { fontSize: 10, color: '#58a6ff' },
    tabLabel: { fontSize: 12, fontWeight: '700', color: '#8b949e', letterSpacing: 0.5 },
    chevron: { fontSize: 12, color: '#484f58' },

    pill: { borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
    pillTxt: { fontSize: 10, fontWeight: '700' },
    errPill: { backgroundColor: '#3d1a1a' },
    warnPill: { backgroundColor: '#2d2100' },
    logPill: { backgroundColor: '#161b22' },

    clearBtn: {
        paddingHorizontal: 8, paddingVertical: 3,
        borderRadius: 5, backgroundColor: '#21262d',
        borderWidth: 1, borderColor: '#30363d',
    },
    clearTxt: { fontSize: 11, color: '#8b949e' },

    panel: { backgroundColor: '#0d1117', overflow: 'hidden' },
    scroll: { flex: 1 },
    scrollContent: { paddingBottom: 8 },

    logRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: 5,
        paddingHorizontal: 10,
        gap: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#161b22',
    },
    logRowAlt: { backgroundColor: '#010409' },

    logIndex: {
        fontSize: 10,
        color: '#484f58',
        minWidth: 18,
        textAlign: 'right',
        marginTop: 2,
        fontFamily: MONO,
    },
    logBadge: {
        fontSize: 9,
        fontWeight: '700',
        letterSpacing: 0.5,
        marginTop: 3,
        minWidth: 32,
    },
    logMsg: {
        flex: 1,
        fontSize: 12,
        fontFamily: MONO,
        lineHeight: 18,
    },

    empty: { padding: 20, alignItems: 'center' },
    emptyTxt: { color: '#484f58', fontSize: 12, textAlign: 'center', lineHeight: 18 },
});

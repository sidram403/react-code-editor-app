import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { FILE_ORDER } from '../templates/reactTemplate';

const FILE_ICONS = {
    'App.js': '⚛',
    'App.css': '🎨',
    'index.js': '📦',
    'package.json': '📋',
};

export default function FileExplorer({ files, activeFile, onSelectFile }) {
    const fileList = FILE_ORDER.filter((f) => files[f] !== undefined);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerIcon}>📁</Text>
                <Text style={styles.headerText}>FILES</Text>
            </View>

            <ScrollView style={styles.list}>
                {fileList.map((filename) => {
                    const isActive = filename === activeFile;
                    return (
                        <TouchableOpacity
                            key={filename}
                            style={[styles.fileItem, isActive && styles.fileItemActive]}
                            onPress={() => onSelectFile(filename)}
                            activeOpacity={0.7}
                        >
                            {isActive && <View style={styles.activeBar} />}
                            <Text style={styles.fileIcon}>{FILE_ICONS[filename] || '📄'}</Text>
                            <Text style={[styles.fileName, isActive && styles.fileNameActive]} numberOfLines={1}>
                                {filename}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>

            <View style={styles.footer}>
                <Text style={styles.footerText}>Tap a file to edit</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: 130,
        backgroundColor: '#010409',
        borderRightWidth: 1,
        borderRightColor: '#21262d',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#21262d',
        gap: 5,
    },
    headerIcon: { fontSize: 11 },
    headerText: { fontSize: 9, fontWeight: '700', color: '#8b949e', letterSpacing: 1.2 },
    list: { flex: 1 },
    fileItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 10,
        gap: 7,
        position: 'relative',
    },
    fileItemActive: { backgroundColor: '#161b22' },
    activeBar: {
        position: 'absolute',
        left: 0, top: 0, bottom: 0,
        width: 2,
        backgroundColor: '#58a6ff',
        borderRadius: 1,
    },
    fileIcon: { fontSize: 13 },
    fileName: { fontSize: 11, color: '#8b949e', flex: 1 },
    fileNameActive: { color: '#e6edf3', fontWeight: '600' },
    footer: {
        padding: 10,
        borderTopWidth: 1,
        borderTopColor: '#21262d',
    },
    footerText: { fontSize: 9, color: '#484f58', textAlign: 'center' },
});

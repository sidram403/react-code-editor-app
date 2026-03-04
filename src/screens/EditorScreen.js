import React, { useState, useRef, useCallback, useLayoutEffect } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet,
    Alert, StatusBar, TextInput, Modal, SafeAreaView,
} from 'react-native';
import CodeEditor from '../components/CodeEditor';
import PreviewWebView from '../components/PreviewWebView';
import FileExplorer from '../components/FileExplorer';
import ConsolePanel from '../components/ConsolePanel';
import { saveProject } from '../utils/storage';

export default function EditorScreen({ route, navigation }) {
    const { project: initialProject } = route.params;

    const [project, setProject] = useState(initialProject);
    const [activeFile, setActiveFile] = useState('App.js');
    const [isSaving, setIsSaving] = useState(false);
    const [isRunning, setIsRunning] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [showRenameModal, setShowRenameModal] = useState(false);
    const [renameText, setRenameText] = useState(initialProject.name);
    const [consoleLogs, setConsoleLogs] = useState([]);
    // Track which files have unsaved changes
    const [dirtyFiles, setDirtyFiles] = useState(new Set());
    const isDirty = dirtyFiles.size > 0;

    const previewRef = useRef(null);

    useLayoutEffect(() => {
        navigation.setOptions({ headerShown: false });
    }, [navigation]);

    const handleCodeChange = useCallback((newCode) => {
        setProject((prev) => ({ ...prev, files: { ...prev.files, [activeFile]: newCode } }));
        setDirtyFiles((prev) => new Set([...prev, activeFile]));
    }, [activeFile]);

    const handleSave = useCallback(async () => {
        setIsSaving(true);
        await saveProject(project);
        setIsSaving(false);
        setDirtyFiles(new Set());   // all clean after save
    }, [project]);

    const handleRun = useCallback(async (proj) => {
        const p = proj || project;
        setIsRunning(true);
        setConsoleLogs([]);
        setDirtyFiles(new Set());   // save on run → all clean
        await saveProject(p);
        setShowPreview(true);
        setTimeout(() => {
            if (previewRef.current) previewRef.current.run(p.files);
            setIsRunning(false);
        }, 500);
    }, [project]);

    const handleConsoleMessage = useCallback((entry) => {
        setConsoleLogs((prev) => [...prev, entry]);
    }, []);

    const handleRenameSubmit = () => {
        if (renameText.trim()) setProject((prev) => ({ ...prev, name: renameText.trim() }));
        setShowRenameModal(false);
    };

    const handleBack = () => {
        Alert.alert('Go Back', 'Save before leaving?', [
            { text: 'Discard', style: 'destructive', onPress: () => navigation.goBack() },
            { text: 'Save & Leave', onPress: async () => { await saveProject(project); navigation.goBack(); } },
            { text: 'Cancel', style: 'cancel' },
        ]);
    };

    return (
        <SafeAreaView style={styles.root}>
            <StatusBar barStyle="light-content" backgroundColor="#010409" />

            {/* ── TOOLBAR ── */}
            <View style={styles.toolbar}>
                <View style={styles.toolbarLeft}>
                    <TouchableOpacity style={styles.iconBtn} onPress={handleBack}>
                        <Text style={styles.iconBtnText}>‹</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.iconBtn, sidebarOpen && styles.iconBtnActive]}
                        onPress={() => setSidebarOpen((v) => !v)}
                    >
                        <Text style={styles.iconBtnText}>☰</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => { setRenameText(project.name); setShowRenameModal(true); }}>
                        <Text style={styles.projectName} numberOfLines={1}>{project.name} ✎</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.toggle}>
                    <TouchableOpacity
                        style={[styles.toggleBtn, !showPreview && styles.toggleBtnOn]}
                        onPress={() => setShowPreview(false)}
                    >
                        <Text style={[styles.toggleText, !showPreview && styles.toggleTextOn]}>✏ Code</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.toggleBtn, showPreview && styles.toggleBtnOn]}
                        onPress={() => setShowPreview(true)}
                    >
                        <Text style={[styles.toggleText, showPreview && styles.toggleTextOn]}>👁 Preview</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.toolbarRight}>
                    {isDirty ? (
                        // Show SAVE when any file is unsaved
                        <TouchableOpacity
                            style={[styles.saveBtn, isSaving && styles.btnDim]}
                            onPress={handleSave}
                            disabled={isSaving}
                        >
                            <Text style={styles.saveTxt}>{isSaving ? '…' : '💾 Save'}</Text>
                        </TouchableOpacity>
                    ) : (
                        // Show RUN when everything is saved
                        <TouchableOpacity
                            style={[styles.runBtn, isRunning && styles.btnDim]}
                            onPress={() => handleRun(project)}
                            disabled={isRunning}
                        >
                            <Text style={styles.runTxt}>{isRunning ? '⏳' : '▶'}</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* ── MAIN CONTENT ── */}
            <View style={styles.body}>
                {sidebarOpen && (
                    <FileExplorer
                        files={project.files}
                        activeFile={activeFile}
                        onSelectFile={(f) => { setActiveFile(f); setShowPreview(false); }}
                    />
                )}

                {/* Editor panel */}
                <View style={[styles.panel, showPreview && styles.hidden]}>
                    <View style={styles.tabBar}>
                        <View style={styles.tab}>
                            {/* 🟢 green = unmodified/clean  🔴 red = modified/unsaved */}
                            <Text style={[
                                styles.tabDot,
                                { color: dirtyFiles.has(activeFile) ? '#f85149' : '#3fb950' }
                            ]}>●</Text>
                            <Text style={styles.tabName}>{activeFile}</Text>
                        </View>
                    </View>
                    <CodeEditor
                        key={activeFile}
                        value={project.files[activeFile] || ''}
                        onChange={handleCodeChange}
                    />
                </View>

                {/* Preview panel — always mounted, hidden via display:none */}
                <View style={[styles.panel, !showPreview && styles.hidden]}>
                    <View style={styles.previewBar}>
                        <View style={styles.dots}>
                            <View style={[styles.dot, { backgroundColor: '#f85149' }]} />
                            <View style={[styles.dot, { backgroundColor: '#d29922' }]} />
                            <View style={[styles.dot, { backgroundColor: '#3fb950' }]} />
                        </View>
                        <Text style={styles.previewUrl}>Preview — {project.name}</Text>
                        <TouchableOpacity style={styles.rerunBtn} onPress={() => handleRun(project)}>
                            <Text style={styles.rerunTxt}>↺ Re-run</Text>
                        </TouchableOpacity>
                    </View>
                    <PreviewWebView
                        onReady={previewRef}
                        onConsoleMessage={handleConsoleMessage}
                    />
                </View>
            </View>

            {/* ── CONSOLE PANEL (always visible at bottom) ── */}
            <ConsolePanel
                logs={consoleLogs}
                onClear={() => setConsoleLogs([])}
            />

            {/* ── RENAME MODAL ── */}
            <Modal visible={showRenameModal} transparent animationType="fade"
                onRequestClose={() => setShowRenameModal(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalBox}>
                        <Text style={styles.modalTitle}>Rename Project</Text>
                        <TextInput
                            style={styles.modalInput}
                            value={renameText}
                            onChangeText={setRenameText}
                            autoFocus selectTextOnFocus
                            onSubmitEditing={handleRenameSubmit}
                            placeholderTextColor="#484f58"
                        />
                        <View style={styles.modalBtns}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowRenameModal(false)}>
                                <Text style={styles.cancelTxt}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.saveModalBtn} onPress={handleRenameSubmit}>
                                <Text style={styles.saveTxtModal}>Rename</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#0d1117' },
    hidden: { display: 'none' },

    toolbar: {
        height: 48, backgroundColor: '#010409',
        borderBottomWidth: 1, borderBottomColor: '#21262d',
        flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, gap: 6,
    },
    toolbarLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 6 },
    iconBtn: {
        width: 30, height: 30, borderRadius: 7,
        backgroundColor: '#21262d', alignItems: 'center', justifyContent: 'center',
    },
    iconBtnActive: { backgroundColor: '#0d419d' },
    iconBtnText: { color: '#c9d1d9', fontSize: 18, lineHeight: 24 },
    projectName: { color: '#8b949e', fontSize: 13, fontWeight: '500', flexShrink: 1 },

    toggle: {
        flexDirection: 'row', backgroundColor: '#0d1117',
        borderRadius: 7, borderWidth: 1, borderColor: '#21262d', overflow: 'hidden',
    },
    toggleBtn: { paddingHorizontal: 10, paddingVertical: 5 },
    toggleBtnOn: { backgroundColor: '#161b22' },
    toggleText: { color: '#484f58', fontSize: 11, fontWeight: '500' },
    toggleTextOn: { color: '#e6edf3' },

    toolbarRight: { flexDirection: 'row', gap: 5 },
    saveBtn: {
        paddingHorizontal: 14, paddingVertical: 6, borderRadius: 6,
        backgroundColor: '#9e6a03', alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: '#d29922',
    },
    saveTxt: { fontSize: 12, color: '#fff', fontWeight: '700' },
    runBtn: {
        paddingHorizontal: 14, paddingVertical: 6, borderRadius: 6, backgroundColor: '#238636',
    },
    runTxt: { color: '#fff', fontSize: 12, fontWeight: '700' },
    btnDim: { opacity: 0.5 },

    body: { flex: 1, flexDirection: 'row' },
    panel: { flex: 1, flexDirection: 'column' },

    tabBar: {
        height: 34, backgroundColor: '#0d1117',
        borderBottomWidth: 1, borderBottomColor: '#21262d',
        flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8,
    },
    tab: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        backgroundColor: '#161b22', paddingHorizontal: 10, paddingVertical: 4,
        borderRadius: 5, borderWidth: 1, borderColor: '#30363d',
    },
    tabDot: { color: '#3fb950', fontSize: 7 },
    tabName: { color: '#e6edf3', fontSize: 11, fontWeight: '500' },

    previewBar: {
        height: 34, backgroundColor: '#010409',
        borderBottomWidth: 1, borderBottomColor: '#21262d',
        flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, gap: 8,
    },
    dots: { flexDirection: 'row', gap: 5 },
    dot: { width: 9, height: 9, borderRadius: 5 },
    previewUrl: { flex: 1, color: '#484f58', fontSize: 11, textAlign: 'center' },
    rerunBtn: {
        paddingHorizontal: 9, paddingVertical: 3, borderRadius: 5,
        backgroundColor: '#21262d', borderWidth: 1, borderColor: '#30363d',
    },
    rerunTxt: { color: '#8b949e', fontSize: 11 },

    modalOverlay: { flex: 1, backgroundColor: '#00000090', alignItems: 'center', justifyContent: 'center' },
    modalBox: {
        backgroundColor: '#161b22', borderRadius: 14, padding: 22,
        width: '85%', borderWidth: 1, borderColor: '#30363d',
    },
    modalTitle: { color: '#e6edf3', fontSize: 16, fontWeight: '700', marginBottom: 14 },
    modalInput: {
        backgroundColor: '#0d1117', borderWidth: 1, borderColor: '#30363d',
        borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10,
        color: '#e6edf3', fontSize: 14, marginBottom: 14,
    },
    modalBtns: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
    cancelBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 7, backgroundColor: '#21262d' },
    cancelTxt: { color: '#8b949e', fontSize: 13 },
    saveModalBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 7, backgroundColor: '#238636' },
    saveTxtModal: { color: '#fff', fontSize: 13, fontWeight: '600' },
});

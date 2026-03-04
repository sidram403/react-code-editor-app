import React, { useState } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet,
    ScrollView, Modal, TextInput, Alert,
} from 'react-native';

// ── helpers ───────────────────────────────────────────────────────────────────

/**
 * Build a nested tree from:
 *   files   = { 'src/App.js': '...', 'index.js': '...' }
 *   folders = ['src', 'src/components']
 */
function buildTree(files, folders = []) {
    const root = { __type: 'dir', children: {} };

    function ensureDir(parts) {
        let node = root;
        parts.forEach((part) => {
            if (!node.children[part]) {
                node.children[part] = { __type: 'dir', children: {} };
            }
            node = node.children[part];
        });
        return node;
    }

    // Register explicit folder paths first
    folders.forEach((fp) => {
        const parts = fp.split('/').filter(Boolean);
        ensureDir(parts);
    });

    // Register file paths
    Object.keys(files).forEach((path) => {
        const parts = path.split('/');
        const fileName = parts.pop();
        const dirNode = ensureDir(parts);
        dirNode.children[fileName] = { __type: 'file', path };
    });

    return root;
}

/** File-type emoji */
function fileIcon(name) {
    if (name.endsWith('.js') || name.endsWith('.jsx')) return '⚛';
    if (name.endsWith('.css')) return '🎨';
    if (name.endsWith('.json')) return '📋';
    if (name.endsWith('.html')) return '🌐';
    if (name.endsWith('.ts') || name.endsWith('.tsx')) return '🔷';
    if (name.endsWith('.md')) return '📝';
    return '📄';
}

function sortKeys(children) {
    return Object.keys(children).sort((a, b) => {
        const aDir = children[a].__type === 'dir';
        const bDir = children[b].__type === 'dir';
        if (aDir !== bDir) return aDir ? -1 : 1;
        return a.localeCompare(b);
    });
}

// ── SmallBtn ─────────────────────────────────────────────────────────────────

function SmallBtn({ label, onPress }) {
    return (
        <TouchableOpacity style={styles.smallBtn} onPress={onPress} activeOpacity={0.7}>
            <Text style={styles.smallBtnText}>{label}</Text>
        </TouchableOpacity>
    );
}

// ── FileNode ─────────────────────────────────────────────────────────────────

/*
 * nodePath: the full path of this node ('' = root)
 *   - for a file node: 'src/App.js'
 *   - for a dir node:  'src'  or  'src/components'
 */
function FileNode({
    name, node, nodePath,
    activeFile, onSelectFile, depth,
    onAddFile, onAddFolder,
    onFileAction, onFolderAction,
}) {
    const [open, setOpen] = useState(true);
    const indent = depth * 11;

    // ── FILE ──────────────────────────────────────────────────────────────────
    if (node.__type === 'file') {
        const isActive = node.path === activeFile;
        return (
            <TouchableOpacity
                style={[styles.row, isActive && styles.rowActive, { paddingLeft: 12 + indent }]}
                onPress={() => onSelectFile(node.path)}
                onLongPress={() => onFileAction(node.path, name)}
                delayLongPress={400}
                activeOpacity={0.7}
            >
                {isActive && <View style={styles.activeBar} />}
                <Text style={styles.icon}>{fileIcon(name)}</Text>
                <Text style={[styles.label, isActive && styles.labelActive]} numberOfLines={1}>
                    {name}
                </Text>
            </TouchableOpacity>
        );
    }

    // ── DIRECTORY ─────────────────────────────────────────────────────────────
    const sorted = sortKeys(node.children);

    return (
        <View>
            {/* folder header row */}
            <View style={[styles.folderRow, { paddingLeft: 8 + indent }]}>
                <TouchableOpacity
                    style={styles.folderToggle}
                    onPress={() => setOpen((v) => !v)}
                    activeOpacity={0.7}
                >
                    <Text style={styles.chevron}>{open ? '▾' : '▸'}</Text>
                    <Text style={styles.folderIcon}>📁</Text>
                    <Text style={styles.folderLabel} numberOfLines={1}>{name}</Text>
                </TouchableOpacity>

                <View style={styles.folderActions}>
                    {/* Pass the string path of THIS folder to onAddFile/onAddFolder */}
                    <SmallBtn label="+" onPress={() => onAddFile(nodePath)} />
                    <SmallBtn label="📁+" onPress={() => onAddFolder(nodePath)} />
                    {/* Folder action menu (rename / delete) — only for non-root */}
                    {nodePath !== '' && (
                        <SmallBtn label="⋯" onPress={() => onFolderAction(nodePath, name)} />
                    )}
                </View>
            </View>

            {open && sorted.map((childName) => {
                const childNode = node.children[childName];
                const childPath = nodePath
                    ? `${nodePath}/${childName}`
                    : childName;
                return (
                    <FileNode
                        key={childPath}
                        name={childName}
                        node={childNode}
                        nodePath={childPath}
                        activeFile={activeFile}
                        onSelectFile={onSelectFile}
                        depth={depth + 1}
                        onAddFile={onAddFile}
                        onAddFolder={onAddFolder}
                        onFileAction={onFileAction}
                        onFolderAction={onFolderAction}
                    />
                );
            })}
        </View>
    );
}

// ── FileExplorer ──────────────────────────────────────────────────────────────

export default function FileExplorer({
    files, folders = [], activeFile,
    onSelectFile,
    onAddFile, onAddFolder,
    onRenameFile, onDeleteFile,
    onRenameFolder, onDeleteFolder,
}) {
    const tree = buildTree(files, folders);

    // ── Add modal ──
    const [addModal, setAddModal] = useState({ visible: false, mode: 'file', folderPath: '' });
    const [addInput, setAddInput] = useState('');

    // ── File action modal (long-press file) ──
    const [fileAction, setFileAction] = useState({ visible: false, path: '', name: '' });
    const [renameFile, setRenameFile] = useState({ visible: false, path: '', current: '' });
    const [renameFileInput, setRenameFileInput] = useState('');

    // ── Folder action modal (long-press / ⋯ folder) ──
    const [folderAction, setFolderAction] = useState({ visible: false, path: '', name: '' });
    const [renameFolder, setRenameFolder] = useState({ visible: false, path: '', current: '' });
    const [renameFolderInput, setRenameFolderInput] = useState('');

    // ── ADD handlers ──────────────────────────────────────────────────────────

    function openAddFile(folderPath) {
        // folderPath is '' for root, 'src' for src/, etc.
        setAddInput('');
        setAddModal({ visible: true, mode: 'file', folderPath });
    }

    function openAddFolder(folderPath) {
        setAddInput('');
        setAddModal({ visible: true, mode: 'folder', folderPath });
    }

    function handleAddConfirm() {
        const name = addInput.trim();
        if (!name) return;
        const prefix = addModal.folderPath ? `${addModal.folderPath}/` : '';
        if (addModal.mode === 'file') {
            onAddFile(prefix + name);
        } else {
            onAddFolder(prefix + name);
        }
        setAddModal((m) => ({ ...m, visible: false }));
    }

    // ── FILE action handlers ──────────────────────────────────────────────────

    function handleFileAction(path, name) {
        setFileAction({ visible: true, path, name });
    }

    function startRenameFile() {
        setFileAction((m) => ({ ...m, visible: false }));
        setRenameFileInput(fileAction.name);
        setRenameFile({ visible: true, path: fileAction.path, current: fileAction.name });
    }

    function handleRenameFileConfirm() {
        const newName = renameFileInput.trim();
        if (!newName || newName === renameFile.current) {
            setRenameFile((m) => ({ ...m, visible: false }));
            return;
        }
        const parts = renameFile.path.split('/');
        parts[parts.length - 1] = newName;
        onRenameFile(renameFile.path, parts.join('/'));
        setRenameFile((m) => ({ ...m, visible: false }));
    }

    function handleDeleteFile() {
        setFileAction((m) => ({ ...m, visible: false }));
        Alert.alert(
            'Delete File',
            `Delete "${fileAction.name}"?\nThis cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => onDeleteFile(fileAction.path) },
            ]
        );
    }

    // ── FOLDER action handlers ────────────────────────────────────────────────

    function handleFolderAction(path, name) {
        setFolderAction({ visible: true, path, name });
    }

    function startRenameFolder() {
        setFolderAction((m) => ({ ...m, visible: false }));
        setRenameFolderInput(folderAction.name);
        setRenameFolder({ visible: true, path: folderAction.path, current: folderAction.name });
    }

    function handleRenameFolderConfirm() {
        const newName = renameFolderInput.trim();
        if (!newName || newName === renameFolder.current) {
            setRenameFolder((m) => ({ ...m, visible: false }));
            return;
        }
        // Build new path: replace last segment
        const parts = renameFolder.path.split('/');
        parts[parts.length - 1] = newName;
        const newPath = parts.join('/');
        onRenameFolder(renameFolder.path, newPath);
        setRenameFolder((m) => ({ ...m, visible: false }));
    }

    function handleDeleteFolder() {
        setFolderAction((m) => ({ ...m, visible: false }));
        Alert.alert(
            'Delete Folder',
            `Delete folder "${folderAction.name}" and all its contents?\nThis cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => onDeleteFolder(folderAction.path) },
            ]
        );
    }

    // ── render ────────────────────────────────────────────────────────────────

    const sortedRoot = sortKeys(tree.children);

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerIcon}>📁</Text>
                <Text style={styles.headerText}>FILES</Text>
                <View style={styles.headerActions}>
                    <SmallBtn label="+" onPress={() => openAddFile('')} />
                    <SmallBtn label="📁+" onPress={() => openAddFolder('')} />
                </View>
            </View>

            {/* Tree */}
            <ScrollView style={styles.list}>
                {sortedRoot.map((name) => {
                    const node = tree.children[name];
                    return (
                        <FileNode
                            key={name}
                            name={name}
                            node={node}
                            nodePath={name}
                            activeFile={activeFile}
                            onSelectFile={onSelectFile}
                            depth={0}
                            onAddFile={openAddFile}
                            onAddFolder={openAddFolder}
                            onFileAction={handleFileAction}
                            onFolderAction={handleFolderAction}
                        />
                    );
                })}
            </ScrollView>

            {/* Footer */}
            <View style={styles.footer}>
                <Text style={styles.footerText}>Long-press file to rename/delete</Text>
            </View>

            {/* ── ADD MODAL ── */}
            <Modal
                visible={addModal.visible} transparent animationType="fade"
                onRequestClose={() => setAddModal((m) => ({ ...m, visible: false }))}
            >
                <View style={styles.overlay}>
                    <View style={styles.modalBox}>
                        <Text style={styles.modalTitle}>
                            {addModal.mode === 'file' ? '📄 New File' : '📁 New Folder'}
                        </Text>
                        {addModal.folderPath !== '' && (
                            <Text style={styles.modalSub}>inside: {addModal.folderPath}/</Text>
                        )}
                        <TextInput
                            style={styles.modalInput}
                            value={addInput}
                            onChangeText={setAddInput}
                            placeholder={addModal.mode === 'file' ? 'filename.js' : 'folder-name'}
                            placeholderTextColor="#484f58"
                            autoFocus autoCapitalize="none" autoCorrect={false}
                            onSubmitEditing={handleAddConfirm}
                        />
                        <View style={styles.modalBtns}>
                            <TouchableOpacity style={styles.cancelBtn}
                                onPress={() => setAddModal((m) => ({ ...m, visible: false }))}>
                                <Text style={styles.cancelTxt}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.confirmBtn} onPress={handleAddConfirm}>
                                <Text style={styles.confirmTxt}>Create</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* ── FILE ACTION SHEET ── */}
            <Modal
                visible={fileAction.visible} transparent animationType="fade"
                onRequestClose={() => setFileAction((m) => ({ ...m, visible: false }))}
            >
                <View style={styles.overlay}>
                    <View style={styles.actionBox}>
                        <Text style={styles.actionTitle} numberOfLines={1}>
                            {fileIcon(fileAction.name)}  {fileAction.name}
                        </Text>
                        <TouchableOpacity style={styles.actionRow} onPress={startRenameFile}>
                            <Text style={styles.actionIcon}>✎</Text>
                            <Text style={styles.actionLabel}>Rename</Text>
                        </TouchableOpacity>
                        <View style={styles.actionDivider} />
                        <TouchableOpacity style={styles.actionRow} onPress={handleDeleteFile}>
                            <Text style={[styles.actionIcon, styles.redText]}>🗑</Text>
                            <Text style={[styles.actionLabel, styles.redText]}>Delete</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionCancel}
                            onPress={() => setFileAction((m) => ({ ...m, visible: false }))}>
                            <Text style={styles.cancelTxt}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* ── FILE RENAME MODAL ── */}
            <Modal
                visible={renameFile.visible} transparent animationType="fade"
                onRequestClose={() => setRenameFile((m) => ({ ...m, visible: false }))}
            >
                <View style={styles.overlay}>
                    <View style={styles.modalBox}>
                        <Text style={styles.modalTitle}>✎ Rename File</Text>
                        <TextInput
                            style={styles.modalInput}
                            value={renameFileInput}
                            onChangeText={setRenameFileInput}
                            placeholder="new-name.js"
                            placeholderTextColor="#484f58"
                            autoFocus selectTextOnFocus autoCapitalize="none" autoCorrect={false}
                            onSubmitEditing={handleRenameFileConfirm}
                        />
                        <View style={styles.modalBtns}>
                            <TouchableOpacity style={styles.cancelBtn}
                                onPress={() => setRenameFile((m) => ({ ...m, visible: false }))}>
                                <Text style={styles.cancelTxt}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.confirmBtn} onPress={handleRenameFileConfirm}>
                                <Text style={styles.confirmTxt}>Rename</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* ── FOLDER ACTION SHEET ── */}
            <Modal
                visible={folderAction.visible} transparent animationType="fade"
                onRequestClose={() => setFolderAction((m) => ({ ...m, visible: false }))}
            >
                <View style={styles.overlay}>
                    <View style={styles.actionBox}>
                        <Text style={styles.actionTitle} numberOfLines={1}>
                            📁  {folderAction.name}
                        </Text>
                        <TouchableOpacity style={styles.actionRow} onPress={startRenameFolder}>
                            <Text style={styles.actionIcon}>✎</Text>
                            <Text style={styles.actionLabel}>Rename Folder</Text>
                        </TouchableOpacity>
                        <View style={styles.actionDivider} />
                        <TouchableOpacity style={styles.actionRow} onPress={handleDeleteFolder}>
                            <Text style={[styles.actionIcon, styles.redText]}>🗑</Text>
                            <Text style={[styles.actionLabel, styles.redText]}>Delete Folder</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionCancel}
                            onPress={() => setFolderAction((m) => ({ ...m, visible: false }))}>
                            <Text style={styles.cancelTxt}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* ── FOLDER RENAME MODAL ── */}
            <Modal
                visible={renameFolder.visible} transparent animationType="fade"
                onRequestClose={() => setRenameFolder((m) => ({ ...m, visible: false }))}
            >
                <View style={styles.overlay}>
                    <View style={styles.modalBox}>
                        <Text style={styles.modalTitle}>✎ Rename Folder</Text>
                        <TextInput
                            style={styles.modalInput}
                            value={renameFolderInput}
                            onChangeText={setRenameFolderInput}
                            placeholder="folder-name"
                            placeholderTextColor="#484f58"
                            autoFocus selectTextOnFocus autoCapitalize="none" autoCorrect={false}
                            onSubmitEditing={handleRenameFolderConfirm}
                        />
                        <View style={styles.modalBtns}>
                            <TouchableOpacity style={styles.cancelBtn}
                                onPress={() => setRenameFolder((m) => ({ ...m, visible: false }))}>
                                <Text style={styles.cancelTxt}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.confirmBtn} onPress={handleRenameFolderConfirm}>
                                <Text style={styles.confirmTxt}>Rename</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

// ── styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: {
        width: 165,
        backgroundColor: '#010409',
        borderRightWidth: 1,
        borderRightColor: '#21262d',
    },
    header: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 8, paddingVertical: 8,
        borderBottomWidth: 1, borderBottomColor: '#21262d', gap: 4,
    },
    headerIcon: { fontSize: 11 },
    headerText: { fontSize: 9, fontWeight: '700', color: '#8b949e', letterSpacing: 1.2, flex: 1 },
    headerActions: { flexDirection: 'row', gap: 3 },

    smallBtn: {
        paddingHorizontal: 5, paddingVertical: 2,
        borderRadius: 4, backgroundColor: '#21262d',
    },
    smallBtnText: { color: '#58a6ff', fontSize: 9, fontWeight: '700' },

    list: { flex: 1 },

    // File row
    row: {
        flexDirection: 'row', alignItems: 'center',
        paddingVertical: 8, paddingRight: 8, gap: 6, position: 'relative',
    },
    rowActive: { backgroundColor: '#161b22' },
    activeBar: {
        position: 'absolute', left: 0, top: 0, bottom: 0,
        width: 2, backgroundColor: '#58a6ff', borderRadius: 1,
    },
    icon: { fontSize: 12 },
    label: { fontSize: 11, color: '#8b949e', flex: 1 },
    labelActive: { color: '#e6edf3', fontWeight: '600' },

    // Folder row
    folderRow: {
        flexDirection: 'row', alignItems: 'center',
        paddingVertical: 5, paddingRight: 5,
    },
    folderToggle: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
    chevron: { color: '#484f58', fontSize: 11 },
    folderIcon: { fontSize: 12 },
    folderLabel: { color: '#c9d1d9', fontSize: 11, fontWeight: '600', flex: 1 },
    folderActions: { flexDirection: 'row', gap: 2 },

    footer: { padding: 8, borderTopWidth: 1, borderTopColor: '#21262d' },
    footerText: { fontSize: 9, color: '#484f58', textAlign: 'center' },

    // Modal shared
    overlay: { flex: 1, backgroundColor: '#00000090', alignItems: 'center', justifyContent: 'center' },
    modalBox: {
        backgroundColor: '#161b22', borderRadius: 14, padding: 20,
        width: '80%', borderWidth: 1, borderColor: '#30363d',
    },
    modalTitle: { color: '#e6edf3', fontSize: 15, fontWeight: '700', marginBottom: 6 },
    modalSub: { color: '#58a6ff', fontSize: 11, marginBottom: 10 },
    modalInput: {
        backgroundColor: '#0d1117', borderWidth: 1, borderColor: '#30363d',
        borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9,
        color: '#e6edf3', fontSize: 13, marginBottom: 14,
    },
    modalBtns: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
    cancelBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 7, backgroundColor: '#21262d' },
    cancelTxt: { color: '#8b949e', fontSize: 13 },
    confirmBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 7, backgroundColor: '#238636' },
    confirmTxt: { color: '#fff', fontSize: 13, fontWeight: '600' },

    // Action sheet
    actionBox: {
        backgroundColor: '#161b22', borderRadius: 14,
        width: '75%', borderWidth: 1, borderColor: '#30363d', overflow: 'hidden',
    },
    actionTitle: {
        color: '#8b949e', fontSize: 12,
        paddingHorizontal: 18, paddingVertical: 12,
        borderBottomWidth: 1, borderBottomColor: '#21262d',
    },
    actionRow: {
        flexDirection: 'row', alignItems: 'center',
        gap: 12, paddingHorizontal: 18, paddingVertical: 14,
    },
    actionDivider: { height: 1, backgroundColor: '#21262d', marginHorizontal: 12 },
    actionIcon: { fontSize: 16, color: '#e6edf3' },
    actionLabel: { fontSize: 14, color: '#e6edf3', fontWeight: '500' },
    redText: { color: '#f85149' },
    actionCancel: {
        alignItems: 'center', paddingVertical: 13,
        borderTopWidth: 1, borderTopColor: '#21262d', marginTop: 4,
    },
});

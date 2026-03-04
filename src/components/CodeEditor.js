import React, { useRef, useCallback, useMemo, useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import {
    View, TextInput, ScrollView,
    Text, StyleSheet, Platform,
} from 'react-native';

// ─── VS Code / GitHub Dark colour palette ────────────────────────────────────
const C = {
    plain: '#c9d1d9',
    keyword: '#ff7b72',
    string: '#a5d6ff',
    number: '#79c0ff',
    comment: '#8b949e',
    tag: '#7ee787',
    component: '#ffa657',
    operator: '#79c0ff',
};

const KEYWORDS = new Set([
    'import', 'export', 'default', 'from', 'as', 'function', 'const', 'let', 'var',
    'return', 'if', 'else', 'for', 'while', 'do', 'class', 'extends', 'super', 'new',
    'this', 'typeof', 'instanceof', 'of', 'in', 'async', 'await', 'yield', 'static',
    'get', 'set', 'try', 'catch', 'finally', 'throw', 'switch', 'case', 'break',
    'continue', 'delete', 'void', 'true', 'false', 'null', 'undefined', 'NaN', 'Infinity',
    'type', 'interface', 'enum', 'implements', 'declare', 'abstract', 'override',
]);

const TOKEN_RE = new RegExp(
    [
        /\/\/[^\n]*/.source,
        /\/\*[\s\S]*?\*\//.source,
        /`(?:[^`\\]|\\.|(?:\$\{[^}]*\}))*`/.source,
        /"(?:[^"\\]|\\.)*"/.source,
        /'(?:[^'\\]|\\.)*'/.source,
        /\b0x[0-9a-fA-F]+\b/.source,
        /\b\d+\.?\d*(?:[eE][+-]?\d+)?\b/.source,
        /(?:===|!==|=>|&&|\|\||\?\.|\.{3}|[+\-*/%&|^~!<>=])/.source,
        /<\/?[A-Z][a-zA-Z0-9.]*/.source,
        /<\/?[a-z][a-zA-Z0-9]*/.source,
        /\b[A-Z][a-zA-Z0-9_]*\b/.source,
        /\b[a-z_][a-zA-Z0-9_]*(?=\s*\()/.source,
        /\b[a-z_][a-zA-Z0-9_]*\b/.source,
    ].join('|'),
    'g'
);

function tokenize(code) {
    const out = [];
    let last = 0;
    TOKEN_RE.lastIndex = 0;
    let m;
    while ((m = TOKEN_RE.exec(code)) !== null) {
        if (m.index > last) out.push({ t: code.slice(last, m.index), c: C.plain });
        const tok = m[0];
        let color = C.plain;
        if (tok.startsWith('//') || tok.startsWith('/*')) color = C.comment;
        else if (tok[0] === '"' || tok[0] === "'" || tok[0] === '`') color = C.string;
        else if (/^[0-9]/.test(tok) || tok.startsWith('0x')) color = C.number;
        else if (/^[=!<>&|?+\-*/%^~.]/.test(tok)) color = C.operator;
        else if (tok[0] === '<') {
            const nameCol = /[A-Z]/.test(tok[1] === '/' ? tok[2] : tok[1]) ? C.component : C.tag;
            out.push({ t: tok[0], c: C.plain });
            out.push({ t: tok.slice(1), c: nameCol });
            last = m.index + tok.length;
            continue;
        }
        else if (/^[A-Z]/.test(tok)) color = C.component;
        else if (KEYWORDS.has(tok)) color = C.keyword;
        out.push({ t: tok, c: color });
        last = m.index + tok.length;
    }
    if (last < code.length) out.push({ t: code.slice(last), c: C.plain });
    return out;
}

const SyntaxView = React.memo(function SyntaxView({ code, style }) {
    const tokens = useMemo(() => tokenize(code || ''), [code]);
    return (
        <Text style={style} selectable={false}>
            {tokens.map((tok, i) => (
                <Text key={i} style={{ color: tok.c }}>{tok.t}</Text>
            ))}
            {'\n'}
        </Text>
    );
});

const MONO = Platform.OS === 'ios' ? 'Courier New' : 'monospace';

// ─── Undo / Redo history ─────────────────────────────────────────────────────
// Simple text-snapshot stack; a new snapshot is pushed every DEBOUNCE ms of
// inactivity so that individual keystrokes are batched into one undo step.
const HISTORY_DEBOUNCE = 600; // ms
const MAX_HISTORY = 200;

// ─── Main CodeEditor ─────────────────────────────────────────────────────────
// Wrapped in forwardRef so the parent can call undo() / redo() via ref
const CodeEditor = forwardRef(function CodeEditor({ value, onChange }, ref) {
    const [localValue, setLocalValue] = useState(value);

    // ── History state (undo/redo) ──────────────────────────────────────────
    const history = useRef([value]);   // snapshots array
    const histIdx = useRef(0);         // current position
    const histTimer = useRef(null);    // debounce timer
    const skipHistory = useRef(false); // true during undo/redo to avoid recording

    // Track whether there's anything to undo/redo (for button disabled state)
    const [canUndo, setCanUndo] = useState(false);
    const [canRedo, setCanRedo] = useState(false);

    function refreshFlags() {
        setCanUndo(histIdx.current > 0);
        setCanRedo(histIdx.current < history.current.length - 1);
    }

    // ── Expose undo / redo to parent via ref ──────────────────────────────
    useImperativeHandle(ref, () => ({
        undo() {
            if (histIdx.current <= 0) return;
            histIdx.current -= 1;
            const snap = history.current[histIdx.current];
            skipHistory.current = true;
            setLocalValue(snap);
            onChange(snap);
            refreshFlags();
        },
        redo() {
            if (histIdx.current >= history.current.length - 1) return;
            histIdx.current += 1;
            const snap = history.current[histIdx.current];
            skipHistory.current = true;
            setLocalValue(snap);
            onChange(snap);
            refreshFlags();
        },
        canUndo: () => histIdx.current > 0,
        canRedo: () => histIdx.current < history.current.length - 1,
    }));

    // ── Sync when parent remounts the component (file switch via key=) ────
    useEffect(() => {
        setLocalValue(value);
        history.current = [value];
        histIdx.current = 0;
        setCanUndo(false);
        setCanRedo(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // intentionally once; remount handles file switch

    const parentTimer = useRef(null);

    const handleChange = useCallback((text) => {
        setLocalValue(text);

        // Record undo snapshot (debounced)
        if (!skipHistory.current) {
            clearTimeout(histTimer.current);
            histTimer.current = setTimeout(() => {
                // Truncate forward history if user typed after an undo
                history.current = history.current.slice(0, histIdx.current + 1);
                history.current.push(text);
                if (history.current.length > MAX_HISTORY) {
                    history.current.shift();
                } else {
                    histIdx.current += 1;
                }
                refreshFlags();
            }, HISTORY_DEBOUNCE);
        } else {
            skipHistory.current = false;
        }

        // Debounce parent state update
        clearTimeout(parentTimer.current);
        parentTimer.current = setTimeout(() => onChange(text), 250);
    }, [onChange]);

    const codeTextStyle = {
        fontFamily: MONO,
        fontSize: 13.5,
        lineHeight: 22,
        padding: 12,
        color: C.plain,
    };

    const lineCount = localValue.split('\n').length;

    return (
        <View style={styles.root}>
            <ScrollView
                style={styles.scroll}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator
                indicatorStyle="white"
            >
                <View style={styles.editorWrap}>
                    {/* Line-number gutter */}
                    <View style={styles.gutter}>
                        {Array.from({ length: lineCount }, (_, i) => (
                            <Text key={i} style={styles.lineNum}>{i + 1}</Text>
                        ))}
                    </View>

                    {/* Code column */}
                    <View style={styles.codeCol}>
                        <SyntaxView code={localValue} style={[codeTextStyle, styles.syntaxLayer]} />
                        <TextInput
                            value={localValue}
                            onChangeText={handleChange}
                            multiline
                            scrollEnabled={false}
                            autoCapitalize="none"
                            autoCorrect={false}
                            spellCheck={false}
                            autoComplete="off"
                            textAlignVertical="top"
                            selectionColor="#58a6ff"
                            style={[codeTextStyle, styles.inputLayer]}
                            placeholder="// Start coding…"
                            placeholderTextColor="#484f58"
                        />
                    </View>
                </View>
            </ScrollView>
        </View>
    );
});

export default CodeEditor;

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#0d1117' },
    scroll: { flex: 1 },
    editorWrap: { flexDirection: 'row', minHeight: '100%' },

    gutter: {
        width: 36,
        backgroundColor: '#010409',
        borderRightWidth: 1,
        borderRightColor: '#21262d',
        paddingTop: 12,
        paddingBottom: 12,
        alignItems: 'flex-end',
        paddingRight: 6,
    },
    lineNum: {
        color: '#484f58',
        fontSize: 13.5,
        lineHeight: 22,
        fontFamily: MONO,
    },

    codeCol: { flex: 1, position: 'relative' },
    syntaxLayer: {
        position: 'absolute',
        top: 0, left: 0, right: 0,
        minHeight: '100%',
        pointerEvents: 'none',
    },
    inputLayer: {
        color: 'transparent',
        backgroundColor: 'transparent',
        minHeight: '100%',
    },
});

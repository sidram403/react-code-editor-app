import React, { useRef, useEffect, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

const getMonacoHTML = (initialValue, language) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    html, body { width:100%; height:100%; background:#0d1117; overflow:hidden; }
    #editor { width:100%; height:100vh; }
  </style>
</head>
<body>
  <div id="editor"></div>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs/loader.min.js"></script>
  <script>
    require.config({
      paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs' }
    });

    require(['vs/editor/editor.main'], function () {
      monaco.editor.defineTheme('github-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [
          { token: 'comment', foreground: '8b949e', fontStyle: 'italic' },
          { token: 'keyword', foreground: 'ff7b72' },
          { token: 'string', foreground: 'a5d6ff' },
          { token: 'number', foreground: '79c0ff' },
          { token: 'type', foreground: 'ffa657' },
          { token: 'function', foreground: 'd2a8ff' },
        ],
        colors: {
          'editor.background': '#0d1117',
          'editor.foreground': '#c9d1d9',
          'editor.lineHighlightBackground': '#161b22',
          'editorLineNumber.foreground': '#484f58',
          'editorLineNumber.activeForeground': '#8b949e',
          'editor.selectionBackground': '#264f7840',
          'editorCursor.foreground': '#58a6ff',
        }
      });

      var editor = monaco.editor.create(document.getElementById('editor'), {
        value: ${JSON.stringify(initialValue)},
        language: '${language}',
        theme: 'github-dark',
        fontSize: 13,
        fontFamily: "monospace",
        lineNumbers: 'on',
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        wordWrap: 'on',
        padding: { top: 10, bottom: 10 },
        tabSize: 2,
        renderLineHighlight: 'gutter',
        smoothScrolling: true,
        cursorBlinking: 'smooth',
        // Mobile-friendly settings
        quickSuggestions: false,
        parameterHints: { enabled: false },
        suggestOnTriggerCharacters: false,
        acceptSuggestionOnEnter: 'off',
        tabCompletion: 'off',
        wordBasedSuggestions: false,
      });

      // Notify changes
      editor.onDidChangeModelContent(function () {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'CODE_CHANGE',
          value: editor.getValue()
        }));
      });

      // Receive value/language updates from React Native (file switching)
      window.addEventListener('message', function (e) {
        try {
          var d = JSON.parse(e.data);
          if (d.type === 'SET_VALUE') {
            if (editor.getValue() !== d.value) editor.setValue(d.value);
            if (d.language) monaco.editor.setModelLanguage(editor.getModel(), d.language);
          }
        } catch (_) {}
      });

      // Ensure editor fills layout on resize
      window.addEventListener('resize', function () { editor.layout(); });

      // Focus editor on tap so keyboard opens on mobile
      document.getElementById('editor').addEventListener('touchend', function () {
        editor.focus();
      });
    });
  </script>
</body>
</html>
`;

function getLanguage(filename) {
  if (filename.endsWith('.css')) return 'css';
  if (filename.endsWith('.json')) return 'json';
  return 'javascript';
}

export default function MonacoEditorWebView({ value, onChange, filename = 'App.js' }) {
  const webViewRef = useRef(null);
  const lastValueRef = useRef(value);
  const language = getLanguage(filename);

  useEffect(() => {
    if (value !== lastValueRef.current && webViewRef.current) {
      lastValueRef.current = value;
      webViewRef.current.postMessage(
        JSON.stringify({ type: 'SET_VALUE', value, language })
      );
    }
  }, [value, language]);

  const handleMessage = useCallback((event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'CODE_CHANGE') {
        lastValueRef.current = data.value;
        onChange && onChange(data.value);
      }
    } catch (_) { }
  }, [onChange]);

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ html: getMonacoHTML(value, language) }}
        onMessage={handleMessage}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        keyboardDisplayRequiresUserAction={false}
        style={styles.webview}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d1117' },
  webview: { flex: 1, backgroundColor: '#0d1117' },
});

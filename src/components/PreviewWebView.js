import React, { useRef, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

const PREVIEW_HTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    html,body{background:#0d1117;color:#c9d1d9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;min-height:100%}
    #root{min-height:100vh}
    #errBox{display:none;position:fixed;bottom:0;left:0;right:0;background:#3d1a1a;border-top:2px solid #f85149;padding:12px 16px;font-family:monospace;font-size:12px;color:#f85149;max-height:50%;overflow:auto;z-index:9999}
    #errBox b{display:block;margin-bottom:6px;font-size:13px}
    #idle{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;color:#484f58;text-align:center;padding:20px}
    #idle h3{font-size:18px;color:#30363d;margin-bottom:8px}
    #idle p{font-size:13px}
  </style>
</head>
<body>
  <div id="idle">
    <div style="font-size:52px;margin-bottom:16px">▶</div>
    <h3>No Preview</h3>
    <p>Press <b style="color:#3fb950">▶</b> to compile and preview your app.</p>
  </div>
  <style id="appCss"></style>
  <div id="root"></div>
  <div id="errBox"><b>⚠ Error</b><pre id="errMsg"></pre></div>

  <script src="https://unpkg.com/react@18.2.0/umd/react.development.js" crossorigin></script>
  <script src="https://unpkg.com/react-dom@18.2.0/umd/react-dom.development.js" crossorigin></script>
  <script src="https://unpkg.com/@babel/standalone@7.23.5/babel.min.js"></script>
  <script>
    var _reactRoot = null;

    // ── Console interceptor ─────────────────────────────────────
    function _sendLog(type, args) {
      var msg = args.map(function(a) {
        try { return typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a); }
        catch(e) { return String(a); }
      }).join(' ');
      try {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'CONSOLE', level: type, message: msg }));
      } catch(_) {}
    }
    var _origLog   = console.log.bind(console);
    var _origWarn  = console.warn.bind(console);
    var _origError = console.error.bind(console);
    console.log   = function() { _origLog.apply(console, arguments);   _sendLog('log',   Array.from(arguments)); };
    console.warn  = function() { _origWarn.apply(console, arguments);  _sendLog('warn',  Array.from(arguments)); };
    console.error = function() { _origError.apply(console, arguments); _sendLog('error', Array.from(arguments)); };
    window.onerror = function(msg, src, line, col, err) {
      _sendLog('error', [msg + (line ? ' (line ' + line + ')' : '')]);
    };
    // ────────────────────────────────────────────────────────────

    function showErr(msg) {
      document.getElementById('errBox').style.display = 'block';
      document.getElementById('errMsg').textContent = msg;
      _sendLog('error', [msg]);
    }
    function clearErr() { document.getElementById('errBox').style.display = 'none'; }
    function hideIdle() { var el = document.getElementById('idle'); if (el) el.style.display = 'none'; }

    function compile(files) {
      clearErr();
      hideIdle();
      try {
        // 1. Inject user CSS
        document.getElementById('appCss').textContent = files['App.css'] || '';

        // 2. Get App.js source
        var src = files['App.js'] || '';

        // 3. Strip CSS import lines  (import './App.css')
        src = src.replace(/^\\s*import\\s+['"](\\.?\\/)?App\\.css['"]\\s*;?\\s*$/mg, '');

        // 4. Strip other relative imports that can't be resolved in sandbox
        src = src.replace(/^\\s*import\\s+.*\\s+from\\s+['"]\\.\\.?\\/.+['"]\\s*;?\\s*$/mg, '');

        // 5. Auto-inject React import when missing
        //    (classic JSX runtime needs React in scope for createElement)
        if (!/(^|\\n)\\s*import\\s+React[\\s,{]/.test(src)) {
          src = 'import React from "react";\\n' + src;
        }

        // 6. Transpile with Babel
        //    - 'react'      : JSX → React.createElement
        //    - 'typescript' : strips TypeScript generics (useState<number>, etc.)
        //    - 'env'        : modern JS → CommonJS modules
        var output = Babel.transform(src, {
          presets: [
            ['react', { runtime: 'classic' }],
            ['typescript', { allExtensions: true, isTSX: true }],
            ['env', { targets: { ie: '11' }, modules: 'commonjs' }]
          ],
          filename: 'App.tsx'
        }).code;

        // 7. Set up CommonJS module environment
        var exp = { __esModule: true };
        var mod = { exports: exp };
        var req = function (id) {
          if (id === 'react' || id === 'React') return React;
          if (id === 'react-dom' || id === 'ReactDOM') return ReactDOM;
          return {};
        };

        // 8. Execute transpiled code in a sandboxed function scope
        (new Function('React', 'exports', 'module', 'require',
          '"use strict";\\n' + output
        ))(React, exp, mod, req);

        // 9. Resolve default export
        var App = exp.default || mod.exports.default || mod.exports;

        if (typeof App !== 'function') {
          showErr('No default export found.\\nMake sure App.js has:\\n  export default function App() { ... }');
          return;
        }

        // 10. Mount / re-render into #root
        var container = document.getElementById('root');
        if (!_reactRoot) { _reactRoot = ReactDOM.createRoot(container); }
        _reactRoot.render(React.createElement(App));

      } catch (e) {
        showErr(e.message + (e.stack ? '\\n\\n' + e.stack.slice(0, 500) : ''));
      }
    }

    function onMsg(e) {
      try {
        var d = JSON.parse(e.data);
        if (d.type === 'RUN') compile(d.files);
      } catch (_) {}
    }
    window.addEventListener('message', onMsg);
    document.addEventListener('message', onMsg);
  </script>
</body>
</html>
`;

export default function PreviewWebView({ onReady, onConsoleMessage }) {
  const wvRef = useRef(null);

  const run = useCallback((files) => {
    if (wvRef.current) {
      wvRef.current.postMessage(JSON.stringify({ type: 'RUN', files }));
    }
  }, []);

  React.useImperativeHandle(onReady, () => ({ run }), [run]);

  const handleMessage = useCallback((event) => {
    try {
      const d = JSON.parse(event.nativeEvent.data);
      if (d.type === 'CONSOLE' && onConsoleMessage) {
        onConsoleMessage({ type: d.level, message: d.message });
      }
    } catch (_) { }
  }, [onConsoleMessage]);

  return (
    <View style={s.wrap}>
      <WebView
        ref={wvRef}
        source={{ html: PREVIEW_HTML }}
        onMessage={handleMessage}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        style={s.wv}
      />
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#0d1117' },
  wv: { flex: 1, backgroundColor: '#0d1117' },
});

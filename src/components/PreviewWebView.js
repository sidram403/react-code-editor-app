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
    var _moduleRegistry = {};   // path → exports cache
    var _sourceRegistry = {};   // path → raw source

    // ── Console interceptor ─────────────────────────────────────────────────
    function _sendLog(type, args) {
      var msg = args.map(function(a) {
        try { return typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a); }
        catch(e) { return String(a); }
      }).join(' ');
      try { window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'CONSOLE', level: type, message: msg })); }
      catch(_) {}
    }
    var _origLog   = console.log.bind(console);
    var _origWarn  = console.warn.bind(console);
    var _origError = console.error.bind(console);
    console.log   = function() { _origLog.apply(console,arguments);   _sendLog('log',   Array.from(arguments)); };
    console.warn  = function() { _origWarn.apply(console,arguments);  _sendLog('warn',  Array.from(arguments)); };
    console.error = function() { _origError.apply(console,arguments); _sendLog('error', Array.from(arguments)); };
    window.onerror = function(msg,src,line,col,err) {
      _sendLog('error', [msg + (line ? ' (line ' + line + ')' : '')]);
    };
    // ────────────────────────────────────────────────────────────────────────

    function showErr(msg) {
      document.getElementById('errBox').style.display = 'block';
      document.getElementById('errMsg').textContent = msg;
      _sendLog('error', [msg]);
    }
    function clearErr() { document.getElementById('errBox').style.display = 'none'; }
    function hideIdle() { var el = document.getElementById('idle'); if (el) el.style.display = 'none'; }

    // ── Babel transpile helper ───────────────────────────────────────────────
    function transpile(src, filename) {
      return Babel.transform(src, {
        presets: [
          ['react', { runtime: 'classic' }],
          ['typescript', { allExtensions: true, isTSX: true }],
          ['env', { targets: { ie: '11' }, modules: 'commonjs' }]
        ],
        filename: filename || 'file.tsx'
      }).code;
    }

    // ── Build all possible lookup keys for a file path ───────────────────────
    // e.g. 'src/Button.js' → ['src/Button.js','src/Button','./src/Button.js','./src/Button', ...]
    function pathVariants(filePath) {
      var base = filePath.replace(/\\.jsx?$/, '').replace(/\\.tsx?$/, '');
      var withJs  = base + '.js';
      var withJsx = base + '.jsx';
      var dotSlash      = './' + filePath;
      var dotSlashBase  = './' + base;
      var dotSlashJs    = './' + withJs;
      var dotSlashJsx   = './' + withJsx;
      return [filePath, base, withJs, withJsx, dotSlash, dotSlashBase, dotSlashJs, dotSlashJsx];
    }

    // ── Resolve an import specifier against a calling file's directory ────────
    function resolveSpecifier(specifier, callerPath) {
      // Absolute — not relative
      if (!specifier.startsWith('.')) return specifier;

      // Compute the caller's directory
      var callerDir = '';
      var slashIdx = (callerPath || '').lastIndexOf('/');
      if (slashIdx >= 0) callerDir = callerPath.slice(0, slashIdx);

      // Join caller dir + specifier, then normalise '.' and '..'
      var raw = callerDir ? callerDir + '/' + specifier : specifier;
      var parts = raw.split('/');
      var stack = [];
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        if (p === '' || p === '.') continue;
        if (p === '..') { stack.pop(); } else { stack.push(p); }
      }
      return stack.join('/');
    }

    // ── require() implementation ─────────────────────────────────────────────
    function makeRequire(callerPath) {
      return function req(specifier) {
        // Built-in shims
        if (specifier === 'react' || specifier === 'React') return React;
        if (specifier === 'react-dom' || specifier === 'ReactDOM') return ReactDOM;

        // Resolve relative paths
        var resolved = resolveSpecifier(specifier, callerPath);

        // Check cache first
        if (_moduleRegistry[resolved]) return _moduleRegistry[resolved];

        // Try all path variants in the registry
        var variants = pathVariants(resolved);
        for (var vi = 0; vi < variants.length; vi++) {
          if (_moduleRegistry[variants[vi]]) return _moduleRegistry[variants[vi]];
        }

        // Find source in the source registry
        var src = null;
        var srcKey = null;
        for (var vj = 0; vj < variants.length; vj++) {
          if (_sourceRegistry[variants[vj]] !== undefined) {
            src = _sourceRegistry[variants[vj]];
            srcKey = variants[vj];
            break;
          }
        }

        if (src === null) {
          // Not found — return empty object (graceful degradation)
          console.warn('Module not found: ' + specifier + ' (resolved: ' + resolved + ')');
          return {};
        }

        // CSS file → inject into page, return {}
        if (srcKey.endsWith('.css')) {
          var existing = document.getElementById('css_' + srcKey.replace(/[^a-z0-9]/gi, '_'));
          if (!existing) {
            var tag = document.createElement('style');
            tag.id = 'css_' + srcKey.replace(/[^a-z0-9]/gi, '_');
            tag.textContent = src;
            document.head.appendChild(tag);
          } else {
            existing.textContent = src;
          }
          return {};
        }

        // Transpile and execute
        var exp = { __esModule: true };
        var mod = { exports: exp };
        _moduleRegistry[srcKey] = exp;   // set before exec to handle circular deps

        var code = transpile(src, srcKey);
        try {
          (new Function('React', 'exports', 'module', 'require',
            '"use strict";\\n' + code
          ))(React, exp, mod, makeRequire(srcKey));
        } catch (e) {
          delete _moduleRegistry[srcKey];
          throw new Error('Error in ' + srcKey + ': ' + e.message);
        }

        // Merge mod.exports into exp for CommonJS style exports
        if (mod.exports !== exp) {
          _moduleRegistry[srcKey] = mod.exports;
          return mod.exports;
        }
        return exp;
      };
    }

    // ── Main compile function ────────────────────────────────────────────────
    function compile(files) {
      clearErr();
      hideIdle();

      // Reset registries
      _moduleRegistry = {};
      _sourceRegistry = {};

      try {
        // 1. Register all files in the source registry
        Object.keys(files).forEach(function(path) {
          var variants = pathVariants(path);
          variants.forEach(function(v) { _sourceRegistry[v] = files[path]; });
        });

        // 2. Inject the main App CSS into the dedicated <style> tag
        document.getElementById('appCss').textContent = files['App.css'] || '';

        // 3. Get and prepare App.js
        var appSrc = files['App.js'] || '';

        // Strip bare App.css import (it's already injected above)
        appSrc = appSrc.replace(/^\\s*import\\s+['"](\\.\\/)?App\\.css['"]\\s*;?\\s*$/mg, '');

        // Auto-inject React import if missing
        if (!/(^|\\n)\\s*import\\s+React[\\s,{]/.test(appSrc)) {
          appSrc = 'import React from "react";\\n' + appSrc;
        }

        // 4. Transpile App.js
        var code = transpile(appSrc, 'App.tsx');

        // 5. Execute with our require that knows about all files
        var exp = { __esModule: true };
        var mod = { exports: exp };
        (new Function('React', 'exports', 'module', 'require',
          '"use strict";\\n' + code
        ))(React, exp, mod, makeRequire('App.js'));

        // 6. Resolve default export
        var App = exp.default || mod.exports.default || mod.exports;
        if (typeof App !== 'function') {
          showErr('No default export found.\\nMake sure App.js has:\\n  export default function App() { ... }');
          return;
        }

        // 7. Mount / re-render
        var container = document.getElementById('root');
        if (!_reactRoot) { _reactRoot = ReactDOM.createRoot(container); }
        _reactRoot.render(React.createElement(App));

      } catch(e) {
        showErr(e.message + (e.stack ? '\\n\\n' + e.stack.slice(0, 600) : ''));
      }
    }

    function onMsg(e) {
      try {
        var d = JSON.parse(e.data);
        if (d.type === 'RUN') compile(d.files);
      } catch(_) {}
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

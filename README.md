# ⚛ ReactCode — Mobile IDE for React

A fully functional **mobile code editor** built with React Native & Expo. Write React/JSX code, preview it live, manage files and folders — all on your phone.

---

## 📱 Screenshots & Demo

> Run `npx expo start` and scan the QR code with Expo Go.

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                      App.js (Entry)                     │
│        React Navigation Stack (Home → Editor)           │
└───────────────────────┬─────────────────────────────────┘
                        │
          ┌─────────────┴──────────────┐
          ▼                            ▼
  ┌───────────────┐          ┌──────────────────────────┐
  │  HomeScreen   │          │      EditorScreen         │
  │               │          │                          │
  │ • New Project │          │  ┌──────────┬─────────┐  │
  │ • Open Recent │          │  │FileExplo-│ Code    │  │
  │ • Delete Proj │          │  │rer Panel │ Editor  │  │
  └───────────────┘          │  │(sidebar) │ Panel   │  │
                             │  └──────────┴─────────┘  │
                             │  ┌──────────────────────┐ │
                             │  │   PreviewWebView      │ │
                             │  │  (Babel + React CDN)  │ │
                             │  └──────────────────────┘ │
                             │  ┌──────────────────────┐ │
                             │  │    ConsolePanel       │ │
                             │  └──────────────────────┘ │
                             └──────────────────────────┘
```

### Data Flow

```
User types code
      │
      ▼
CodeEditor (TextInput + SyntaxView)
      │  debounced 250ms
      ▼
EditorScreen.project.files  ──── AsyncStorage (on Save/Run)
      │
      ▼  (on ▶ Run)
PreviewWebView.compile(files)
      │
      ├─ _sourceRegistry  (all files registered)
      ├─ Babel.transform() per file
      ├─ makeRequire()     (multi-file imports resolved)
      └─ ReactDOM.render(App)  →  live preview in WebView
```

---

## 🗂️ Project Structure

```
react-code-editor/
├── App.js                          # Navigation root
├── app.json                        # Expo config
├── package.json
│
└── src/
    ├── screens/
    │   ├── HomeScreen.js           # Project list & create
    │   └── EditorScreen.js         # Main editor orchestrator
    │
    ├── components/
    │   ├── FileExplorer.js         # Sidebar tree view
    │   ├── CodeEditor.js           # TextInput + syntax highlight
    │   ├── PreviewWebView.js       # Babel bundler + React preview
    │   └── ConsolePanel.js         # console.log / error viewer
    │
    ├── templates/
    │   └── reactTemplate.js        # Default project files
    │
    └── utils/
        └── storage.js              # AsyncStorage CRUD
```

---

## 📦 Tech Stack

| Layer | Library | Purpose |
|---|---|---|
| Framework | **Expo 51 + React Native 0.74** | Cross-platform mobile app |
| Navigation | **React Navigation (Stack)** | Home ↔ Editor routing |
| Editor | **Custom TextInput + Regex tokeniser** | Code editing with syntax colours |
| Transpiler | **@babel/standalone 7.23** (in WebView) | JSX/TS → ES5 in the browser sandbox |
| Preview | **react-native-webview** + **React 18 CDN** | Isolated HTML runtime for user code |
| Persistence | **@react-native-async-storage/async-storage** | Local project storage on device |
| Gestures | **react-native-gesture-handler** | Smooth touch interactions |

---

## 🖥️ Component Reference

### `App.js`
Root of the app. Sets up `GestureHandlerRootView` and a React Navigation `Stack.Navigator` with two routes: `Home` and `Editor`. Dark theme applied globally.

---

### `src/screens/HomeScreen.js`
- Branding bar with app name **ReactCode**
- **New Project** hero card + floating action button — navigates to EditorScreen with a fresh template
- Horizontal feature chip row (Syntax Highlight, Babel Compile, Live Preview, etc.)
- **Recent Projects** list — loaded from AsyncStorage on screen focus
- Each project card shows name, last-edited timestamp, **Open** and 🗑 **Delete** buttons
- Fade-in animation on mount

---

### `src/screens/EditorScreen.js`
The main orchestrator. Manages all state, exposes callbacks to child components.

**State managed:**

| State | Purpose |
|---|---|
| `project` | All files, folders, name, id |
| `activeFile` | Currently open file path |
| `sidebarOpen` | Sidebar visibility |
| `showPreview` | Code vs Preview toggle |
| `dirtyFiles` | Set of unsaved file paths |
| `canUndo / canRedo` | Undo/redo button enabled state |
| `consoleLogs` | Captured console output |

**Key handlers:**

| Handler | What it does |
|---|---|
| `handleAddFile(path)` | Adds empty file, opens it, marks dirty |
| `handleAddFolder(path)` | Registers folder in `project.folders[]` |
| `handleRenameFile(old, new)` | Renames file key, updates active tab |
| `handleDeleteFile(path)` | Removes file, preserves ancestor folders |
| `handleRenameFolder(old, new)` | Renames folder + all files inside it |
| `handleDeleteFolder(path)` | Removes folder + all contained files |
| `handleRun(project)` | Closes sidebar → switches to preview → Babel compiles |
| `handleUndo / handleRedo` | Calls `editorRef.current.undo/redo()` |

**UI layout (horizontal flex):**
```
[ FileExplorer │ CodeEditor panel ]   ← Code mode
[ FileExplorer │ PreviewWebView    ]  ← Preview mode
[ ConsolePanel (always at bottom)  ]
```

---

### `src/components/FileExplorer.js`
Hierarchical sidebar tree.

- **`buildTree(files, folders)`** — converts flat `{ 'src/App.js': '...' }` + `folders[]` into a nested node tree
- **`FileNode`** — recursive component; each node knows its full `nodePath` string
- Folders: collapsible with `▾`/`▸`, sorted above files
- Each folder row has: **`+`** (add file) · **`📁+`** (add subfolder) · **`⋯`** (rename/delete folder)
- Files: **long-press** → action sheet with Rename ✎ and Delete 🗑
- All add operations show a modal with **"inside: path/"** context hint
- Buttons and sidebar only visible when `sidebarOpen === true`

---

### `src/components/CodeEditor.js`
Custom code editor — no native modules required.

**Architecture:**
```
┌─────────────────────────────────────┐
│  ScrollView (vertical scroll)       │
│  ┌────────┬───────────────────────┐ │
│  │ Gutter │ codeCol               │ │
│  │ (line  │ ┌───────────────────┐ │ │
│  │  nums) │ │ SyntaxView (Text) │ │ │  ← coloured highlight layer
│  │        │ │  (React.memo)     │ │ │
│  │        │ ├───────────────────┤ │ │
│  │        │ │ TextInput         │ │ │  ← transparent, captures input
│  │        │ └───────────────────┘ │ │
│  └────────┴───────────────────────┘ │
└─────────────────────────────────────┘
```

- **Syntax highlighting** via a single compiled regex tokeniser (keywords, strings, numbers, JSX tags, components, operators, comments)
- `SyntaxView` is wrapped in `React.memo` + `useMemo` — tokenisation only re-runs when the code changes
- **Undo/Redo** — snapshot-based history stack (debounced 600 ms, max 200 snapshots); exposed via `forwardRef` + `useImperativeHandle`
- Parent updates debounced 250 ms to avoid cascading re-renders

---

### `src/components/PreviewWebView.js`
Renders user code in a sandboxed WebView HTML page.

**Bundler pipeline (runs inside the WebView JS runtime):**
```
1. Register all project files in _sourceRegistry (all path variants)
2. Inject App.css into <style id="appCss">
3. Prepare App.js — strip bare CSS import, auto-inject React
4. Babel.transform(App.js)  →  CommonJS output
5. Execute with makeRequire('App.js'):
     import './Button'
       └─ resolveSpecifier(caller dir)
           └─ find in _sourceRegistry (tries 8 path variants)
               └─ CSS? → inject <style> tag
               └─ JS?  → Babel.transform → execute → cache → return exports
6. Extract default export (App component)
7. ReactDOM.createRoot(#root).render(<App />)
```

**Features:**
- Multi-file resolution — imports between user files work out of the box
- Circular dependency safe (module cached before execution)
- CSS imports injected as `<style>` tags
- Unknown imports return `{}` with `console.warn` (no crash)
- Error overlay shown at bottom of preview on exception
- `console.log/warn/error` forwarded to ConsolePanel via `postMessage`

---

### `src/components/ConsolePanel.js`
Collapsible panel at the bottom of the screen.

- Displays `console.log` (white), `console.warn` (amber), `console.error` + runtime errors (red)
- Logs cleared automatically on each new Run
- Slide-up/collapse animation
- Shows unread log count badge when collapsed

---

### `src/utils/storage.js`
AsyncStorage wrappers under key `@rce_projects`.

| Function | Description |
|---|---|
| `loadProjects()` | Returns array of all saved projects |
| `saveProject(project)` | Upsert by `project.id` |
| `deleteProject(id)` | Remove by id |

---

### `src/templates/reactTemplate.js`
Default files for every new project:

| File | Content |
|---|---|
| `App.js` | Counter component with useState |
| `App.css` | Dark-themed card layout |
| `index.js` | ReactDOM.createRoot entry |
| `package.json` | Minimal React dependencies |

---

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Start Expo dev server
npx expo start

# Run on Android
npx expo start --android

# Run on iOS
npx expo start --ios
```

Scan the QR code with the **Expo Go** app on your device.

---

## ✨ Features

| Feature | Details |
|---|---|
| **File/Folder Tree** | Create, rename, delete files and folders from the sidebar |
| **Multi-file Imports** | `import Button from './Button'` works in the preview |
| **Syntax Highlighting** | Keywords, strings, numbers, JSX, TypeScript, comments |
| **Undo / Redo** | ↩ ↪ buttons in the tab bar; snapshot history per file |
| **Live Preview** | Babel-compiled React output in an isolated WebView |
| **Console Panel** | Captures `console.log/warn/error` and runtime errors |
| **Auto-close Sidebar** | Sidebar closes automatically when ▶ Run is pressed |
| **Save / Run flow** | 💾 Save when dirty, ▶ Run when clean |
| **Project Persistence** | All projects saved to device storage, restored on reopen |
| **Rename Project** | Tap project name in toolbar to rename inline |

---

## 🎨 Design System

| Token | Value |
|---|---|
| Background | `#0d1117` (GitHub Dark) |
| Surface | `#161b22` |
| Border | `#21262d` / `#30363d` |
| Primary text | `#e6edf3` |
| Secondary text | `#8b949e` |
| Accent blue | `#58a6ff` / `#388bfd` |
| Success green | `#3fb950` / `#238636` |
| Error red | `#f85149` |
| Warning amber | `#d29922` |
| Monospace font | `Courier New` (iOS) / `monospace` (Android) |

---

## 🤝 Contributing

This project is **open to contributions!** Whether it's a bug fix, a new feature, a UI improvement, or better documentation — all PRs are welcome.

### How to Contribute

1. **Fork** this repository
2. Create a new branch
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. Make your changes and **commit** them
   ```bash
   git commit -m "feat: describe your change"
   ```
4. **Push** to your fork and open a **Pull Request**

### Report an Issue

Found a bug? Have a feature request? Please [open an issue](../../issues/new) with:
- A clear **title** describing the problem
- **Steps to reproduce** (for bugs)
- **Expected vs actual** behaviour
- Device / OS / Expo Go version if relevant

### Ideas for Contributions

- [ ] Monaco Editor integration (native WebView)
- [ ] TypeScript file type support in the editor
- [ ] Export / share project as a zip
- [ ] Themes (light mode, Dracula, Monokai)
- [ ] Multiple open tabs
- [ ] Search & replace within files
- [ ] Git integration (commit, diff view)

> All contributors are appreciated. Don't hesitate to reach out via an issue if you're unsure where to start! 🚀

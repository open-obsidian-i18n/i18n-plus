# Phase 4 Proposal: ItemView + Popout Window 改造

## 背景

当前 i18n-plus 的 UI 架构是自制的浮动面板（`I18nFloatingWidget`），用 `position: fixed` DOM 实现，
通过 `showView(renderFn)` 在面板内切换子视图（Manager / Editor / Metadata）。

问题是：
- **不是原生 Obsidian View** — 不继承 Obsidian 的 View 生命周期、状态管理、主题继承
- **遮挡编辑区** — 浮动面板盖在内容上面，不能像独立窗口那样放到副屏
- **子视图用闭包渲染** — 无法利用 Obsidian 的 ItemView / addChild 体系

## 目标

把词典编辑器改为 **ItemView + Popout Window**，与 Obsidian v1.9 的设置窗口风格一致。
词典管理器（插件列表、词典管理）保持浮动面板作为快速入口，但编辑器独立窗口化。

---

## 架构方案

### 新增

**`I18nPlusEditorView extends ItemView`**

```
VIEW_TYPE = "i18n-plus-editor"
Display name = "i18n+ Editor"
```

负责渲染词典编辑器的全部内容（当前 `DictionaryEditorView` + `MetadataEditorView` 的职能）。

通过 `leaf.setViewState({ state: { pluginId, locale, isBuiltin } })` 接收初始化参数。

支持多实例——用户可以同时打开多个编辑窗口（不同插件/不同 locale）。

### 改造

**`I18nFloatingWidget`** 精简为：
- 只做词典管理器的渲染（插件列表、下载、切换语言）
- "编辑"按钮改为调用 `openEditorInPopout()`
- 移除 `showView()` 通用接口（不再需要路由到 Editor）

**`showDictionaryEditor()`** (在 `main.ts` 中) 改为：

```ts
async showDictionaryEditor(pluginId, locale, isBuiltin) {
  const leaf = app.workspace.openPopoutLeaf({
    size: { width: 900, height: 700 }
  });
  await leaf.setViewState({
    type: VIEW_TYPE_I18N_EDITOR,
    active: true,
    state: { pluginId, locale, isBuiltin }
  });
}
```

### 保留

- **词典管理器** (`DictionaryManagerView`) — 继续在浮动面板内渲染
- **设置页** (`settings.ts`) — 保持设置标签页
- **浮动面板**作为快速入口，增设设置项让用户选择"面板模式：浮动 / 禁用"

---

## 改动文件清单

| 文件 | 改动 |
|------|------|
| `src/ui/i18n-editor-view.ts` | **新增** — `I18nPlusEditorView extends ItemView` |
| `src/ui/dictionary-editor-modal.ts` | **删除或大幅精简** — 渲染逻辑迁移到 ItemView |
| `src/ui/metadata-editor-view.ts` | **删除或精简** — 改为 ItemView 内嵌组件 |
| `src/ui/floating-widget.ts` | 移除 showView 路由，只保留 Manager 渲染 |
| `src/ui/dictionary-manager.ts` | 编辑按钮改为调用 `openEditorInPopout()` |
| `src/main.ts` | 注册 View、添加 `openEditorInPopout()`、Ribbon 命令 |
| `src/settings.ts` | 可选：添加"面板模式"设置（浮动/禁用） |
| `styles.css` | 移除浮动面板相关的过渡/尺寸，新增 ItemView 内联样式 |

---

## 关键技术点

### 1. 注册 View

```ts
const VIEW_TYPE_I18N_EDITOR = 'i18n-plus-editor';

this.registerView(
  VIEW_TYPE_I18N_EDITOR,
  (leaf: WorkspaceLeaf) => new I18nPlusEditorView(leaf, this)
);
```

### 2. 打开 Popout

```ts
async openEditorInPopout(pluginId: string, locale: string, isBuiltin: boolean) {
  const leaf = this.app.workspace.openPopoutLeaf({
    size: { width: 900, height: 700 }
  });
  await leaf.setViewState({
    type: VIEW_TYPE_I18N_EDITOR,
    active: true,
    state: { pluginId, locale, isBuiltin }
  });
}
```

### 3. ItemView 生命周期

```ts
class I18nPlusEditorView extends ItemView {
  constructor(leaf: WorkspaceLeaf, plugin: I18nPlusPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string { return VIEW_TYPE_I18N_EDITOR; }
  getDisplayText(): string { return `i18n+ Editor — ${this.state.locale}`; }
  getIcon(): string { return 'languages'; }

  async onOpen() {
    // render editor UI
  }

  onClose() {
    // cleanup
  }
}
```

### 4. 参数传递

通过 `getState()` / `setState()` 传递：

```ts
// 从 viewState 恢复
async onOpen() {
  const { pluginId, locale, isBuiltin } = this.leaf.getViewState().state || {};
  // ... render with these params
}

// 支持 Obsidian 的 state 持久化
getState(): Record<string, unknown> {
  return { pluginId: this.pluginId, locale: this.locale, isBuiltin: this.isBuiltin };
}

setState(state: Record<string, unknown>, result: ViewStateResult): Promise<void> {
  // restore from saved workspace state
}
```

### 5. 跨窗口兼容

- 替换 `document` → `this.app.workspace.activeDocument` 或 `this.containerEl.doc`
- 替换 `instanceof HTMLElement` → `element.instanceOf(HTMLElement)`
- 替换 `window.innerWidth` → `this.containerEl.win.innerWidth`
- 所有 DOM 操作通过 Obsidian 的 `containerEl` 作用域链

### 6. 移动端 Fallback

```ts
async openEditorInPopout(...) {
  try {
    const leaf = this.app.workspace.openPopoutLeaf({ size: { ... } });
    // ...
  } catch (e) {
    // Fallback: use right sidebar leaf
    const leaf = this.app.workspace.getRightLeaf(false);
    // ...
  }
}
```

---

## 不做的事

- ❌ 不改词典管理器为 ItemView — 保持浮动面板便于快速浏览
- ❌ 不改设置页为 Popout — 保持 PluginSettingTab
- ❌ 不改云端下载流程 — 纯 UI 层改造
- ❌ 不改翻译核心逻辑 — 只改渲染方式

---

## 风险

| 风险 | 等级 | 缓解 |
|------|------|------|
| `instanceof` 在跨窗口环境失效 | 中 | 全局搜索替换为 `.instanceOf()` |
| 全局 `document`/`window` 引用 | 中 | 逐文件审阅替换 |
| 编辑器原有事件绑定在浮动面板 DOM 上 | 中 | 迁移时注意重建事件绑定 |
| 用户已有 position/fixed 面板设置不兼容 | 低 | 保留设置值但不生效，或做迁移 |
| Popout Window 在移动端不可用 | 低 | try/catch fallback |
